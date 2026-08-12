from django.contrib import admin

from .models import Category, PublicProcessImage, PublicProcessPost, StudioSetting, Work, WorkImage


class WorkImageInline(admin.TabularInline):
    model = WorkImage
    extra = 0
    autocomplete_fields = ("media",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_visible", "sort_order", "updated_at")
    list_editable = ("is_visible", "sort_order")
    prepopulated_fields = {"slug": ("name",)}
    list_filter = ("is_visible", "is_dev_data")


@admin.register(Work)
class WorkAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "status", "is_featured", "sort_order", "updated_at")
    list_filter = ("status", "is_featured", "category", "is_dev_data")
    list_editable = ("is_featured", "sort_order")
    search_fields = ("title", "summary", "description")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at")
    inlines = (WorkImageInline,)


class PublicProcessImageInline(admin.TabularInline):
    model = PublicProcessImage
    extra = 0
    autocomplete_fields = ("media",)


@admin.register(PublicProcessPost)
class PublicProcessPostAdmin(admin.ModelAdmin):
    list_display = ("title", "work", "status", "published_at", "updated_at")
    list_filter = ("status", "is_dev_data")
    search_fields = ("title", "summary", "body")
    prepopulated_fields = {"slug": ("title",)}
    inlines = (PublicProcessImageInline,)


@admin.register(StudioSetting)
class StudioSettingAdmin(admin.ModelAdmin):
    list_display = ("studio_name", "phone", "wechat", "email", "updated_at", "is_dev_data")

    def has_add_permission(self, request):
        return not StudioSetting.objects.exists()
