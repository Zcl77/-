from django.conf import settings
from django.core.management.base import CommandError
from django.db import transaction
from django.db.models.deletion import ProtectedError


def require_development_environment():
    if not settings.DEBUG or settings.ENVIRONMENT != "development":
        raise CommandError(
            "开发数据命令仅允许在 DJANGO_DEBUG=true 且 "
            "DJANGO_ENVIRONMENT=development 时运行。"
        )


def has_development_data():
    from accounts.models import CustomerProfile, User
    from interactions.models import Inquiry, Review
    from media_library.models import MediaAsset
    from portfolio.models import Category, PublicProcessPost, StudioSetting, Work
    from projects.models import ClientProject, Order, ProgressUpdate, ProjectMessage

    querysets = (
        User.objects.filter(is_dev_data=True),
        CustomerProfile.objects.filter(is_dev_data=True),
        Category.objects.filter(is_dev_data=True),
        Work.objects.filter(is_dev_data=True),
        PublicProcessPost.objects.filter(is_dev_data=True),
        StudioSetting.objects.filter(is_dev_data=True),
        Order.objects.filter(is_dev_data=True),
        ClientProject.objects.filter(is_dev_data=True),
        ProgressUpdate.objects.filter(is_dev_data=True),
        ProjectMessage.objects.filter(is_dev_data=True),
        Review.objects.filter(is_dev_data=True),
        Inquiry.objects.filter(is_dev_data=True),
        MediaAsset.objects.filter(is_dev_data=True),
    )
    return any(queryset.exists() for queryset in querysets)


def clear_development_data():
    from accounts.models import CustomerProfile, User
    from interactions.models import Inquiry, Review
    from media_library.models import MediaAsset
    from portfolio.models import Category, PublicProcessPost, StudioSetting, Work
    from projects.models import ClientProject, Order, ProgressUpdate, ProjectMessage

    targets = (
        (Review, "评论"),
        (Inquiry, "询价"),
        (ProjectMessage, "项目留言"),
        (ProgressUpdate, "项目进度"),
        (ClientProject, "客户项目"),
        (Order, "订单"),
        (CustomerProfile, "客户资料"),
        (PublicProcessPost, "公开制作日志"),
        (Work, "公开作品"),
        (StudioSetting, "站点资料"),
        (Category, "作品分类"),
        (User, "开发账号"),
    )
    counts = {}
    try:
        with transaction.atomic():
            for model, label in targets:
                queryset = model.objects.filter(is_dev_data=True)
                counts[label] = queryset.count()
                queryset.delete()

            assets = list(MediaAsset.objects.filter(is_dev_data=True))
            counts["媒体文件"] = len(assets)
            for asset in assets:
                asset.delete()
    except ProtectedError as exc:
        raise CommandError(
            "开发数据被未标记为开发数据的记录引用，已中止清理且未删除任何记录。"
        ) from exc
    return counts
