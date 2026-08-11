from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ClientProject, ProductionStage, ProjectMembership


DEFAULT_STAGE_NAMES = [
    "需求确认",
    "方案设计",
    "三维建模",
    "打印制作",
    "组装涂装",
    "成品验收",
    "包装交付",
]


@receiver(post_save, sender=ClientProject)
def create_default_stages(sender, instance, created, **kwargs):
    if not created:
        return
    stages = ProductionStage.objects.bulk_create(
        [
            ProductionStage(
                project=instance,
                name=name,
                sort_order=index,
                status=ProductionStage.Status.ACTIVE if index == 0 else ProductionStage.Status.PENDING,
            )
            for index, name in enumerate(DEFAULT_STAGE_NAMES)
        ]
    )
    ClientProject.objects.filter(pk=instance.pk).update(current_stage=stages[0])
    ProjectMembership.objects.get_or_create(
        project=instance,
        user=instance.order.customer.user,
        defaults={"role": ProjectMembership.Role.OWNER, "is_active": True},
    )
