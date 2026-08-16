import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import ClientProject, Order, PaymentRecord, ProductionStage, ProjectMembership


DEFAULT_STAGE_NAMES = (
    "需求确认",
    "方案设计",
    "三维建模",
    "打印制作",
    "组装涂装",
    "成品验收",
    "包装交付",
)


@transaction.atomic
def ensure_project_scaffold(project_id):
    """Create the default stages and owner membership exactly once."""
    project = ClientProject.objects.select_for_update().select_related("order__customer__user").get(pk=project_id)
    stages = []
    for index, name in enumerate(DEFAULT_STAGE_NAMES):
        stage, _ = ProductionStage.objects.get_or_create(
            project=project,
            sort_order=index,
            defaults={
                "name": name,
                "status": ProductionStage.Status.ACTIVE if index == 0 else ProductionStage.Status.PENDING,
            },
        )
        stages.append(stage)

    if project.current_stage_id is None and stages:
        ClientProject.objects.filter(pk=project.pk, current_stage__isnull=True).update(current_stage=stages[0])

    ProjectMembership.objects.update_or_create(
        project=project,
        user=project.order.customer.user,
        defaults={"role": ProjectMembership.Role.OWNER, "is_active": True},
    )
    return project


def _new_order_number():
    return f"ZX-{timezone.localdate():%Y%m%d}-{uuid.uuid4().hex[:8].upper()}"


@transaction.atomic
def create_order_from_inquiry(inquiry):
    from interactions.models import Inquiry

    locked = Inquiry.objects.select_for_update().select_related("customer", "order").get(pk=inquiry.pk)
    if locked.order_id:
        return locked.order, False
    if not locked.customer_id:
        raise ValidationError("请先为询价选择客户，再创建订单。")

    order = Order.objects.create(
        order_number=_new_order_number(),
        customer=locked.customer,
        order_type=locked.project_type,
        confirmation_status=Order.ConfirmationStatus.INQUIRY,
        notes=f"由询价 {locked.pk} 创建。",
        is_dev_data=locked.is_dev_data,
    )
    locked.order = order
    locked.status = Inquiry.Status.CONTACTED
    locked.save(update_fields=["order", "status", "updated_at"])
    return order, True


@transaction.atomic
def decide_quote(*, order_id, customer_user, decision):
    order = (
        Order.objects.select_for_update()
        .select_related("customer__user")
        .get(pk=order_id, customer__user=customer_user)
    )
    accepted = decision == Order.QuoteDecision.ACCEPTED
    if decision not in {Order.QuoteDecision.ACCEPTED, Order.QuoteDecision.REJECTED}:
        raise ValidationError("报价决定只能是接受或拒绝。")

    if order.quote_decision == decision:
        return order, False
    if order.quote_decision in {Order.QuoteDecision.ACCEPTED, Order.QuoteDecision.REJECTED}:
        raise ValidationError("该报价已经完成决定，不能重复修改。")
    if order.confirmation_status != Order.ConfirmationStatus.PROPOSED:
        raise ValidationError("当前订单没有等待确认的有效报价。")
    if order.agreed_amount is None or order.agreed_amount <= 0:
        raise ValidationError("报价金额无效，请联系工作室核对。")
    if order.quote_valid_until and order.quote_valid_until < timezone.now():
        raise ValidationError("该报价已超过有效期，请联系工作室重新报价。")

    order._prepare_amounts()
    if order.deposit_amount + order.final_amount != order.agreed_amount:
        raise ValidationError("定金与尾款金额合计不等于订单金额，请联系工作室核对。")

    now = timezone.now()
    order.quote_decision = decision
    order.quote_decision_at = now
    order.confirmation_status = (
        Order.ConfirmationStatus.CONFIRMED if accepted else Order.ConfirmationStatus.CANCELLED
    )
    if accepted:
        order.deposit_status = (
            Order.PaymentRecordStatus.PENDING if order.deposit_amount > 0 else Order.PaymentRecordStatus.WAIVED
        )
        order.final_payment_status = (
            Order.PaymentRecordStatus.PENDING if order.final_amount > 0 else Order.PaymentRecordStatus.WAIVED
        )
        if order.deposit_amount > 0:
            order.payment_status = Order.PaymentStatus.DEPOSIT_PENDING
        elif order.final_amount > 0:
            order.payment_status = Order.PaymentStatus.FINAL_PENDING
        else:
            order.payment_status = Order.PaymentStatus.PAID
    else:
        order.payment_status = Order.PaymentStatus.CANCELLED
    order.save(
        update_fields=[
            "quote_decision",
            "quote_decision_at",
            "confirmation_status",
            "deposit_amount",
            "final_amount",
            "deposit_status",
            "final_payment_status",
            "payment_status",
            "updated_at",
        ]
    )

    projects = list(order.projects.select_for_update())
    if accepted:
        if not projects:
            project = ClientProject.objects.create(
                order=order,
                name=f"{order.order_type}项目",
                status=ClientProject.Status.ACTIVE,
                is_dev_data=order.is_dev_data,
            )
            ensure_project_scaffold(project.pk)
        else:
            order.projects.filter(status=ClientProject.Status.PLANNING).update(
                status=ClientProject.Status.ACTIVE,
                updated_at=now,
            )
    else:
        order.projects.exclude(status__in=[ClientProject.Status.COMPLETED, ClientProject.Status.CANCELLED]).update(
            status=ClientProject.Status.CANCELLED,
            updated_at=now,
        )
    return order, True


@transaction.atomic
def record_mock_payment(*, order_id, customer_user, payment_type):
    if not settings.MOCK_PAYMENTS_ENABLED:
        raise ValidationError("模拟付款仅在显式启用的本地开发环境开放。")
    order = (
        Order.objects.select_for_update()
        .select_related("customer__user")
        .get(pk=order_id, customer__user=customer_user)
    )
    if not order.is_mock_payment_eligible_for(customer_user):
        raise ValidationError("模拟付款仅允许明确标记的本地开发客户和开发订单。")
    if payment_type not in {PaymentRecord.PaymentType.DEPOSIT, PaymentRecord.PaymentType.FINAL}:
        raise ValidationError("模拟付款类型只能是定金或尾款。")
    if (
        order.confirmation_status != Order.ConfirmationStatus.CONFIRMED
        or order.quote_decision != Order.QuoteDecision.ACCEPTED
    ):
        raise ValidationError("只有已接受报价的订单可以进行本地模拟付款。")
    if order.currency != Order.Currency.CNY:
        raise ValidationError("当前仅支持人民币 CNY 订单的模拟付款。")
    if (
        order.agreed_amount is None
        or order.agreed_amount <= 0
        or order.deposit_amount < 0
        or order.final_amount < 0
        or order.deposit_amount + order.final_amount != order.agreed_amount
    ):
        raise ValidationError("订单金额、定金或尾款配置不合法，无法付款。")

    idempotency_key = f"mock:{order.pk}:{payment_type}:succeeded"
    existing = PaymentRecord.objects.filter(idempotency_key=idempotency_key).first()
    if existing is not None:
        valid_replay = (
            payment_type == PaymentRecord.PaymentType.DEPOSIT
            and order.payment_status in {Order.PaymentStatus.FINAL_PENDING, Order.PaymentStatus.PAID}
        ) or (
            payment_type == PaymentRecord.PaymentType.FINAL
            and order.payment_status == Order.PaymentStatus.PAID
        )
        if not valid_replay:
            raise ValidationError("付款记录与订单状态不一致，请联系工作室核对。")
        return order, existing, False

    if payment_type == PaymentRecord.PaymentType.DEPOSIT:
        if order.deposit_amount <= 0:
            raise ValidationError("该订单无需支付定金。")
        if order.payment_status != Order.PaymentStatus.DEPOSIT_PENDING:
            raise ValidationError("该订单当前不处于定金待支付状态。")
        amount = order.deposit_amount
        next_status = (
            Order.PaymentStatus.FINAL_PENDING if order.final_amount > 0 else Order.PaymentStatus.PAID
        )
        order.deposit_status = Order.PaymentRecordStatus.RECORDED
        order.payment_status = next_status
    else:
        if order.final_amount <= 0:
            raise ValidationError("该订单无需支付尾款。")
        if order.payment_status != Order.PaymentStatus.FINAL_PENDING:
            raise ValidationError("该订单当前不处于尾款待支付状态。")
        amount = order.final_amount
        order.final_payment_status = Order.PaymentRecordStatus.RECORDED
        order.payment_status = Order.PaymentStatus.PAID

    record = PaymentRecord.objects.create(
        order=order,
        payment_type=payment_type,
        channel=PaymentRecord.Channel.MOCK,
        amount=amount,
        currency=order.currency,
        status=PaymentRecord.Status.SUCCEEDED,
        mock_transaction_id=f"MOCK-{uuid.uuid4().hex.upper()}",
        idempotency_key=idempotency_key,
        paid_at=timezone.now(),
        notes="由客户门户的本地测试按钮生成，不代表真实收款。",
        metadata={"source": "local_customer_portal"},
    )
    order.save(
        update_fields=["deposit_status", "final_payment_status", "payment_status", "updated_at"]
    )
    return order, record, True
