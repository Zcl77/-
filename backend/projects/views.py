from django.db import IntegrityError, transaction
from django.conf import settings
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError as ApiValidationError

from common.permissions import HasCompletedPasswordChange, IsCustomerOrStaff

from .models import (
    ClientProject,
    Order,
    ProgressImage,
    ProgressReceipt,
    ProgressUpdate,
    ProjectMessage,
    ProjectMessageReceipt,
)
from .serializers import (
    OrderSerializer,
    MockPaymentSerializer,
    PaymentRecordSerializer,
    ProductionStageSerializer,
    ProgressUpdateSerializer,
    ProjectDetailSerializer,
    ProjectMessageCreateSerializer,
    ProjectMessageSerializer,
    ProjectSummarySerializer,
    QuoteDecisionSerializer,
)
from .services import decide_quote, record_mock_payment


PRIVATE_PERMISSIONS = [IsAuthenticated, HasCompletedPasswordChange, IsCustomerOrStaff]


def accessible_projects(user):
    queryset = ClientProject.objects.all()
    if user.is_staff:
        return queryset if user.has_perm("projects.view_clientproject") else queryset.none()
    return queryset.filter(memberships__user=user, memberships__is_active=True).distinct()


def accessible_orders(user):
    queryset = Order.objects.all()
    if user.is_staff:
        return queryset if user.has_perm("projects.view_order") else queryset.none()
    profile = getattr(user, "customer_profile", None)
    return queryset.filter(customer=profile) if profile else queryset.none()


def visible_updates_queryset(user):
    queryset = ProgressUpdate.objects.select_related("stage", "author").prefetch_related(
        Prefetch("images", queryset=ProgressImage.objects.select_related("media"))
    )
    if not user.is_staff:
        queryset = queryset.filter(status=ProgressUpdate.Status.PUBLISHED)
    return queryset.order_by("-published_at", "-created_at")


def projects_with_summary_data(user):
    receipt_queryset = ProgressReceipt.objects.filter(user=user)
    updates = visible_updates_queryset(user).prefetch_related(
        Prefetch("receipts", queryset=receipt_queryset, to_attr="current_user_receipts")
    )
    return (
        accessible_projects(user)
        .select_related("order", "order__customer", "order__customer__user", "manager", "current_stage")
        .prefetch_related(
            "order__payment_records",
            Prefetch("progress_updates", queryset=updates, to_attr="visible_updates"),
        )
    )


class PrivateListView(ListAPIView):
    permission_classes = PRIVATE_PERMISSIONS


class PrivateDetailView(RetrieveAPIView):
    permission_classes = PRIVATE_PERMISSIONS


@method_decorator(never_cache, name="dispatch")
class OrderListView(PrivateListView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        return (
            accessible_orders(self.request.user)
            .select_related("customer", "customer__user")
            .prefetch_related("payment_records")
            .order_by("-created_at")
        )


@method_decorator([never_cache, csrf_protect], name="dispatch")
class QuoteDecisionView(APIView):
    permission_classes = PRIVATE_PERMISSIONS
    throttle_scope = "quote-decision"

    def post(self, request, order_id):
        if request.user.is_staff:
            raise PermissionDenied("工作室账号不能代替客户提交报价决定。")
        get_object_or_404(accessible_orders(request.user), pk=order_id)
        serializer = QuoteDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order, changed = decide_quote(
                order_id=order_id,
                customer_user=request.user,
                decision=serializer.validated_data["decision"],
            )
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(exc, DjangoValidationError):
                raise ApiValidationError(exc.messages) from exc
            raise
        return Response(
            {
                "order": OrderSerializer(order).data,
                "changed": changed,
                "message": "报价决定已记录。" if changed else "该报价决定已经记录，无需重复提交。",
            }
        )


@method_decorator([never_cache, csrf_protect], name="dispatch")
class MockPaymentView(APIView):
    permission_classes = PRIVATE_PERMISSIONS
    throttle_scope = "mock-payment"

    def post(self, request, order_id):
        if not settings.MOCK_PAYMENTS_ENABLED:
            raise PermissionDenied("模拟付款仅在本地开发和自动测试环境开放。")
        if request.user.is_staff:
            raise PermissionDenied("工作室账号不能代替客户执行模拟付款。")
        get_object_or_404(accessible_orders(request.user), pk=order_id)
        serializer = MockPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order, payment, created = record_mock_payment(
                order_id=order_id,
                customer_user=request.user,
                payment_type=serializer.validated_data["payment_type"],
            )
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(exc, DjangoValidationError):
                raise ApiValidationError(exc.messages) from exc
            raise
        return Response(
            {
                "order": OrderSerializer(order).data,
                "payment": PaymentRecordSerializer(payment).data,
                "created": created,
                "message": (
                    "本地模拟付款已记录；该记录不代表真实收款。"
                    if created
                    else "该模拟付款已记录，无需重复提交。"
                ),
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


@method_decorator(never_cache, name="dispatch")
class ProjectListView(PrivateListView):
    serializer_class = ProjectSummarySerializer

    def get_queryset(self):
        return projects_with_summary_data(self.request.user).order_by("-updated_at", "name")


@method_decorator(never_cache, name="dispatch")
class ProjectDetailView(PrivateDetailView):
    serializer_class = ProjectDetailSerializer
    lookup_url_kwarg = "project_id"

    def get_queryset(self):
        return projects_with_summary_data(self.request.user)


@method_decorator(never_cache, name="dispatch")
class ProjectStageListView(PrivateListView):
    serializer_class = ProductionStageSerializer
    pagination_class = None

    def get_queryset(self):
        project = get_object_or_404(accessible_projects(self.request.user), pk=self.kwargs["project_id"])
        return project.stages.order_by("sort_order", "created_at")


@method_decorator(never_cache, name="dispatch")
class ProjectUpdateListView(PrivateListView):
    serializer_class = ProgressUpdateSerializer

    def get_queryset(self):
        project = get_object_or_404(accessible_projects(self.request.user), pk=self.kwargs["project_id"])
        receipts = ProgressReceipt.objects.filter(user=self.request.user)
        return visible_updates_queryset(self.request.user).filter(project=project).prefetch_related(
            Prefetch("receipts", queryset=receipts, to_attr="current_user_receipts")
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        updates = list(page if page is not None else queryset)
        if not request.user.is_staff:
            now = timezone.now()
            with transaction.atomic():
                for update in updates:
                    receipts = getattr(update, "current_user_receipts", [])
                    receipt = receipts[0] if receipts else None
                    if receipt is None:
                        receipt, _ = ProgressReceipt.objects.get_or_create(update=update, user=request.user)
                    if receipt.viewed_at is None:
                        receipt.viewed_at = now
                        receipt.save(update_fields=["viewed_at", "updated_at"])
                    update.current_user_receipts = [receipt]
        serializer = self.get_serializer(updates, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)


@method_decorator([never_cache, csrf_protect], name="dispatch")
class AcknowledgeUpdateView(APIView):
    permission_classes = PRIVATE_PERMISSIONS

    def post(self, request, project_id, update_id):
        if request.user.is_staff:
            raise PermissionDenied("工作室账号无需确认客户进度。")
        project = get_object_or_404(accessible_projects(request.user), pk=project_id)
        update = get_object_or_404(
            project.progress_updates.filter(status=ProgressUpdate.Status.PUBLISHED),
            pk=update_id,
        )
        now = timezone.now()
        receipt, _ = ProgressReceipt.objects.get_or_create(update=update, user=request.user)
        receipt.viewed_at = receipt.viewed_at or now
        receipt.acknowledged_at = now
        receipt.save(update_fields=["viewed_at", "acknowledged_at", "updated_at"])
        return Response({"viewedAt": receipt.viewed_at, "acknowledgedAt": receipt.acknowledged_at})


@method_decorator([never_cache, csrf_protect], name="dispatch")
class ProjectMessageListCreateView(APIView):
    permission_classes = PRIVATE_PERMISSIONS
    throttle_scope = "project-message"

    def get_throttles(self):
        return [ScopedRateThrottle()] if self.request.method == "POST" else []

    def get_project(self, request, project_id):
        return get_object_or_404(accessible_projects(request.user), pk=project_id)

    def get(self, request, project_id):
        project = self.get_project(request, project_id)
        receipt_queryset = ProjectMessageReceipt.objects.filter(user=request.user)
        messages = list(
            project.messages.select_related("author")
            .prefetch_related(Prefetch("receipts", queryset=receipt_queryset, to_attr="current_user_receipts"))
            .order_by("created_at")
        )
        now = timezone.now()
        with transaction.atomic():
            for message in messages:
                if message.author_id == request.user.pk:
                    continue
                receipt, _ = ProjectMessageReceipt.objects.get_or_create(message=message, user=request.user)
                if receipt.read_at is None:
                    receipt.read_at = now
                    receipt.save(update_fields=["read_at", "updated_at"])
                message.current_user_receipts = [receipt]
        serializer = ProjectMessageSerializer(messages, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request, project_id):
        project = self.get_project(request, project_id)
        if request.user.is_staff and not request.user.has_perm("projects.add_projectmessage"):
            raise PermissionDenied("当前工作室账号无权发送项目留言。")
        serializer = ProjectMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        idempotency_key = request.headers.get("Idempotency-Key", "").strip() or None
        if idempotency_key and len(idempotency_key) > 64:
            raise ApiValidationError("重复提交标识无效。")
        if idempotency_key:
            existing = project.messages.filter(author=request.user, idempotency_key=idempotency_key).first()
            if existing:
                output = ProjectMessageSerializer(existing, context={"request": request})
                return Response(output.data)
        parent_id = serializer.validated_data.get("parent_id")
        parent = get_object_or_404(project.messages, pk=parent_id) if parent_id else None
        message = ProjectMessage(
            project=project,
            author=request.user,
            parent=parent,
            body=serializer.validated_data["body"],
            idempotency_key=idempotency_key,
            is_dev_data=False,
        )
        message.submission_fingerprint = message.build_submission_fingerprint()
        message.submission_bucket = int(timezone.now().timestamp() // 60)
        existing = project.messages.filter(
            submission_fingerprint=message.submission_fingerprint,
            submission_bucket=message.submission_bucket,
        ).first()
        if existing:
            output = ProjectMessageSerializer(existing, context={"request": request})
            return Response(output.data)
        message.full_clean(validate_unique=False, validate_constraints=False)
        try:
            with transaction.atomic():
                message.save(force_insert=True)
        except IntegrityError:
            message = project.messages.filter(
                submission_fingerprint=message.submission_fingerprint,
                submission_bucket=message.submission_bucket,
            ).first()
            if message is None and idempotency_key:
                message = project.messages.filter(author=request.user, idempotency_key=idempotency_key).first()
            if message is None:
                raise
            output = ProjectMessageSerializer(message, context={"request": request})
            return Response(output.data)
        output = ProjectMessageSerializer(message, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)
