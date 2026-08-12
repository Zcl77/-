from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import MediaAsset


def asset_is_referenced(asset):
    for relation in asset._meta.related_objects:
        accessor = relation.get_accessor_name()
        related = getattr(asset, accessor, None)
        if related is None:
            continue
        if relation.one_to_one:
            try:
                if related:
                    return True
            except relation.related_model.DoesNotExist:
                continue
        elif related.exists():
            return True
    return False


def delete_if_unreferenced(asset_id):
    try:
        asset = MediaAsset.objects.get(pk=asset_id)
    except MediaAsset.DoesNotExist:
        return
    if not asset_is_referenced(asset):
        asset.delete()


def schedule_cleanup(asset_id):
    if asset_id:
        transaction.on_commit(lambda: delete_if_unreferenced(asset_id))


@receiver(pre_save)
def remember_replaced_media(sender, instance, **kwargs):
    if sender._meta.app_label not in {"portfolio", "projects", "interactions"} or not hasattr(instance, "media_id"):
        return
    instance._previous_media_id = None
    if not instance.pk:
        return
    instance._previous_media_id = sender.objects.filter(pk=instance.pk).values_list("media_id", flat=True).first()


@receiver(post_save)
def cleanup_replaced_media(sender, instance, **kwargs):
    previous_id = getattr(instance, "_previous_media_id", None)
    if previous_id and previous_id != getattr(instance, "media_id", None):
        schedule_cleanup(previous_id)


@receiver(post_delete)
def cleanup_deleted_media_reference(sender, instance, **kwargs):
    if sender._meta.app_label in {"portfolio", "projects", "interactions"} and hasattr(instance, "media_id"):
        schedule_cleanup(instance.media_id)
