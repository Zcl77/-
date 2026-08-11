from django.contrib import admin
from django.utils import timezone

from .models import Inquiry, InquiryAttachment, Review


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
    readonly_fields = ("created_at", "updated_at")


class InquiryAttachmentInline(admin.TabularInline):
    model = InquiryAttachment
    extra = 0
    autocomplete_fields = ("media",)


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ("name", "project_type", "contact_type", "status", "assigned_to", "created_at")
    list_filter = ("status", "contact_type", "is_dev_data")
    search_fields = ("name", "contact_value", "project_type", "description")
    autocomplete_fields = ("assigned_to",)
    readonly_fields = ("created_at", "updated_at")
    inlines = (InquiryAttachmentInline,)
