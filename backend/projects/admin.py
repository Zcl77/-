from django.contrib import admin
from django import forms
from django.forms.models import BaseInlineFormSet
from django.utils import timezone

from .models import (
    ClientProject,
    Order,
    ProductionStage,
    ProgressImage,
    ProgressReceipt,
    ProgressUpdate,
    ProjectMembership,
    ProjectMessage,
    ProjectMessageReceipt,
)


class ProjectMembershipInlineFormSet(BaseInlineFormSet):
    def clean(self):
        seen_users = set()
        for form in self.forms:
            if not hasattr(form, "cleaned_data") or form.cleaned_data.get("DELETE"):
                continue
            user = form.cleaned_data.get("user")
            if user is None:
                continue
            if user.pk in seen_users:
                form.add_error("user", "同一客户不能重复添加为项目成员。")
            seen_users.add(user.pk)
        super().clean()


class ProgressUpdateAdminForm(forms.ModelForm):
    class Meta:
        model = ProgressUpdate
        fields = "__all__"

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("status") == ProgressUpdate.Status.PUBLISHED and not cleaned.get("published_at"):
            cleaned["published_at"] = timezone.now()
            self.instance.published_at = cleaned["published_at"]
        return cleaned


class ProjectMembershipInline(admin.TabularInline):
    model = ProjectMembership
    formset = ProjectMembershipInlineFormSet
    extra = 0
    autocomplete_fields = ("user",)


class ProductionStageInline(admin.TabularInline):
    model = ProductionStage
    extra = 0
    fields = ("sort_order", "name", "status", "description", "started_at", "completed_at")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "customer",
        "order_type",
        "confirmation_status",
        "agreed_amount",
        "quote_decision",
        "delivery_status",
        "updated_at",
    )
    list_filter = ("confirmation_status", "deposit_status", "final_payment_status", "delivery_status", "is_dev_data")
    search_fields = ("order_number", "customer__display_name", "order_type")
    autocomplete_fields = ("customer",)
    readonly_fields = ("quoted_at", "quote_decision", "quote_decision_at", "created_at", "updated_at")


@admin.register(ClientProject)
class ClientProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "order", "status", "current_stage", "completion_percent", "manager", "updated_at")
    list_filter = ("status", "is_dev_data")
    search_fields = ("name", "order__order_number", "order__customer__display_name")
    autocomplete_fields = ("order", "manager", "current_stage")
    readonly_fields = ("created_at", "updated_at")
    inlines = (ProjectMembershipInline, ProductionStageInline)


class ProgressImageInline(admin.TabularInline):
    model = ProgressImage
    extra = 0
    autocomplete_fields = ("media",)


@admin.register(ProgressUpdate)
class ProgressUpdateAdmin(admin.ModelAdmin):
    form = ProgressUpdateAdminForm
    list_display = ("title", "project", "stage", "status", "requires_acknowledgement", "published_at")
    list_filter = ("status", "requires_acknowledgement", "is_dev_data")
    search_fields = ("title", "body", "project__name")
    autocomplete_fields = ("project", "stage", "author")
    readonly_fields = ("created_at", "updated_at")
    inlines = (ProgressImageInline,)


@admin.register(ProductionStage)
class ProductionStageAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "sort_order", "status", "updated_at")
    list_filter = ("status",)
    search_fields = ("name", "project__name")
    autocomplete_fields = ("project",)


@admin.register(ProjectMessage)
class ProjectMessageAdmin(admin.ModelAdmin):
    list_display = ("project", "author", "created_at")
    search_fields = ("project__name", "author__username", "body")
    autocomplete_fields = ("project", "author", "parent")
    readonly_fields = ("created_at", "updated_at")


@admin.register(ProgressReceipt)
class ProgressReceiptAdmin(admin.ModelAdmin):
    list_display = ("project_name", "user", "update", "viewed_at", "acknowledged_at")
    list_filter = ("viewed_at", "acknowledged_at")
    search_fields = ("update__project__name", "update__title", "user__username")
    autocomplete_fields = ("update", "user")
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="客户项目", ordering="update__project__name")
    def project_name(self, obj):
        return obj.update.project.name


@admin.register(ProjectMessageReceipt)
class ProjectMessageReceiptAdmin(admin.ModelAdmin):
    list_display = ("project_name", "user", "message", "read_at")
    search_fields = ("message__project__name", "message__body", "user__username")
    autocomplete_fields = ("message", "user")
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="客户项目", ordering="message__project__name")
    def project_name(self, obj):
        return obj.message.project.name
