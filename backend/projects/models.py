import hashlib
from decimal import Decimal

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
    class Currency(models.TextChoices):
        CNY = "CNY", "人民币"
        USD = "USD", "美元"

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

    class QuoteDecision(models.TextChoices):
        NONE = "none", "尚未报价"
        PENDING = "pending", "等待客户决定"
        ACCEPTED = "accepted", "客户已接受"
        REJECTED = "rejected", "客户已拒绝"

    class PaymentStatus(models.TextChoices):
        UNPAID = "unpaid", "未付款"
        DEPOSIT_PENDING = "deposit_pending", "定金待支付"
        DEPOSIT_PAID = "deposit_paid", "定金已支付"
        FINAL_PENDING = "final_pending", "尾款待支付"
        PAID = "paid", "已付清"
        CANCELLED = "cancelled", "已取消"
        REFUNDED = "refunded", "已退款"

    order_number = models.CharField("订单编号", max_length=64, unique=True)
    customer = models.ForeignKey(CustomerProfile, verbose_name="客户", on_delete=models.PROTECT, related_name="orders")
    order_type = models.CharField("订单类型", max_length=80)
    confirmation_status = models.CharField(
        "报价确认状态",
        max_length=16,
        choices=ConfirmationStatus.choices,
        default=ConfirmationStatus.INQUIRY,
    )
    agreed_amount = models.DecimalField("订单金额（报价）", max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField("币种", max_length=3, choices=Currency.choices, default=Currency.CNY)
    deposit_amount = models.DecimalField("定金金额", max_digits=12, decimal_places=2, default=0)
    final_amount = models.DecimalField("尾款金额", max_digits=12, decimal_places=2, default=0)
    quoted_at = models.DateTimeField("报价时间", null=True, blank=True)
    quote_valid_until = models.DateTimeField("报价有效期", null=True, blank=True)
    quote_decision = models.CharField(
        "客户报价决定",
        max_length=16,
        choices=QuoteDecision.choices,
        default=QuoteDecision.NONE,
    )
    quote_decision_at = models.DateTimeField("客户决定时间", null=True, blank=True)
    payment_status = models.CharField(
        "付款状态",
        max_length=24,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
    )
    deposit_status = models.CharField(
        "定金状态",
        max_length=16,
        choices=PaymentRecordStatus.choices,
        default=PaymentRecordStatus.NOT_RECORDED,
    )
    final_payment_status = models.CharField(
        "尾款状态",
        max_length=16,
        choices=PaymentRecordStatus.choices,
        default=PaymentRecordStatus.NOT_RECORDED,
    )
    delivery_status = models.CharField(
        "交付状态",
        max_length=16,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.NOT_READY,
    )
    notes = models.TextField("内部备注", blank=True, max_length=5000)
    is_dev_data = models.BooleanField("开发测试数据", default=False)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "订单"
        verbose_name_plural = "订单"
        constraints = [
            models.CheckConstraint(
                condition=Q(agreed_amount__isnull=True) | Q(agreed_amount__gte=0),
                name="projects_order_amount_nonnegative",
            ),
            models.CheckConstraint(condition=Q(deposit_amount__gte=0), name="projects_order_deposit_nonnegative"),
            models.CheckConstraint(condition=Q(final_amount__gte=0), name="projects_order_final_nonnegative"),
            models.CheckConstraint(
                condition=Q(currency__in=("CNY", "USD")),
                name="projects_order_currency_iso_supported",
            ),
            models.CheckConstraint(
                condition=(
                    Q(agreed_amount__isnull=True, deposit_amount=0, final_amount=0)
                    | Q(agreed_amount=models.F("deposit_amount") + models.F("final_amount"))
                ),
                name="projects_order_amounts_match_total",
            ),
        ]

    def _prepare_amounts(self):
        if self.agreed_amount is None:
            return set()
        agreed_amount = Decimal(str(self.agreed_amount))
        deposit_amount = Decimal(str(self.deposit_amount))
        final_amount = Decimal(str(self.final_amount))
        self.agreed_amount = agreed_amount
        self.deposit_amount = deposit_amount
        self.final_amount = final_amount
        if final_amount == 0 and deposit_amount <= agreed_amount:
            self.final_amount = agreed_amount - deposit_amount
            return {"final_amount"}
        if not self.pk or self._state.adding:
            return set()
        previous = type(self).objects.filter(pk=self.pk).values(
            "agreed_amount", "deposit_amount", "final_amount"
        ).first()
        if (
            previous
            and previous["agreed_amount"] != self.agreed_amount
            and previous["deposit_amount"] == self.deposit_amount
            and previous["final_amount"] == self.final_amount
            and previous["agreed_amount"] is not None
            and previous["deposit_amount"] + previous["final_amount"] == previous["agreed_amount"]
        ):
            self.final_amount = self.agreed_amount - self.deposit_amount
            return {"final_amount"}
        return set()

    def _prepare_quote_state(self):
        if self.confirmation_status != self.ConfirmationStatus.PROPOSED:
            return set()
        previous = None
        if self.pk and not self._state.adding:
            previous = type(self).objects.filter(pk=self.pk).values("confirmation_status", "agreed_amount").first()
        quote_changed = (
            previous is None
            or previous["confirmation_status"] != self.ConfirmationStatus.PROPOSED
            or previous["agreed_amount"] != self.agreed_amount
        )
        if quote_changed or self.quoted_at is None:
            self.quoted_at = timezone.now()
        self.quote_decision = self.QuoteDecision.PENDING
        self.quote_decision_at = None
        return {"quoted_at", "quote_decision", "quote_decision_at"}

    def clean(self):
        self._prepare_amounts()
        if self.agreed_amount is None and (self.deposit_amount or self.final_amount):
            raise ValidationError({"agreed_amount": "填写定金或尾款前必须先填写订单金额。"})
        if self.agreed_amount is not None and self.deposit_amount + self.final_amount != self.agreed_amount:
            raise ValidationError({"final_amount": "定金金额与尾款金额之和必须等于订单金额。"})
        if self.confirmation_status in {
            self.ConfirmationStatus.PROPOSED,
            self.ConfirmationStatus.CONFIRMED,
        } and (self.agreed_amount is None or self.agreed_amount <= 0):
            raise ValidationError({"agreed_amount": "已报价或已确认的订单必须填写大于 0 的报价金额。"})
        self._prepare_quote_state()

    def save(self, *args, **kwargs):
        derived_fields = self._prepare_amounts() | self._prepare_quote_state()
        if kwargs.get("update_fields") is not None:
            kwargs["update_fields"] = set(kwargs["update_fields"]) | derived_fields
        super().save(*args, **kwargs)

    def __str__(self):
        return self.order_number

    def is_mock_payment_eligible_for(self, user):
        return (
            self.is_dev_data
            and self.customer.is_dev_data
            and self.customer.user_id == user.pk
            and user.is_dev_data
        )


class PaymentRecord(UUIDTimeStampedModel):
    class PaymentType(models.TextChoices):
        DEPOSIT = "deposit", "定金"
        FINAL = "final", "尾款"
        REFUND = "refund", "退款"

    class Channel(models.TextChoices):
        MOCK = "mock", "本地模拟"

    class Status(models.TextChoices):
        PENDING = "pending", "待支付"
        SUCCEEDED = "succeeded", "成功"
        FAILED = "failed", "失败"
        REFUNDED = "refunded", "已退款"

    order = models.ForeignKey(Order, verbose_name="订单", on_delete=models.PROTECT, related_name="payment_records")
    payment_type = models.CharField("付款类型", max_length=16, choices=PaymentType.choices)
    channel = models.CharField("支付渠道", max_length=16, choices=Channel.choices, default=Channel.MOCK)
    amount = models.DecimalField("金额", max_digits=12, decimal_places=2)
    currency = models.CharField("币种", max_length=3, choices=Order.Currency.choices, default=Order.Currency.CNY)
    status = models.CharField("状态", max_length=16, choices=Status.choices, default=Status.PENDING)
    mock_transaction_id = models.CharField("模拟交易号", max_length=64, null=True, blank=True, unique=True)
    idempotency_key = models.CharField("幂等标识", max_length=160, null=True, blank=True, unique=True, editable=False)
    paid_at = models.DateTimeField("支付时间", null=True, blank=True)
    notes = models.CharField("备注", max_length=1000, blank=True)
    metadata = models.JSONField("元数据", default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "付款记录"
        verbose_name_plural = "付款记录"
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="projects_payment_amount_positive"),
            models.CheckConstraint(
                condition=Q(currency__in=("CNY", "USD")),
                name="projects_payment_currency_iso_supported",
            ),
        ]

    def clean(self):
        if self.amount is None or self.amount <= 0:
            raise ValidationError({"amount": "付款记录金额必须大于 0。"})
        if self.channel != self.Channel.MOCK:
            raise ValidationError({"channel": "当前阶段只允许本地模拟支付。"})
        if self.order_id and self.currency != self.order.currency:
            raise ValidationError({"currency": "付款记录币种必须与订单币种一致。"})

    def save(self, *args, **kwargs):
        if self.status == self.Status.SUCCEEDED and self.paid_at is None:
            self.paid_at = timezone.now()
            if kwargs.get("update_fields") is not None:
                kwargs["update_fields"] = set(kwargs["update_fields"]) | {"paid_at"}
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order} / {self.get_payment_type_display()} / {self.amount} {self.order.currency}"


class ClientProject(UUIDTimeStampedModel):
    class Status(models.TextChoices):
        PLANNING = "planning", "筹备中"
        ACTIVE = "active", "制作中"
        PAUSED = "paused", "已暂停"
        REVIEW = "review", "待验收"
        COMPLETED = "completed", "已完成"
        CANCELLED = "cancelled", "已取消"

    order = models.ForeignKey(Order, verbose_name="订单", on_delete=models.PROTECT, related_name="projects")
    name = models.CharField("项目名称", max_length=180)
    description = models.TextField("项目说明", blank=True, max_length=10000)
    status = models.CharField("项目状态", max_length=16, choices=Status.choices, default=Status.PLANNING)
    completion_percent = models.PositiveSmallIntegerField(
        "完成百分比",
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    next_plan = models.CharField("下一步计划", max_length=500, blank=True)
    expected_next_update_at = models.DateTimeField("预计下次更新时间", null=True, blank=True)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="项目负责人",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="managed_projects",
        limit_choices_to={"role": User.Role.STAFF},
    )
    current_stage = models.ForeignKey(
        "ProductionStage",
        verbose_name="当前制作阶段",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="current_for_projects",
    )
    is_dev_data = models.BooleanField("开发测试数据", default=False)

    class Meta:
        ordering = ["-updated_at", "name"]
        verbose_name = "客户项目"
        verbose_name_plural = "客户项目"
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

    project = models.ForeignKey(ClientProject, verbose_name="客户项目", on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name="客户账号", on_delete=models.CASCADE, related_name="project_memberships")
    role = models.CharField("成员角色", max_length=16, choices=Role.choices, default=Role.VIEWER)
    is_active = models.BooleanField("允许访问", default=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "项目成员"
        verbose_name_plural = "项目成员"
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

    project = models.ForeignKey(ClientProject, verbose_name="客户项目", on_delete=models.CASCADE, related_name="stages")
    name = models.CharField("阶段名称", max_length=120)
    sort_order = models.PositiveIntegerField("排序", default=0)
    status = models.CharField("阶段状态", max_length=16, choices=Status.choices, default=Status.PENDING)
    description = models.CharField("阶段说明", max_length=500, blank=True)
    started_at = models.DateTimeField("开始时间", null=True, blank=True)
    completed_at = models.DateTimeField("完成时间", null=True, blank=True)

    class Meta:
        ordering = ["sort_order", "created_at"]
        verbose_name = "制作阶段"
        verbose_name_plural = "制作阶段"
        constraints = [models.UniqueConstraint(fields=["project", "sort_order"], name="projects_unique_stage_order")]

    def __str__(self):
        return f"{self.project} / {self.name}"


class ProgressUpdate(UUIDTimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "草稿"
        PUBLISHED = "published", "已发布"

    project = models.ForeignKey(ClientProject, verbose_name="客户项目", on_delete=models.CASCADE, related_name="progress_updates")
    stage = models.ForeignKey(ProductionStage, verbose_name="制作阶段", null=True, blank=True, on_delete=models.SET_NULL, related_name="updates")
    title = models.CharField("进度标题", max_length=180)
    body = models.TextField("进度内容", max_length=12000)
    next_plan = models.CharField("下一步计划", max_length=500, blank=True)
    expected_next_update_at = models.DateTimeField("预计下次更新时间", null=True, blank=True)
    status = models.CharField("发布状态", max_length=16, choices=Status.choices, default=Status.DRAFT)
    requires_acknowledgement = models.BooleanField("需要客户确认", default=False)
    published_at = models.DateTimeField("发布时间", null=True, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="发布人",
        on_delete=models.PROTECT,
        related_name="authored_progress_updates",
        limit_choices_to={"role": User.Role.STAFF},
    )
    is_dev_data = models.BooleanField("开发测试数据", default=False)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        verbose_name = "进度更新"
        verbose_name_plural = "进度更新"
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
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()

    def save(self, *args, **kwargs):
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
            if kwargs.get("update_fields") is not None:
                kwargs["update_fields"] = set(kwargs["update_fields"]) | {"published_at"}
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class ProgressImage(UUIDTimeStampedModel):
    update = models.ForeignKey(ProgressUpdate, verbose_name="进度更新", on_delete=models.CASCADE, related_name="images")
    media = models.ForeignKey(MediaAsset, verbose_name="媒体文件", on_delete=models.PROTECT, related_name="progress_images")
    caption = models.CharField("图片说明", max_length=500, blank=True)
    alt_text = models.CharField("替代文字", max_length=240)
    sort_order = models.PositiveIntegerField("排序", default=0)

    class Meta:
        ordering = ["sort_order", "created_at"]
        verbose_name = "进度图片"
        verbose_name_plural = "进度图片"
        constraints = [models.UniqueConstraint(fields=["update", "sort_order"], name="projects_unique_progress_image_order")]

    def clean(self):
        if self.media_id and (
            self.media.access != MediaAsset.Access.PRIVATE
            or self.media.kind != MediaAsset.Kind.PROGRESS
        ):
            raise ValidationError({"media": "客户进度必须使用进度类型的私人媒体。"})


class ProgressReceipt(UUIDTimeStampedModel):
    update = models.ForeignKey(ProgressUpdate, verbose_name="进度更新", on_delete=models.CASCADE, related_name="receipts")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name="客户账号", on_delete=models.CASCADE, related_name="progress_receipts")
    viewed_at = models.DateTimeField("查看时间", null=True, blank=True)
    acknowledged_at = models.DateTimeField("确认时间", null=True, blank=True)

    class Meta:
        verbose_name = "进度确认记录"
        verbose_name_plural = "进度确认记录"
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

    def __str__(self):
        state = "已确认" if self.acknowledged_at else "已查看" if self.viewed_at else "未查看"
        return f"{self.update.project} / {self.user} / {self.update.title} / {state}"


class ProjectMessage(UUIDTimeStampedModel):
    project = models.ForeignKey(ClientProject, verbose_name="客户项目", on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name="留言人", on_delete=models.PROTECT, related_name="project_messages")
    body = models.TextField("留言内容", max_length=3000)
    parent = models.ForeignKey("self", verbose_name="回复的留言", null=True, blank=True, on_delete=models.SET_NULL, related_name="replies")
    idempotency_key = models.CharField("幂等标识", max_length=64, null=True, blank=True, unique=True, editable=False)
    submission_fingerprint = models.CharField("防重复指纹", max_length=64, editable=False, db_index=True)
    submission_bucket = models.PositiveBigIntegerField("防重复时间段", editable=False)
    is_dev_data = models.BooleanField("开发测试数据", default=False)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "项目留言"
        verbose_name_plural = "项目留言"
        constraints = [
            models.UniqueConstraint(
                fields=["submission_fingerprint", "submission_bucket"],
                name="projects_message_short_dedupe",
            )
        ]

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

    def build_submission_fingerprint(self):
        normalized = "|".join(
            [str(self.project_id), str(self.author_id), str(self.parent_id or ""), self.body.strip().casefold()]
        )
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def save(self, *args, **kwargs):
        self.submission_fingerprint = self.submission_fingerprint or self.build_submission_fingerprint()
        self.submission_bucket = self.submission_bucket or int(timezone.now().timestamp() // 60)
        super().save(*args, **kwargs)


class ProjectMessageReceipt(UUIDTimeStampedModel):
    message = models.ForeignKey(ProjectMessage, verbose_name="项目留言", on_delete=models.CASCADE, related_name="receipts")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name="查看账号", on_delete=models.CASCADE, related_name="message_receipts")
    read_at = models.DateTimeField("阅读时间", null=True, blank=True)

    class Meta:
        verbose_name = "留言阅读记录"
        verbose_name_plural = "留言阅读记录"
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

    def __str__(self):
        state = "已读" if self.read_at else "未读"
        return f"{self.message.project} / {self.user} / {state}"
