from django.contrib import admin

from .models import MediaAsset


@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ("original_name", "access", "kind", "detected_content_type", "size_bytes", "uploaded_by", "created_at")
    list_filter = ("access", "kind", "is_dev_data", "detected_content_type")
    search_fields = ("original_name", "sha256")
    readonly_fields = (
        "id",
        "display",
        "thumbnail",
        "original_name",
        "declared_content_type",
        "detected_content_type",
        "size_bytes",
        "width",
        "height",
        "sha256",
        "created_at",
        "updated_at",
    )

    def save_model(self, request, obj, form, change):
        if not change and obj.uploaded_by_id is None:
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        if obj is not None:
            fields.extend(["access", "kind", "original", "uploaded_by", "is_dev_data"])
        return tuple(fields)
