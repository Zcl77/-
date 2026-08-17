from django.contrib import admin

from .models import Category, PublicProcessImage, PublicProcessPost, StudioSetting, Work, WorkImage


class WorkImageInline(admin.TabularInline):
    model = WorkImage
    extra = 0
    autocomplete_fields = ("media",)
    fields = ("media", "kind", "alt_text", "alt_text_en", "caption", "caption_en", "room_name", "room_name_en", "sort_order")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_visible", "sort_order", "updated_at")
    list_editable = ("is_visible", "sort_order")
    prepopulated_fields = {"slug": ("name",)}
    list_filter = ("is_visible", "is_dev_data")
    search_fields = ("name", "name_en", "description", "description_en")
    fieldsets = (
        ("中文内容", {"fields": ("name", "description")}),
        ("English", {"fields": ("name_en", "description_en")}),
        ("发布设置", {"fields": ("slug", "sort_order", "is_visible", "is_dev_data")}),
    )


@admin.register(Work)
class WorkAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "status", "is_featured", "sort_order", "updated_at")
    list_filter = ("status", "is_featured", "category", "is_dev_data")
    list_editable = ("is_featured", "sort_order")
    search_fields = ("title", "title_en", "summary", "summary_en", "description", "description_en")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at")
    inlines = (WorkImageInline,)
    fieldsets = (
        ("中文内容", {"fields": ("title", "summary", "description", "scale", "dimensions", "materials", "period", "authors")}),
        ("English", {"fields": ("title_en", "summary_en", "description_en", "scale_en", "dimensions_en", "materials_en", "period_en", "authors_en")}),
        ("发布设置", {"fields": ("category", "slug", "status", "is_featured", "sort_order", "completion_percent", "published_at", "is_dev_data")}),
        ("审计", {"fields": ("created_at", "updated_at")}),
    )


class PublicProcessImageInline(admin.TabularInline):
    model = PublicProcessImage
    extra = 0
    autocomplete_fields = ("media",)
    fields = ("media", "alt_text", "alt_text_en", "caption", "caption_en", "sort_order")


@admin.register(PublicProcessPost)
class PublicProcessPostAdmin(admin.ModelAdmin):
    list_display = ("title", "work", "status", "published_at", "updated_at")
    list_filter = ("status", "is_dev_data")
    search_fields = ("title", "title_en", "summary", "summary_en", "body", "body_en")
    prepopulated_fields = {"slug": ("title",)}
    inlines = (PublicProcessImageInline,)
    fieldsets = (
        ("中文内容", {"fields": ("title", "summary", "body")}),
        ("English", {"fields": ("title_en", "summary_en", "body_en")}),
        ("发布设置", {"fields": ("work", "slug", "status", "published_at", "is_dev_data")}),
    )


@admin.register(StudioSetting)
class StudioSettingAdmin(admin.ModelAdmin):
    list_display = ("studio_name", "phone", "wechat", "email", "updated_at", "is_dev_data")
    fieldsets = (
        ("中文内容", {"fields": ("studio_name", "tagline", "description", "privacy_notice")}),
        ("English", {"fields": ("studio_name_en", "tagline_en", "description_en", "privacy_notice_en")}),
        ("联系信息", {"fields": ("contact_name", "phone", "wechat", "email")}),
        ("设置", {"fields": ("key", "is_dev_data")}),
    )

    def has_add_permission(self, request):
        return not StudioSetting.objects.exists()
