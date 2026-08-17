from django.contrib import admin
from django import forms
from django.forms.models import BaseInlineFormSet
from django.utils import timezone

from .models import (
    ClientProject,
    Order,
    OrderContactAddress,
    PaymentRecord,
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


class PaymentRecordInline(admin.TabularInline):
    model = PaymentRecord
    extra = 0
    fields = (
        "payment_type",
        "channel",
        "amount",
        "currency",
        "status",
        "mock_transaction_id",
        "paid_at",
        "created_at",
    )
    readonly_fields = fields
    can_delete = False


class OrderContactAddressInline(admin.StackedInline):
    model = OrderContactAddress
    extra = 0
    max_num = 1
    fields = (
        "recipient_name",
        "email",
        "phone",
        "country_code",
        "region",
        "city",
        "address_line",
        "postal_code",
        "created_at",
        "updated_at",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "customer",
        "order_type",
        "confirmation_status",
        "checkout_status",
        "service_subtotal",
        "shipping_amount",
        "tax_amount",
        "discount_amount",
        "agreed_amount",
        "currency",
        "deposit_amount",
        "final_amount",
        "quote_decision",
        "payment_status",
        "deposit_status",
        "final_payment_status",
        "customer_projects",
        "delivery_status",
        "shipping_country",
        "updated_at",
    )
    list_filter = (
        "confirmation_status",
        "checkout_status",
        "quote_decision",
        "payment_status",
        "delivery_status",
        "currency",
        "is_dev_data",
    )
    search_fields = (
        "order_number",
        "customer__display_name",
        "order_type",
        "contact_address__recipient_name",
        "contact_address__email",
        "contact_address__country_code",
    )
    autocomplete_fields = ("customer",)
    readonly_fields = (
        "quoted_at",
        "quote_decision",
        "quote_decision_at",
        "checkout_status",
        "checkout_confirmed_at",
        "payment_status",
        "deposit_status",
        "final_payment_status",
        "created_at",
        "updated_at",
    )
    inlines = (OrderContactAddressInline, PaymentRecordInline)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("contact_address").prefetch_related("projects")

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        if obj is not None and obj.payment_records.exists():
            readonly.extend(
                (
                    "service_subtotal",
                    "shipping_amount",
                    "tax_amount",
                    "discount_amount",
                    "agreed_amount",
                    "currency",
                    "deposit_amount",
                    "final_amount",
                    "confirmation_status",
                )
            )
        return tuple(readonly)

    @admin.display(description="客户项目")
    def customer_projects(self, obj):
        return "、".join(project.name for project in obj.projects.all()) or "未关联"

    @admin.display(description="收货国家/地区", ordering="contact_address__country_code")
    def shipping_country(self, obj):
        address = getattr(obj, "contact_address", None)
        return address.country_code if address else "未填写"


@admin.register(ClientProject)
class ClientProjectAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "order",
        "order_quote_decision",
        "order_payment_status",
        "status",
        "current_stage",
        "completion_percent",
        "manager",
        "updated_at",
    )
    list_filter = ("status", "is_dev_data")
    search_fields = ("name", "order__order_number", "order__customer__display_name")
    autocomplete_fields = ("order", "manager", "current_stage")
    readonly_fields = ("created_at", "updated_at")
    inlines = (ProjectMembershipInline, ProductionStageInline)

    @admin.display(description="报价状态", ordering="order__quote_decision")
    def order_quote_decision(self, obj):
        return obj.order.get_quote_decision_display()

    @admin.display(description="付款状态", ordering="order__payment_status")
    def order_payment_status(self, obj):
        return obj.order.get_payment_status_display()


@admin.register(PaymentRecord)
class PaymentRecordAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "customer_name",
        "payment_type",
        "channel",
        "amount",
        "currency",
        "status",
        "mock_transaction_id",
        "paid_at",
    )
    list_filter = ("payment_type", "channel", "status", "currency", "paid_at", "created_at")
    search_fields = ("order__order_number", "order__customer__display_name", "mock_transaction_id")
    date_hierarchy = "created_at"
    fields = (
        "order",
        "payment_type",
        "channel",
        "amount",
        "currency",
        "status",
        "mock_transaction_id",
        "idempotency_key",
        "paid_at",
        "created_at",
        "updated_at",
        "notes",
        "metadata",
    )
    readonly_fields = (
        "order",
        "payment_type",
        "channel",
        "amount",
        "currency",
        "status",
        "mock_transaction_id",
        "idempotency_key",
        "paid_at",
        "created_at",
        "updated_at",
    )

    @admin.display(description="客户", ordering="order__customer__display_name")
    def customer_name(self, obj):
        return obj.order.customer.display_name

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


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
