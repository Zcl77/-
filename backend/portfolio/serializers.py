from rest_framework import serializers

from common.serializers import StrictModelSerializer
from media_library.serializers import serialize_media

from .models import Category, PublicProcessPost, StudioSetting, Work, WorkImage


class CategorySerializer(StrictModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description")
        read_only_fields = fields


class WorkImageSerializer(StrictModelSerializer):
    media = serializers.SerializerMethodField()

    class Meta:
        model = WorkImage
        fields = ("id", "kind", "alt_text", "caption", "room_name", "sort_order", "focal_x", "focal_y", "media")
        read_only_fields = fields

    def get_media(self, obj):
        return serialize_media(obj.media, self.context["request"])


class WorkListSerializer(StrictModelSerializer):
    category = CategorySerializer(read_only=True)
    cover = serializers.SerializerMethodField()

    class Meta:
        model = Work
        fields = (
            "id",
            "title",
            "slug",
            "summary",
            "category",
            "is_featured",
            "scale",
            "period",
            "completion_percent",
            "published_at",
            "cover",
        )
        read_only_fields = fields

    def get_cover(self, obj):
        images = getattr(obj, "public_images", [])
        cover = next((image for image in images if image.kind == WorkImage.Kind.COVER), None)
        image = cover or next(iter(images), None)
        return WorkImageSerializer(image, context=self.context).data if image else None


class WorkDetailSerializer(WorkListSerializer):
    images = serializers.SerializerMethodField()

    class Meta(WorkListSerializer.Meta):
        fields = WorkListSerializer.Meta.fields + ("description", "dimensions", "materials", "authors", "images")

    def get_images(self, obj):
        return WorkImageSerializer(getattr(obj, "public_images", []), many=True, context=self.context).data


class PublicProcessPostSerializer(StrictModelSerializer):
    work = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    class Meta:
        model = PublicProcessPost
        fields = ("id", "title", "slug", "summary", "body", "published_at", "work", "images")
        read_only_fields = fields

    def get_work(self, obj):
        if not obj.work_id:
            return None
        return {"title": obj.work.title, "slug": obj.work.slug}

    def get_images(self, obj):
        images = getattr(obj, "public_images", [])
        return [
            {
                "id": str(image.pk),
                "altText": image.alt_text,
                "caption": image.caption,
                "sortOrder": image.sort_order,
                "media": serialize_media(image.media, self.context["request"]),
            }
            for image in images
        ]


class StudioSettingSerializer(StrictModelSerializer):
    class Meta:
        model = StudioSetting
        fields = (
            "studio_name",
            "studio_name_en",
            "tagline",
            "description",
            "contact_name",
            "phone",
            "wechat",
            "email",
            "privacy_notice",
        )
        read_only_fields = fields
