from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction

from common.models import UUIDTimeStampedModel


def _media_upload_path(instance, filename, variant):
    extension = Path(filename).suffix.lower() or ".bin"
    return f"{instance.access}/{instance.kind}/{instance.id}/{variant}{extension}"


def original_upload_path(instance, filename):
    return _media_upload_path(instance, filename, "original")


def display_upload_path(instance, filename):
    return _media_upload_path(instance, filename, "display")


def thumbnail_upload_path(instance, filename):
    return _media_upload_path(instance, filename, "thumbnail")


class MediaAsset(UUIDTimeStampedModel):
    class Access(models.TextChoices):
        PUBLIC = "public", "公开"
        PRIVATE = "private", "私人"

    class Kind(models.TextChoices):
        WORK = "work", "作品"
        PUBLIC_PROCESS = "public_process", "公开制作日志"
        PROGRESS = "progress", "客户进度"
        INQUIRY = "inquiry", "询价附件"
        STUDIO = "studio", "工作室资料"

    access = models.CharField(max_length=16, choices=Access.choices)
    kind = models.CharField(max_length=32, choices=Kind.choices)
    original = models.ImageField(upload_to=original_upload_path, max_length=500)
    display = models.ImageField(upload_to=display_upload_path, max_length=500, blank=True)
    thumbnail = models.ImageField(upload_to=thumbnail_upload_path, max_length=500, blank=True)
    original_name = models.CharField(max_length=255, editable=False, blank=True)
    declared_content_type = models.CharField(max_length=100, editable=False, blank=True)
    detected_content_type = models.CharField(max_length=100, editable=False, blank=True)
    size_bytes = models.PositiveBigIntegerField(editable=False, default=0)
    width = models.PositiveIntegerField(editable=False, default=0)
    height = models.PositiveIntegerField(editable=False, default=0)
    sha256 = models.CharField(max_length=64, db_index=True, editable=False, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="uploaded_media",
    )
    is_dev_data = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["access", "kind", "created_at"])]

    def __str__(self):
        return self.original_name

    def clean(self):
        public_kinds = {self.Kind.WORK, self.Kind.PUBLIC_PROCESS}
        private_kinds = {self.Kind.PROGRESS, self.Kind.INQUIRY}
        if self.kind in public_kinds and self.access != self.Access.PUBLIC:
            raise ValidationError({"access": "公开作品与公开制作日志必须使用公开媒体。"})
        if self.kind in private_kinds and self.access != self.Access.PRIVATE:
            raise ValidationError({"access": "客户进度与询价附件必须使用私人媒体。"})

    def save(self, *args, **kwargs):
        new_names = []
        if self._state.adding and self.original and not self.sha256:
            from .services import prepare_image_asset

            new_names = prepare_image_asset(self)
        try:
            return super().save(*args, **kwargs)
        except Exception:
            storage = self.original.storage
            for name in new_names:
                storage.delete(name)
            raise

    def delete(self, *args, **kwargs):
        storage = self.original.storage
        names = [field.name for field in (self.original, self.display, self.thumbnail) if field and field.name]
        result = super().delete(*args, **kwargs)

        def remove_files():
            for name in names:
                storage.delete(name)

        transaction.on_commit(remove_files)
        return result
