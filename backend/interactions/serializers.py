from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from common.serializers import StrictModelSerializer, StrictSerializer
from media_library.models import MediaAsset
from media_library.services import delete_asset_files_now
from portfolio.models import Work

from .models import Inquiry, InquiryAttachment, Review


class ApprovedReviewSerializer(StrictModelSerializer):
    work = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ("id", "reviewer_name", "project_name", "rating", "comment", "created_at", "is_dev_data", "work")
        read_only_fields = fields

    def get_work(self, obj):
        if not obj.work_id:
            return None
        return {"title": obj.work.title, "slug": obj.work.slug}


class ReviewSubmissionSerializer(StrictSerializer):
    reviewer_name = serializers.CharField(max_length=80, trim_whitespace=True)
    project_name = serializers.CharField(max_length=160, trim_whitespace=True)
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(max_length=2000, trim_whitespace=True)
    work_slug = serializers.SlugField(max_length=180, required=False, allow_blank=True)

    def validate(self, attrs):
        work_slug = attrs.get("work_slug")
        if work_slug:
            try:
                attrs["work"] = Work.objects.get(
                    slug=work_slug,
                    status=Work.Status.PUBLISHED,
                    category__is_visible=True,
                )
            except Work.DoesNotExist as exc:
                raise serializers.ValidationError({"work_slug": "作品不存在或尚未公开。"}) from exc
        return attrs

    def create(self, validated_data):
        validated_data.pop("work_slug", None)
        request = self.context.get("request")
        idempotency_key = (request.headers.get("Idempotency-Key", "") if request else "").strip() or None
        if idempotency_key and len(idempotency_key) > 64:
            raise serializers.ValidationError({"idempotency_key": "重复提交标识无效。"})

        candidate = Review(
            **validated_data,
            status=Review.Status.PENDING,
            is_dev_data=False,
            idempotency_key=idempotency_key,
        )
        candidate.submission_fingerprint = candidate.build_submission_fingerprint()
        candidate.submission_bucket = int(timezone.now().timestamp() // 600)
        candidate.full_clean(validate_unique=False, validate_constraints=False)

        with transaction.atomic():
            if idempotency_key:
                existing = Review.objects.filter(idempotency_key=idempotency_key).first()
                if existing:
                    self.was_duplicate = True
                    return existing
            try:
                with transaction.atomic():
                    candidate.save(force_insert=True)
            except IntegrityError:
                existing = Review.objects.filter(
                    submission_fingerprint=candidate.submission_fingerprint,
                    submission_bucket=candidate.submission_bucket,
                ).first()
                if existing is None and idempotency_key:
                    existing = Review.objects.filter(idempotency_key=idempotency_key).first()
                if existing is None:
                    raise
                self.was_duplicate = True
                return existing
        self.was_duplicate = False
        return candidate


class InquirySubmissionSerializer(StrictSerializer):
    name = serializers.CharField(max_length=80, trim_whitespace=True)
    contact_type = serializers.ChoiceField(choices=Inquiry.ContactType.choices)
    contact_value = serializers.CharField(max_length=80, trim_whitespace=True)
    project_type = serializers.CharField(max_length=100, trim_whitespace=True)
    scale = serializers.CharField(max_length=40, required=False, allow_blank=True, trim_whitespace=True)
    budget_range = serializers.CharField(max_length=80, required=False, allow_blank=True, trim_whitespace=True)
    expected_delivery_date = serializers.DateField(required=False, allow_null=True)
    description = serializers.CharField(max_length=5000, trim_whitespace=True)
    privacy_consent = serializers.BooleanField()
    attachments = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        allow_empty=True,
        max_length=5,
        write_only=True,
    )

    def validate_privacy_consent(self, value):
        if value is not True:
            raise serializers.ValidationError("提交询价前必须明确同意隐私说明。")
        return value

    def validate_expected_delivery_date(self, value):
        if value and value < timezone.localdate():
            raise serializers.ValidationError("期望交付日期不能早于今天。")
        return value

    def create(self, validated_data):
        attachments = validated_data.pop("attachments", [])
        request = self.context.get("request")
        idempotency_key = (request.headers.get("Idempotency-Key", "") if request else "").strip() or None
        if idempotency_key and len(idempotency_key) > 64:
            raise serializers.ValidationError({"idempotency_key": "重复提交标识无效。"})
        created_assets = []
        try:
            with transaction.atomic():
                inquiry = Inquiry(
                    **validated_data,
                    status=Inquiry.Status.NEW,
                    is_dev_data=False,
                    idempotency_key=idempotency_key,
                )
                inquiry.submission_fingerprint = inquiry.build_submission_fingerprint()
                inquiry.submission_bucket = int(timezone.now().timestamp() // 600)
                inquiry.full_clean(validate_unique=False, validate_constraints=False)
                existing = None
                if idempotency_key:
                    existing = Inquiry.objects.filter(idempotency_key=idempotency_key).first()
                if existing is None:
                    existing = Inquiry.objects.filter(
                        submission_fingerprint=inquiry.submission_fingerprint,
                        submission_bucket=inquiry.submission_bucket,
                    ).first()
                if existing:
                    self.was_duplicate = True
                    return existing
                try:
                    with transaction.atomic():
                        inquiry.save(force_insert=True)
                except IntegrityError:
                    existing = Inquiry.objects.filter(
                        submission_fingerprint=inquiry.submission_fingerprint,
                        submission_bucket=inquiry.submission_bucket,
                    ).first()
                    if existing is None and idempotency_key:
                        existing = Inquiry.objects.filter(idempotency_key=idempotency_key).first()
                    if existing is None:
                        raise
                    self.was_duplicate = True
                    return existing
                for index, upload in enumerate(attachments):
                    asset = MediaAsset(
                        access=MediaAsset.Access.PRIVATE,
                        kind=MediaAsset.Kind.INQUIRY,
                        original=upload,
                        is_dev_data=False,
                    )
                    asset.full_clean(exclude=["display", "thumbnail"])
                    asset.save()
                    created_assets.append(asset)
                    link = InquiryAttachment(inquiry=inquiry, media=asset, sort_order=index)
                    link.full_clean()
                    link.save()
                self.was_duplicate = False
                return inquiry
        except DjangoValidationError as exc:
            for asset in created_assets:
                delete_asset_files_now(asset)
            detail = getattr(exc, "message_dict", None) or {"attachments": list(exc.messages)}
            raise serializers.ValidationError(detail) from exc
        except Exception:
            for asset in created_assets:
                delete_asset_files_now(asset)
            raise
