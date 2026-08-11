from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from accounts.models import CustomerProfile, User
from common.models import UUIDTimeStampedModel
from media_library.models import MediaAsset


class Order(UUIDTimeStampedModel):
    class ConfirmationStatus(models.TextChoices):
        INQUIRY = "inquiry", "询价中"
        PROPOSED = "proposed", "已报价"
        CONFIRMED = "confirmed", "已确认"
        CANCELLED = "cancelled", "已取消"

    class PaymentRecordStatus(models.TextChoices):
        NOT_RECORDED = "not_recorded", "未记录"
        PENDING = "pending", "待线下确认"
        RECORDED = "recorded", "已人工记录"
        WAIVED = "waived", "无需收取"

    class DeliveryStatus(models.TextChoices):
        NOT_READY = "not_ready", "未交付"
        READY = "ready", "待交付"
        DELIVERED = "delivered", "已交付"

    order_number = models.CharField(max_length=64, unique=True)
    customer = models.ForeignKey(CustomerProfile, on_delete=models.PROTECT, related_name="orders")
    order_type = models.CharField(max_length=80)
    confirmation_status = models.CharField(
        max_length=16,
        choices=ConfirmationStatus.choices,
        default=ConfirmationStatus.INQUIRY,
    )
    agreed_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    deposit_status = models.CharField(
        max_length=16,
        choices=PaymentRecordStatus.choices,
        default=PaymentRecordStatus.NOT_RECORDED,
    )
    final_payment_status = models.CharField(
        max_length=16,
        choices=PaymentRecordStatus.choices,
        default=PaymentRecordStatus.NOT_RECORDED,
    )
    delivery_status = models.CharField(
        max_length=16,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.NOT_READY,
    )
    notes = models.TextField(blank=True, max_length=5000)
    is_dev_data = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(agreed_amount__isnull=True) | Q(agreed_amount__gte=0),
                name="projects_order_amount_nonnegative",
            )
        ]

    def __str__(self):
        return self.order_number


class ClientProject(UUIDTimeStampedModel):
    class Status(models.TextChoices):
        PLANNING = "planning", "筹备中"
        ACTIVE = "active", "制作中"
        PAUSED = "paused", "已暂停"
        REVIEW = "review", "待验收"
        COMPLETED = "completed", "已完成"
        CANCELLED = "cancelled", "已取消"

    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="projects")
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True, max_length=10000)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PLANNING)
    completion_percent = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    next_plan = models.CharField(max_length=500, blank=True)
    expected_next_update_at = models.DateTimeField(null=True, blank=True)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="managed_projects",
        limit_choices_to={"role": User.Role.STAFF},
    )
    current_stage = models.ForeignKey(
        "ProductionStage",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="current_for_projects",
    )
    is_dev_data = models.BooleanField(default=False)

    class Meta:
        ordering = ["-updated_at", "name"]
        constraints = [
            models.CheckConstraint(
                condition=Q(completion_percent__gte=0, completion_percent__lte=100),
                name="projects_client_completion_0_100",
            )
        ]

    def clean(self):
        if self.manager_id and self.manager.role != User.Role.STAFF:
            raise ValidationError({"manager": "项目负责人必须是工作室员工。"})
        if self.current_stage_id and self.current_stage.project_id != self.id:
            raise ValidationError({"current_stage": "当前阶段必须属于这个客户项目。"})

    def __str__(self):
        return self.name


class ProjectMembership(UUIDTimeStampedModel):
    class Role(models.TextChoices):
        OWNER = "owner", "主要客户"
        VIEWER = "viewer", "查看成员"

    project = models.ForeignKey(ClientProject, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_memberships")
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.VIEWER)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [models.UniqueConstraint(fields=["project", "user"], name="projects_unique_project_member")]

    def clean(self):
        if self.user_id and self.user.role != User.Role.CUSTOMER:
            raise ValidationError({"user": "项目查看成员必须是客户账号。"})

    def __str__(self):
        return f"{self.project} / {self.user}"


class ProductionStage(UUIDTimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "待开始"
        ACTIVE = "active", "进行中"
        COMPLETED = "completed", "已完成"
        SKIPPED = "skipped", "已跳过"

    project = models.ForeignKey(ClientProject, on_delete=models.CASCADE, related_name="stages")
    name = models.CharField(max_length=120)
    sort_order = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    description = models.CharField(max_length=500, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["sort_order", "created_at"]
        constraints = [models.UniqueConstraint(fields=["project", "sort_order"], name="projects_unique_stage_order")]

    def __str__(self):
        return f"{self.project} / {self.name}"


class ProgressUpdate(UUIDTimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "草稿"
        PUBLISHED = "published", "已发布"

    project = models.ForeignKey(ClientProject, on_delete=models.CASCADE, related_name="progress_updates")
    stage = models.ForeignKey(ProductionStage, null=True, blank=True, on_delete=models.SET_NULL, related_name="updates")
    title = models.CharField(max_length=180)
    body = models.TextField(max_length=12000)
    next_plan = models.CharField(max_length=500, blank=True)
    expected_next_update_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    requires_acknowledgement = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="authored_progress_updates",
        limit_choices_to={"role": User.Role.STAFF},
    )
    is_dev_data = models.BooleanField(default=False)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(status="published") | Q(published_at__isnull=False),
                name="projects_published_update_has_timestamp",
            )
        ]

    def clean(self):
        if self.stage_id and self.stage.project_id != self.project_id:
            raise ValidationError({"stage": "制作阶段必须属于同一个客户项目。"})
        if self.author_id and self.author.role != User.Role.STAFF:
            raise ValidationError({"author": "进度发布人必须是工作室员工。"})

    def save(self, *args, **kwargs):
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class ProgressImage(UUIDTimeStampedModel):
    update = models.ForeignKey(ProgressUpdate, on_delete=models.CASCADE, related_name="images")
    media = models.ForeignKey(MediaAsset, on_delete=models.PROTECT, related_name="progress_images")
    caption = models.CharField(max_length=500, blank=True)
    alt_text = models.CharField(max_length=240)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "created_at"]
        constraints = [models.UniqueConstraint(fields=["update", "sort_order"], name="projects_unique_progress_image_order")]

    def clean(self):
        if self.media_id and (
            self.media.access != MediaAsset.Access.PRIVATE
            or self.media.kind != MediaAsset.Kind.PROGRESS
        ):
            raise ValidationError({"media": "客户进度必须使用进度类型的私人媒体。"})


class ProgressReceipt(UUIDTimeStampedModel):
    update = models.ForeignKey(ProgressUpdate, on_delete=models.CASCADE, related_name="receipts")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="progress_receipts")
    viewed_at = models.DateTimeField(null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["update", "user"], name="projects_unique_progress_receipt")]

    def clean(self):
        if self.user_id and self.update_id:
            is_member = ProjectMembership.objects.filter(
                project_id=self.update.project_id,
                user_id=self.user_id,
                is_active=True,
            ).exists()
            if not is_member:
                raise ValidationError({"user": "进度回执用户必须是该项目的有效成员。"})


class ProjectMessage(UUIDTimeStampedModel):
    project = models.ForeignKey(ClientProject, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="project_messages")
    body = models.TextField(max_length=3000)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="replies")
    is_dev_data = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]

    def clean(self):
        if self.parent_id and self.parent.project_id != self.project_id:
            raise ValidationError({"parent": "回复必须属于同一个客户项目。"})
        if self.author_id and self.project_id and self.author.role != User.Role.STAFF:
            is_member = ProjectMembership.objects.filter(
                project_id=self.project_id,
                user_id=self.author_id,
                is_active=True,
            ).exists()
            if not is_member:
                raise ValidationError({"author": "留言人必须是工作室员工或该项目的有效客户成员。"})

    def __str__(self):
        return f"{self.project} / {self.author} / {self.created_at:%Y-%m-%d %H:%M}"


class ProjectMessageReceipt(UUIDTimeStampedModel):
    message = models.ForeignKey(ProjectMessage, on_delete=models.CASCADE, related_name="receipts")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="message_receipts")
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["message", "user"], name="projects_unique_message_receipt")]

    def clean(self):
        if self.user_id and self.message_id and self.user.role != User.Role.STAFF:
            is_member = ProjectMembership.objects.filter(
                project_id=self.message.project_id,
                user_id=self.user_id,
                is_active=True,
            ).exists()
            if not is_member:
                raise ValidationError({"user": "留言回执用户必须是该项目的有效成员。"})
