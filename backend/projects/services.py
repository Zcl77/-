import uuid

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import ClientProject, Order, ProductionStage, ProjectMembership


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

    now = timezone.now()
    order.quote_decision = decision
    order.quote_decision_at = now
    order.confirmation_status = (
        Order.ConfirmationStatus.CONFIRMED if accepted else Order.ConfirmationStatus.CANCELLED
    )
    order.save(update_fields=["quote_decision", "quote_decision_at", "confirmation_status", "updated_at"])

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
