from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from common.models import UUIDTimeStampedModel
from media_library.models import MediaAsset
from portfolio.models import Work


class Review(UUIDTimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "待审核"
        APPROVED = "approved", "已批准"
        REJECTED = "rejected", "已拒绝"

    work = models.ForeignKey(Work, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviews")
    reviewer_name = models.CharField(max_length=80)
    project_name = models.CharField(max_length=160)
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(max_length=2000)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="moderated_reviews",
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    is_dev_data = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rating__gte=1, rating__lte=5),
                name="interactions_review_rating_1_5",
            )
        ]

    def __str__(self):
        return f"{self.reviewer_name}: {self.rating}/5"


class Inquiry(UUIDTimeStampedModel):
    class ContactType(models.TextChoices):
        PHONE = "phone", "手机号"
        WECHAT = "wechat", "微信"

    class Status(models.TextChoices):
        NEW = "new", "新询价"
        CONTACTED = "contacted", "已联系"
        CLOSED = "closed", "已关闭"
        SPAM = "spam", "垃圾信息"

    name = models.CharField(max_length=80)
    contact_type = models.CharField(max_length=16, choices=ContactType.choices)
    contact_value = models.CharField(max_length=80)
    project_type = models.CharField(max_length=100)
    scale = models.CharField(max_length=40, blank=True)
    budget_range = models.CharField(max_length=80, blank=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    description = models.TextField(max_length=5000)
    privacy_consent = models.BooleanField(default=False)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEW)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_inquiries",
    )
    is_dev_data = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        if not self.privacy_consent:
            raise ValidationError({"privacy_consent": "提交询价前必须明确同意隐私说明。"})

    def __str__(self):
        return f"{self.name} / {self.project_type}"


class InquiryAttachment(UUIDTimeStampedModel):
    inquiry = models.ForeignKey(Inquiry, on_delete=models.CASCADE, related_name="attachments")
    media = models.ForeignKey(MediaAsset, on_delete=models.PROTECT, related_name="inquiry_attachments")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "created_at"]
        constraints = [models.UniqueConstraint(fields=["inquiry", "sort_order"], name="interactions_unique_inquiry_attachment_order")]

    def clean(self):
        if self.media_id and (
            self.media.access != MediaAsset.Access.PRIVATE
            or self.media.kind != MediaAsset.Kind.INQUIRY
        ):
            raise ValidationError({"media": "询价参考图片必须使用询价类型的私人媒体。"})
