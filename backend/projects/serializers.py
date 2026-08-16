from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from common.serializers import StrictModelSerializer, StrictSerializer
from media_library.serializers import serialize_media

from .models import (
    ClientProject,
    Order,
    PaymentRecord,
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


class PaymentRecordSerializer(StrictModelSerializer):
    class Meta:
        model = PaymentRecord
        fields = (
            "id",
            "payment_type",
            "channel",
            "amount",
            "currency",
            "status",
            "mock_transaction_id",
            "paid_at",
            "created_at",
        )
        read_only_fields = fields


class OrderSerializer(StrictModelSerializer):
    payment_records = PaymentRecordSerializer(many=True, read_only=True)
    available_actions = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "order_type",
            "confirmation_status",
            "agreed_amount",
            "currency",
            "deposit_amount",
            "final_amount",
            "quoted_at",
            "quote_valid_until",
            "quote_decision",
            "quote_decision_at",
            "payment_status",
            "deposit_status",
            "final_payment_status",
            "delivery_status",
            "payment_records",
            "available_actions",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_available_actions(self, obj):
        actions = []
        quote_is_valid = obj.quote_valid_until is None or obj.quote_valid_until >= timezone.now()
        if (
            obj.confirmation_status == Order.ConfirmationStatus.PROPOSED
            and obj.quote_decision == Order.QuoteDecision.PENDING
            and quote_is_valid
        ):
            actions.extend(("accept_quote", "reject_quote"))

        request = self.context.get("request")
        user = request.user if request is not None else obj.customer.user
        amount_configuration_valid = (
            obj.agreed_amount is not None
            and obj.agreed_amount > 0
            and obj.deposit_amount >= 0
            and obj.final_amount >= 0
            and obj.deposit_amount + obj.final_amount == obj.agreed_amount
            and obj.currency == Order.Currency.CNY
        )
        if (
            settings.MOCK_PAYMENTS_ENABLED
            and obj.is_mock_payment_eligible_for(user)
            and obj.confirmation_status == Order.ConfirmationStatus.CONFIRMED
            and obj.quote_decision == Order.QuoteDecision.ACCEPTED
            and amount_configuration_valid
        ):
            if obj.payment_status == Order.PaymentStatus.DEPOSIT_PENDING and obj.deposit_amount > 0:
                actions.append("mock_pay_deposit")
            elif obj.payment_status == Order.PaymentStatus.FINAL_PENDING and obj.final_amount > 0:
                actions.append("mock_pay_final")
        return actions


class QuoteDecisionSerializer(StrictSerializer):
    decision = serializers.ChoiceField(
        choices=(Order.QuoteDecision.ACCEPTED, Order.QuoteDecision.REJECTED),
    )


class MockPaymentSerializer(StrictSerializer):
    payment_type = serializers.ChoiceField(
        choices=(PaymentRecord.PaymentType.DEPOSIT, PaymentRecord.PaymentType.FINAL),
    )


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
    order = serializers.SerializerMethodField()

    class Meta(ProjectSummarySerializer.Meta):
        fields = ProjectSummarySerializer.Meta.fields + ("order",)

    def get_order(self, obj):
        user = self.context["request"].user
        if user.is_staff:
            return OrderSerializer(obj.order).data if user.has_perm("projects.view_order") else None
        if obj.order.customer.user_id != user.pk:
            return None
        return OrderSerializer(obj.order).data


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
