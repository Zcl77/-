from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomerProfile, SecurityEvent, User


@admin.register(User)
class StudioUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("知行造境", {"fields": ("role", "must_change_password", "is_dev_data")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("知行造境", {"fields": ("role", "must_change_password", "is_dev_data")}),
    )
    list_display = ("username", "email", "role", "must_change_password", "is_staff", "is_active", "is_dev_data")
    list_filter = ("role", "must_change_password", "is_staff", "is_active", "is_dev_data")


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ("display_name", "user", "company", "is_active", "updated_at")
    list_filter = ("is_active", "is_dev_data")
    search_fields = ("display_name", "user__username", "phone", "wechat", "company")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    list_display = ("event", "user", "success", "created_at")
    list_filter = ("event", "success")
    readonly_fields = ("user", "event", "success", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
