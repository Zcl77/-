from rest_framework import serializers

from common.serializers import StrictModelSerializer
from media_library.serializers import serialize_media

from .models import Category, PublicProcessPost, StudioSetting, Work, WorkImage


class LocalizedRepresentationMixin:
    localized_fields = ()

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get("request")
        language = request.headers.get("Accept-Language", "") if request else ""
        if language.lower().startswith("en"):
            for field in self.localized_fields:
                english_value = getattr(instance, f"{field}_en", "")
                if english_value:
                    representation[field] = english_value
        return representation


class CategorySerializer(LocalizedRepresentationMixin, StrictModelSerializer):
    localized_fields = ("name", "description")

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description")
        read_only_fields = fields


class WorkImageSerializer(LocalizedRepresentationMixin, StrictModelSerializer):
    media = serializers.SerializerMethodField()
    localized_fields = ("alt_text", "caption", "room_name")

    class Meta:
        model = WorkImage
        fields = ("id", "kind", "alt_text", "caption", "room_name", "sort_order", "focal_x", "focal_y", "media")
        read_only_fields = fields

    def get_media(self, obj):
        return serialize_media(obj.media, self.context["request"])


class WorkListSerializer(LocalizedRepresentationMixin, StrictModelSerializer):
    category = CategorySerializer(read_only=True)
    cover = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    localized_fields = (
        "title",
        "summary",
        "description",
        "scale",
        "dimensions",
        "materials",
        "period",
        "authors",
    )

    class Meta:
        model = Work
        fields = (
            "id",
            "title",
            "slug",
            "summary",
            "description",
            "category",
            "is_featured",
            "is_dev_data",
            "scale",
            "dimensions",
            "materials",
            "period",
            "authors",
            "completion_percent",
            "published_at",
            "cover",
            "images",
        )
        read_only_fields = fields

    def get_cover(self, obj):
        images = getattr(obj, "public_images", [])
        cover = next((image for image in images if image.kind == WorkImage.Kind.COVER), None)
        image = cover or next(iter(images), None)
        return WorkImageSerializer(image, context=self.context).data if image else None

    def get_images(self, obj):
        return WorkImageSerializer(getattr(obj, "public_images", []), many=True, context=self.context).data


class WorkDetailSerializer(WorkListSerializer):
    pass


class PublicProcessPostSerializer(LocalizedRepresentationMixin, StrictModelSerializer):
    work = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    localized_fields = ("title", "summary", "body")

    class Meta:
        model = PublicProcessPost
        fields = ("id", "title", "slug", "summary", "body", "published_at", "is_dev_data", "work", "images")
        read_only_fields = fields

    def get_work(self, obj):
        if not obj.work_id:
            return None
        request = self.context.get("request")
        use_english = request and request.headers.get("Accept-Language", "").lower().startswith("en")
        return {"title": obj.work.title_en or obj.work.title if use_english else obj.work.title, "slug": obj.work.slug}

    def get_images(self, obj):
        images = getattr(obj, "public_images", [])
        request = self.context.get("request")
        use_english = request and request.headers.get("Accept-Language", "").lower().startswith("en")
        return [
            {
                "id": str(image.pk),
                "altText": image.alt_text_en or image.alt_text if use_english else image.alt_text,
                "caption": image.caption_en or image.caption if use_english else image.caption,
                "sortOrder": image.sort_order,
                "media": serialize_media(image.media, self.context["request"]),
            }
            for image in images
        ]


class StudioSettingSerializer(LocalizedRepresentationMixin, StrictModelSerializer):
    localized_fields = ("tagline", "description", "privacy_notice")

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
            "is_dev_data",
        )
        read_only_fields = fields
