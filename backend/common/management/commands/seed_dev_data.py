import io
import secrets
from datetime import timedelta
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from PIL import Image, ImageDraw

from accounts.models import CustomerProfile, User
from common.dev_data import (
    clear_development_data,
    has_development_data,
    require_development_environment,
)
from interactions.models import Inquiry, Review
from media_library.models import MediaAsset
from media_library.services import delete_asset_files_now
from portfolio.models import (
    Category,
    PublicProcessImage,
    PublicProcessPost,
    StudioSetting,
    Work,
    WorkImage,
)
from projects.models import (
    ClientProject,
    Order,
    ProductionStage,
    ProgressImage,
    ProgressUpdate,
    ProjectMembership,
    ProjectMessage,
)
from projects.services import ensure_project_scaffold


STAGE_NAMES = (
    "需求确认",
    "方案设计",
    "三维建模",
    "打印制作",
    "组装涂装",
    "成品验收",
    "包装交付",
)


def generated_image(name, background, accent, *, width=1600, height=1000):
    image = Image.new("RGB", (width, height), background)
    draw = ImageDraw.Draw(image)
    margin = width // 12
    draw.rectangle(
        (margin, margin, width - margin, height - margin),
        outline=accent,
        width=max(4, width // 180),
    )
    for index in range(5):
        offset = margin + index * width // 9
        draw.line((offset, height - margin, width // 2, margin), fill=accent, width=3)
    draw.rectangle(
        (width // 2, height // 3, width - margin * 2, height - margin * 2),
        fill=accent,
    )
    output = io.BytesIO()
    image.save(output, format="PNG")
    image.close()
    return SimpleUploadedFile(name, output.getvalue(), content_type="image/png")


class Command(BaseCommand):
    help = "Create clearly labelled local-only data for end-to-end development checks."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="First remove only records explicitly marked as development data.",
        )

    def handle(self, *args, **options):
        require_development_environment()
        if options["reset"]:
            clear_development_data()
        elif has_development_data():
            raise CommandError("本地开发数据已经存在；需要重建时请明确追加 --reset。")

        staff_password = secrets.token_urlsafe(20)
        customer_password = secrets.token_urlsafe(20)
        created_assets = []

        def create_asset(access, kind, filename, background, accent):
            asset = MediaAsset.objects.create(
                access=access,
                kind=kind,
                original=generated_image(filename, background, accent),
                is_dev_data=True,
            )
            created_assets.append(asset)
            return asset

        try:
            with transaction.atomic():
                staff = User.objects.create_superuser(
                    username="local_dev_staff",
                    password=staff_password,
                    role=User.Role.STAFF,
                    must_change_password=False,
                    is_dev_data=True,
                    first_name="本地开发",
                    last_name="制作者",
                )
                customer = User.objects.create_user(
                    username="local_dev_customer",
                    password=customer_password,
                    role=User.Role.CUSTOMER,
                    must_change_password=True,
                    is_dev_data=True,
                )
                profile = CustomerProfile.objects.create(
                    user=customer,
                    display_name="本地测试客户",
                    company="仅用于本地开发",
                    is_dev_data=True,
                )

                StudioSetting.objects.create(
                    key="local-development",
                    studio_name="知行造境",
                    studio_name_en="Zhixing Studio",
                    tagline="微缩建筑、场景模型与制作过程记录",
                    description="本地开发数据，用于检查正式网站的信息结构与交互流程。",
                    privacy_notice="本地测试期间请勿填写真实个人信息。",
                    is_dev_data=True,
                )
                category = Category.objects.create(
                    name="本地开发作品",
                    slug="local-development-works",
                    description="仅用于本地功能和视觉验收，不是正式发布内容。",
                    sort_order=1,
                    is_visible=True,
                    is_dev_data=True,
                )

                cover = create_asset(
                    MediaAsset.Access.PUBLIC,
                    MediaAsset.Kind.WORK,
                    "local-work-cover.png",
                    "#191b19",
                    "#b79a62",
                )
                detail = create_asset(
                    MediaAsset.Access.PUBLIC,
                    MediaAsset.Kind.WORK,
                    "local-work-detail.png",
                    "#d8d1c4",
                    "#683a27",
                )
                room = create_asset(
                    MediaAsset.Access.PUBLIC,
                    MediaAsset.Kind.WORK,
                    "local-work-room.png",
                    "#3d3a34",
                    "#d7c7a7",
                )
                work = Work.objects.create(
                    category=category,
                    title="[本地开发数据] 街巷微缩场景",
                    slug="local-development-street-scene",
                    summary="用于检查作品列表、详情、房间细节和图片灯箱。",
                    description=(
                        "这是明确标记的本地开发记录，不代表真实客户项目。"
                        "页面内容用于验证正式 REST API、媒体访问和响应式布局。"
                    ),
                    status=Work.Status.PUBLISHED,
                    is_featured=True,
                    scale="1:64",
                    dimensions="600 x 400 x 320 mm",
                    materials="木材、树脂与水性涂料（本地测试字段）",
                    period="本地功能验收阶段",
                    authors="本地开发制作者",
                    completion_percent=72,
                    is_dev_data=True,
                )
                WorkImage.objects.create(
                    work=work,
                    media=cover,
                    kind=WorkImage.Kind.COVER,
                    alt_text="本地开发作品封面占位图",
                    caption="本地开发数据",
                    sort_order=0,
                )
                WorkImage.objects.create(
                    work=work,
                    media=detail,
                    kind=WorkImage.Kind.GALLERY,
                    alt_text="本地开发作品细节占位图",
                    caption="用于检查图片切换",
                    sort_order=1,
                )
                WorkImage.objects.create(
                    work=work,
                    media=room,
                    kind=WorkImage.Kind.ROOM,
                    room_name="本地测试空间",
                    alt_text="本地开发房间占位图",
                    caption="用于检查房间详情",
                    sort_order=2,
                )

                process_media = create_asset(
                    MediaAsset.Access.PUBLIC,
                    MediaAsset.Kind.PUBLIC_PROCESS,
                    "local-process.png",
                    "#202421",
                    "#9c6b4c",
                )
                process = PublicProcessPost.objects.create(
                    work=work,
                    title="[本地开发数据] 材料与结构检查",
                    slug="local-development-material-check",
                    summary="验证公开制作日志与客户私人进度已彻底分离。",
                    body=(
                        "本条只用于本地验收。公开日志不包含客户身份、订单信息或私人图片；"
                        "正式内容将由工作室在 Django 管理后台录入。"
                    ),
                    status=PublicProcessPost.Status.PUBLISHED,
                    is_dev_data=True,
                )
                PublicProcessImage.objects.create(
                    post=process,
                    media=process_media,
                    alt_text="本地公开制作日志占位图",
                    caption="本地开发数据",
                    sort_order=0,
                )

                order = Order.objects.create(
                    order_number="DEV-LOCAL-0001",
                    customer=profile,
                    order_type="本地流程验收",
                    confirmation_status=Order.ConfirmationStatus.CONFIRMED,
                    agreed_amount=Decimal("12888.00"),
                    deposit_amount=Decimal("3888.00"),
                    final_amount=Decimal("9000.00"),
                    quoted_at=timezone.now(),
                    quote_decision=Order.QuoteDecision.ACCEPTED,
                    quote_decision_at=timezone.now(),
                    payment_status=Order.PaymentStatus.DEPOSIT_PENDING,
                    deposit_status=Order.PaymentRecordStatus.PENDING,
                    final_payment_status=Order.PaymentRecordStatus.PENDING,
                    notes="本地开发数据，不代表真实交易。",
                    is_dev_data=True,
                )
                project = ClientProject.objects.create(
                    order=order,
                    name="[本地开发数据] 客户专属微缩项目",
                    description="用于验证客户只能查看明确授权给自己的项目。",
                    status=ClientProject.Status.ACTIVE,
                    completion_percent=38,
                    next_plan="完成结构细节检查后进入打印制作。",
                    expected_next_update_at=timezone.now() + timedelta(days=4),
                    manager=staff,
                    is_dev_data=True,
                )
                ProjectMembership.objects.update_or_create(
                    project=project,
                    user=customer,
                    defaults={
                        "role": ProjectMembership.Role.OWNER,
                        "is_active": True,
                    },
                )
                ensure_project_scaffold(project.pk)
                stages = list(project.stages.order_by("sort_order"))
                for index, (stage, name) in enumerate(zip(stages, STAGE_NAMES, strict=True)):
                    status = ProductionStage.Status.PENDING
                    if index < 2:
                        status = ProductionStage.Status.COMPLETED
                    elif index == 2:
                        status = ProductionStage.Status.ACTIVE
                    stage.name = name
                    stage.status = status
                    stage.description = "本地开发阶段记录"
                    stage.started_at = timezone.now() if index <= 2 else None
                    stage.completed_at = timezone.now() if index < 2 else None
                    stage.save(
                        update_fields=[
                            "name",
                            "status",
                            "description",
                            "started_at",
                            "completed_at",
                            "updated_at",
                        ]
                    )
                project.current_stage = stages[2]
                project.save(update_fields=["current_stage", "updated_at"])

                update = ProgressUpdate.objects.create(
                    project=project,
                    stage=stages[2],
                    title="[本地开发数据] 三维结构已完成第一轮检查",
                    body="当前结构用于验证时间线、私人图片权限、查看回执与确认操作。",
                    next_plan="根据检查结果调整细节并准备打印。",
                    expected_next_update_at=timezone.now() + timedelta(days=4),
                    status=ProgressUpdate.Status.PUBLISHED,
                    requires_acknowledgement=True,
                    author=staff,
                    is_dev_data=True,
                )
                progress_media = create_asset(
                    MediaAsset.Access.PRIVATE,
                    MediaAsset.Kind.PROGRESS,
                    "local-private-progress.png",
                    "#242224",
                    "#b68767",
                )
                ProgressImage.objects.create(
                    update=update,
                    media=progress_media,
                    caption="仅授权客户可查看的本地测试图片",
                    alt_text="本地客户项目私人进度占位图",
                    sort_order=0,
                )
                ProjectMessage.objects.create(
                    project=project,
                    author=staff,
                    body="这是本地开发留言，用于检查工作室回复样式。",
                    is_dev_data=True,
                )
                ProjectMessage.objects.create(
                    project=project,
                    author=customer,
                    body="这是本地开发留言，用于检查客户消息样式。",
                    is_dev_data=True,
                )

                Review.objects.create(
                    work=work,
                    reviewer_name="本地测试评价",
                    project_name="[本地开发数据] 街巷微缩场景",
                    rating=5,
                    comment="本条明确为本地开发数据，仅用于检查审核后评论的展示。",
                    status=Review.Status.APPROVED,
                    moderated_by=staff,
                    moderated_at=timezone.now(),
                    is_dev_data=True,
                )
                Inquiry.objects.create(
                    name="本地测试询价",
                    contact_type=Inquiry.ContactType.WECHAT,
                    contact_value="local-development-only",
                    project_type="本地流程验收",
                    scale="1:64",
                    description="本条明确为本地开发数据，不包含真实联系方式。",
                    privacy_consent=True,
                    is_dev_data=True,
                )
        except Exception:
            for asset in created_assets:
                delete_asset_files_now(asset)
            raise

        self.stdout.write(self.style.SUCCESS("本地开发数据已创建，所有内容均带有开发数据标记。"))
        self.stdout.write("以下随机临时凭据仅显示一次，不会写入代码或配置：")
        self.stdout.write(f"工作室账号: local_dev_staff / {staff_password}")
        self.stdout.write(f"客户账号: local_dev_customer / {customer_password}")
        self.stdout.write("客户首次登录后必须修改临时密码，才能访问私人项目。")
