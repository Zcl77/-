from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from common.models import UUIDTimeStampedModel
from media_library.models import MediaAsset


class Category(UUIDTimeStampedModel):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    description = models.CharField(max_length=300, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_visible = models.BooleanField(default=False)
    is_dev_data = models.BooleanField(default=False)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = f"category-{self.id.hex}"
        super().save(*args, **kwargs)


class Work(UUIDTimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "草稿"
        PUBLISHED = "published", "公开"
        HIDDEN = "hidden", "隐藏"
        ARCHIVED = "archived", "归档"

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="works")
    title = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    summary = models.CharField(max_length=300, blank=True)
    description = models.TextField(max_length=10000, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    is_featured = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    scale = models.CharField(max_length=40, blank=True)
    dimensions = models.CharField(max_length=120, blank=True)
    materials = models.CharField(max_length=500, blank=True)
    period = models.CharField(max_length=120, blank=True)
    authors = models.CharField(max_length=500, blank=True)
    completion_percent = models.PositiveSmallIntegerField(default=100)
    published_at = models.DateTimeField(null=True, blank=True)
    is_dev_data = models.BooleanField(default=False)

    class Meta:
        ordering = ["sort_order", "-published_at", "title"]
        constraints = [
            models.CheckConstraint(
                condition=Q(completion_percent__gte=0, completion_percent__lte=100),
                name="portfolio_work_completion_0_100",
            ),
            models.CheckConstraint(
                condition=~Q(status="published") | Q(published_at__isnull=False),
                name="portfolio_published_work_has_timestamp",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = f"work-{self.id.hex}"
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class WorkImage(UUIDTimeStampedModel):
    class Kind(models.TextChoices):
        COVER = "cover", "封面"
        GALLERY = "gallery", "作品图"
        ROOM = "room", "空间细节"

    work = models.ForeignKey(Work, on_delete=models.CASCADE, related_name="images")
    media = models.ForeignKey(MediaAsset, on_delete=models.PROTECT, related_name="work_images")
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.GALLERY)
    alt_text = models.CharField(max_length=240)
    caption = models.CharField(max_length=500, blank=True)
    room_name = models.CharField(max_length=120, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    focal_x = models.DecimalField(max_digits=5, decimal_places=2, default=50)
    focal_y = models.DecimalField(max_digits=5, decimal_places=2, default=50)

    class Meta:
        ordering = ["sort_order", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["work", "sort_order"], name="portfolio_unique_work_image_order"),
            models.CheckConstraint(condition=Q(focal_x__gte=0, focal_x__lte=100), name="portfolio_work_image_focal_x"),
            models.CheckConstraint(condition=Q(focal_y__gte=0, focal_y__lte=100), name="portfolio_work_image_focal_y"),
        ]

    def clean(self):
        if self.media_id and (
            self.media.access != MediaAsset.Access.PUBLIC or self.media.kind != MediaAsset.Kind.WORK
        ):
            raise ValidationError({"media": "公开作品只能使用作品类型的公开媒体。"})

    def __str__(self):
        return f"{self.work} / {self.kind}"


class PublicProcessPost(UUIDTimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "草稿"
        PUBLISHED = "published", "公开"
        HIDDEN = "hidden", "隐藏"

    work = models.ForeignKey(Work, null=True, blank=True, on_delete=models.SET_NULL, related_name="public_process_posts")
    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    summary = models.CharField(max_length=300, blank=True)
    body = models.TextField(max_length=12000)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    is_dev_data = models.BooleanField(default=False)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(status="published") | Q(published_at__isnull=False),
                name="portfolio_published_process_has_timestamp",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = f"process-{self.id.hex}"
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class PublicProcessImage(UUIDTimeStampedModel):
    post = models.ForeignKey(PublicProcessPost, on_delete=models.CASCADE, related_name="images")
    media = models.ForeignKey(MediaAsset, on_delete=models.PROTECT, related_name="public_process_images")
    alt_text = models.CharField(max_length=240)
    caption = models.CharField(max_length=500, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "created_at"]
        constraints = [models.UniqueConstraint(fields=["post", "sort_order"], name="portfolio_unique_process_image_order")]

    def clean(self):
        if self.media_id and (
            self.media.access != MediaAsset.Access.PUBLIC
            or self.media.kind != MediaAsset.Kind.PUBLIC_PROCESS
        ):
            raise ValidationError({"media": "公开制作日志只能使用对应类型的公开媒体。"})


class StudioSetting(UUIDTimeStampedModel):
    key = models.SlugField(max_length=32, unique=True, default="default")
    studio_name = models.CharField(max_length=120, default="知行造境")
    studio_name_en = models.CharField(max_length=120, default="Zhixing Studio")
    tagline = models.CharField(max_length=240, blank=True)
    description = models.TextField(max_length=3000, blank=True)
    contact_name = models.CharField(max_length=80, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    wechat = models.CharField(max_length=64, blank=True)
    email = models.EmailField(blank=True)
    privacy_notice = models.TextField(max_length=5000, blank=True)

    def __str__(self):
        return self.studio_name
