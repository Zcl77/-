from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class StudioUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("知行造境", {"fields": ("role", "must_change_password")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("知行造境", {"fields": ("role", "must_change_password")}),
    )
    list_display = ("username", "email", "role", "must_change_password", "is_staff", "is_active")
    list_filter = ("role", "must_change_password", "is_staff", "is_active")
