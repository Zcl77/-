from django.db.models.signals import post_save
from django.dispatch import receiver

from django.db import transaction

from .models import ClientProject
from .services import ensure_project_scaffold


@receiver(post_save, sender=ClientProject)
def create_default_stages(sender, instance, created, **kwargs):
    if not created:
        return
    project_id = instance.pk
    transaction.on_commit(lambda: ensure_project_scaffold(project_id))
