import hashlib

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from common.models import UUIDTimeStampedModel
from media_library.models import MediaAsset
from portfolio.models import Work


class Review(UUIDTimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "待审核"
        APPROVED = "approved", "已批准"
        REJECTED = "rejected", "已拒绝"

    work = models.ForeignKey(Work, verbose_name="关联作品", null=True, blank=True, on_delete=models.SET_NULL, related_name="reviews")
    reviewer_name = models.CharField("评价人", max_length=80)
    project_name = models.CharField("评价对象", max_length=160)
    rating = models.PositiveSmallIntegerField("评分", validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField("评价内容", max_length=2000)
    status = models.CharField("审核状态", max_length=16, choices=Status.choices, default=Status.PENDING)
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="审核人",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="moderated_reviews",
    )
    moderated_at = models.DateTimeField("审核时间", null=True, blank=True)
    submission_fingerprint = models.CharField("防重复指纹", max_length=64, editable=False, db_index=True)
    submission_bucket = models.PositiveBigIntegerField("防重复时间段", editable=False)
    idempotency_key = models.CharField("幂等标识", max_length=64, null=True, blank=True, unique=True, editable=False)
    is_dev_data = models.BooleanField("开发测试数据", default=False)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "评价"
        verbose_name_plural = "评价"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rating__gte=1, rating__lte=5),
                name="interactions_review_rating_1_5",
            ),
            models.UniqueConstraint(
                fields=["submission_fingerprint", "submission_bucket"],
                name="interactions_review_short_dedupe",
            ),
        ]

    def __str__(self):
        return f"{self.reviewer_name}: {self.rating}/5"

    def build_submission_fingerprint(self):
        normalized = "|".join(
            [
                self.reviewer_name.strip().casefold(),
                self.project_name.strip().casefold(),
                str(self.rating),
                self.comment.strip().casefold(),
                str(self.work_id or ""),
            ]
        )
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def save(self, *args, **kwargs):
        self.submission_fingerprint = self.submission_fingerprint or self.build_submission_fingerprint()
        self.submission_bucket = self.submission_bucket or int(timezone.now().timestamp() // 600)
        super().save(*args, **kwargs)


class Inquiry(UUIDTimeStampedModel):
    class ContactType(models.TextChoices):
        PHONE = "phone", "手机号"
        WECHAT = "wechat", "微信"

    class Status(models.TextChoices):
        NEW = "new", "新询价"
        CONTACTED = "contacted", "已联系"
        CLOSED = "closed", "已关闭"
        SPAM = "spam", "垃圾信息"

    name = models.CharField("联系人姓名", max_length=80)
    contact_type = models.CharField("联系方式类型", max_length=16, choices=ContactType.choices)
    contact_value = models.CharField("联系方式", max_length=80)
    project_type = models.CharField("项目类型", max_length=100)
    scale = models.CharField("模型比例", max_length=40, blank=True)
    budget_range = models.CharField("预算范围", max_length=80, blank=True)
    expected_delivery_date = models.DateField("期望交付日期", null=True, blank=True)
    description = models.TextField("需求说明", max_length=5000)
    privacy_consent = models.BooleanField("已同意隐私说明", default=False)
    status = models.CharField("处理状态", max_length=16, choices=Status.choices, default=Status.NEW)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="负责人",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_inquiries",
    )
    customer = models.ForeignKey(
        "accounts.CustomerProfile",
        verbose_name="关联客户",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="inquiries",
    )
    order = models.OneToOneField(
        "projects.Order",
        verbose_name="关联订单",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="source_inquiry",
    )
    submission_fingerprint = models.CharField("防重复指纹", max_length=64, editable=False, db_index=True)
    submission_bucket = models.PositiveBigIntegerField("防重复时间段", editable=False)
    idempotency_key = models.CharField("幂等标识", max_length=64, null=True, blank=True, unique=True, editable=False)
    is_dev_data = models.BooleanField("开发测试数据", default=False)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "询价"
        verbose_name_plural = "询价"
        constraints = [
            models.UniqueConstraint(
                fields=["submission_fingerprint", "submission_bucket"],
                name="interactions_inquiry_short_dedupe",
            )
        ]

    def clean(self):
        if not self.privacy_consent:
            raise ValidationError({"privacy_consent": "提交询价前必须明确同意隐私说明。"})

    def __str__(self):
        return f"{self.name} / {self.project_type}"

    def build_submission_fingerprint(self):
        normalized = "|".join(
            [
                self.name.strip().casefold(),
                self.contact_type,
                self.contact_value.strip().casefold(),
                self.project_type.strip().casefold(),
                self.scale.strip().casefold(),
                self.budget_range.strip().casefold(),
                str(self.expected_delivery_date or ""),
                self.description.strip().casefold(),
            ]
        )
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def save(self, *args, **kwargs):
        self.submission_fingerprint = self.submission_fingerprint or self.build_submission_fingerprint()
        self.submission_bucket = self.submission_bucket or int(timezone.now().timestamp() // 600)
        super().save(*args, **kwargs)


class InquiryAttachment(UUIDTimeStampedModel):
    inquiry = models.ForeignKey(Inquiry, verbose_name="询价", on_delete=models.CASCADE, related_name="attachments")
    media = models.ForeignKey(MediaAsset, verbose_name="参考图片", on_delete=models.PROTECT, related_name="inquiry_attachments")
    sort_order = models.PositiveIntegerField("排序", default=0)

    class Meta:
        ordering = ["sort_order", "created_at"]
        verbose_name = "询价附件"
        verbose_name_plural = "询价附件"
        constraints = [models.UniqueConstraint(fields=["inquiry", "sort_order"], name="interactions_unique_inquiry_attachment_order")]

    def clean(self):
        if self.media_id and (
            self.media.access != MediaAsset.Access.PRIVATE
            or self.media.kind != MediaAsset.Kind.INQUIRY
        ):
            raise ValidationError({"media": "询价参考图片必须使用询价类型的私人媒体。"})
