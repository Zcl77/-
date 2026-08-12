from django.contrib import admin
from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import Inquiry, InquiryAttachment, Review
from projects.services import create_order_from_inquiry


@admin.action(description="批准所选评论")
def approve_reviews(modeladmin, request, queryset):
    queryset.update(status=Review.Status.APPROVED, moderated_by=request.user, moderated_at=timezone.now())


@admin.action(description="拒绝所选评论")
def reject_reviews(modeladmin, request, queryset):
    queryset.update(status=Review.Status.REJECTED, moderated_by=request.user, moderated_at=timezone.now())


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("reviewer_name", "project_name", "rating", "status", "created_at")
    list_filter = ("status", "rating", "is_dev_data")
    search_fields = ("reviewer_name", "project_name", "comment")
    actions = (approve_reviews, reject_reviews)
    readonly_fields = (
        "moderated_by",
        "moderated_at",
        "submission_fingerprint",
        "submission_bucket",
        "idempotency_key",
        "created_at",
        "updated_at",
    )

    def save_model(self, request, obj, form, change):
        if obj.status in {Review.Status.APPROVED, Review.Status.REJECTED}:
            if "status" in form.changed_data or obj.moderated_at is None:
                obj.moderated_by = request.user
                obj.moderated_at = timezone.now()
        elif obj.status == Review.Status.PENDING:
            obj.moderated_by = None
            obj.moderated_at = None
        super().save_model(request, obj, form, change)


class InquiryAttachmentInline(admin.TabularInline):
    model = InquiryAttachment
    extra = 0
    autocomplete_fields = ("media",)


@admin.action(description="为所选询价创建或复用订单")
def create_or_link_orders(modeladmin, request, queryset):
    created_count = 0
    reused_count = 0
    failed = []
    for inquiry in queryset:
        try:
            _, created = create_order_from_inquiry(inquiry)
        except ValidationError as exc:
            failed.append(f"{inquiry}: {'；'.join(exc.messages)}")
        else:
            created_count += int(created)
            reused_count += int(not created)
    if created_count:
        modeladmin.message_user(request, f"已创建 {created_count} 个订单。", level="success")
    if reused_count:
        modeladmin.message_user(request, f"{reused_count} 条询价已有关联订单，未重复创建。", level="info")
    if failed:
        modeladmin.message_user(request, "；".join(failed), level="warning")


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ("name", "project_type", "contact_type", "status", "customer", "order", "assigned_to", "created_at")
    list_filter = ("status", "contact_type", "is_dev_data")
    search_fields = ("name", "contact_value", "project_type", "description")
    autocomplete_fields = ("assigned_to", "customer", "order")
    readonly_fields = (
        "submission_fingerprint",
        "submission_bucket",
        "idempotency_key",
        "created_at",
        "updated_at",
    )
    inlines = (InquiryAttachmentInline,)
    actions = (create_or_link_orders,)
