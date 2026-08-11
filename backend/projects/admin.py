from django.contrib import admin

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


class ProjectMembershipInline(admin.TabularInline):
    model = ProjectMembership
    extra = 0
    autocomplete_fields = ("user",)


class ProductionStageInline(admin.TabularInline):
    model = ProductionStage
    extra = 0
    fields = ("sort_order", "name", "status", "description", "started_at", "completed_at")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "customer", "order_type", "confirmation_status", "delivery_status", "updated_at")
    list_filter = ("confirmation_status", "deposit_status", "final_payment_status", "delivery_status", "is_dev_data")
    search_fields = ("order_number", "customer__display_name", "order_type")
    autocomplete_fields = ("customer",)
    readonly_fields = ("created_at", "updated_at")


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


admin.site.register(ProgressReceipt)
admin.site.register(ProjectMessageReceipt)
