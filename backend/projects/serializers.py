from rest_framework import serializers

from common.serializers import StrictModelSerializer, StrictSerializer
from media_library.serializers import serialize_media

from .models import (
    ClientProject,
    Order,
    ProductionStage,
    ProgressImage,
    ProgressReceipt,
    ProgressUpdate,
    ProjectMessage,
    ProjectMessageReceipt,
)


def user_display_name(user):
    profile = getattr(user, "customer_profile", None)
    return profile.display_name if profile else user.get_full_name() or user.get_username()


class OrderSerializer(StrictModelSerializer):
    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "order_type",
            "confirmation_status",
            "agreed_amount",
            "deposit_status",
            "final_payment_status",
            "delivery_status",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ProductionStageSerializer(StrictModelSerializer):
    class Meta:
        model = ProductionStage
        fields = (
            "id",
            "name",
            "sort_order",
            "status",
            "description",
            "started_at",
            "completed_at",
        )
        read_only_fields = fields


class ProgressImageSerializer(StrictModelSerializer):
    media = serializers.SerializerMethodField()

    class Meta:
        model = ProgressImage
        fields = ("id", "caption", "alt_text", "sort_order", "media")
        read_only_fields = fields

    def get_media(self, obj):
        return serialize_media(obj.media, self.context["request"], private=True)


class ProgressUpdateSerializer(StrictModelSerializer):
    stage = ProductionStageSerializer(read_only=True)
    author = serializers.SerializerMethodField()
    images = ProgressImageSerializer(many=True, read_only=True)
    receipt = serializers.SerializerMethodField()

    class Meta:
        model = ProgressUpdate
        fields = (
            "id",
            "title",
            "body",
            "next_plan",
            "expected_next_update_at",
            "requires_acknowledgement",
            "published_at",
            "stage",
            "author",
            "images",
            "receipt",
        )
        read_only_fields = fields

    def get_author(self, obj):
        return {"id": str(obj.author_id), "displayName": user_display_name(obj.author)}

    def get_receipt(self, obj):
        receipts = getattr(obj, "current_user_receipts", [])
        receipt = receipts[0] if receipts else None
        return {
            "viewedAt": receipt.viewed_at if receipt else None,
            "acknowledgedAt": receipt.acknowledged_at if receipt else None,
        }


class ProjectSummarySerializer(StrictModelSerializer):
    current_stage = ProductionStageSerializer(read_only=True)
    manager = serializers.SerializerMethodField()
    latest_update = serializers.SerializerMethodField()
    unread_update_count = serializers.SerializerMethodField()

    class Meta:
        model = ClientProject
        fields = (
            "id",
            "name",
            "description",
            "status",
            "completion_percent",
            "next_plan",
            "expected_next_update_at",
            "created_at",
            "updated_at",
            "current_stage",
            "manager",
            "latest_update",
            "unread_update_count",
        )
        read_only_fields = fields

    def get_manager(self, obj):
        if not obj.manager_id:
            return None
        return {"id": str(obj.manager_id), "displayName": user_display_name(obj.manager)}

    def get_latest_update(self, obj):
        updates = getattr(obj, "visible_updates", [])
        update = updates[0] if updates else None
        if update is None:
            return None
        return {
            "id": str(update.pk),
            "title": update.title,
            "publishedAt": update.published_at,
        }

    def get_unread_update_count(self, obj):
        request = self.context["request"]
        if request.user.is_staff:
            return 0
        return sum(
            1
            for update in getattr(obj, "visible_updates", [])
            if not getattr(update, "current_user_receipts", [])
            or getattr(update, "current_user_receipts")[0].viewed_at is None
        )


class ProjectDetailSerializer(ProjectSummarySerializer):
    order = OrderSerializer(read_only=True)

    class Meta(ProjectSummarySerializer.Meta):
        fields = ProjectSummarySerializer.Meta.fields + ("order",)


class ProjectMessageSerializer(StrictModelSerializer):
    author = serializers.SerializerMethodField()
    parent_id = serializers.UUIDField(read_only=True)
    is_mine = serializers.SerializerMethodField()
    read_at = serializers.SerializerMethodField()

    class Meta:
        model = ProjectMessage
        fields = ("id", "body", "parent_id", "author", "is_mine", "read_at", "created_at")
        read_only_fields = fields

    def get_author(self, obj):
        return {"id": str(obj.author_id), "displayName": user_display_name(obj.author)}

    def get_is_mine(self, obj):
        return obj.author_id == self.context["request"].user.pk

    def get_read_at(self, obj):
        receipts = getattr(obj, "current_user_receipts", [])
        return receipts[0].read_at if receipts else None


class ProjectMessageCreateSerializer(StrictSerializer):
    body = serializers.CharField(max_length=3000, trim_whitespace=True)
    parent_id = serializers.UUIDField(required=False, allow_null=True)
