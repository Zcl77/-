from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from common.models import UUIDTimeStampedModel
from media_library.models import MediaAsset


class Category(UUIDTimeStampedModel):
    name = models.CharField("分类名称", max_length=80, unique=True)
    name_en = models.CharField("英文分类名称", max_length=80, blank=True)
    slug = models.SlugField("网址标识", max_length=100, unique=True, blank=True)
    description = models.CharField("分类说明", max_length=300, blank=True)
    description_en = models.CharField("英文分类说明", max_length=300, blank=True)
    sort_order = models.PositiveIntegerField("排序", default=0)
    is_visible = models.BooleanField("公开显示", default=False)
    is_dev_data = models.BooleanField("开发测试数据", default=False)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "作品分类"
        verbose_name_plural = "作品分类"

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

    category = models.ForeignKey(Category, verbose_name="作品分类", on_delete=models.PROTECT, related_name="works")
    title = models.CharField("作品标题", max_length=160)
    title_en = models.CharField("英文作品标题", max_length=160, blank=True)
    slug = models.SlugField("网址标识", max_length=180, unique=True, blank=True)
    summary = models.CharField("作品摘要", max_length=300, blank=True)
    summary_en = models.CharField("英文作品摘要", max_length=300, blank=True)
    description = models.TextField("作品说明", max_length=10000, blank=True)
    description_en = models.TextField("英文作品说明", max_length=10000, blank=True)
    status = models.CharField("发布状态", max_length=16, choices=Status.choices, default=Status.DRAFT)
    is_featured = models.BooleanField("代表作品", default=False)
    sort_order = models.PositiveIntegerField("排序", default=0)
    scale = models.CharField("模型比例", max_length=40, blank=True)
    scale_en = models.CharField("英文模型比例", max_length=40, blank=True)
    dimensions = models.CharField("尺寸", max_length=120, blank=True)
    dimensions_en = models.CharField("英文尺寸", max_length=120, blank=True)
    materials = models.CharField("材料", max_length=500, blank=True)
    materials_en = models.CharField("英文材料", max_length=500, blank=True)
    period = models.CharField("制作时期", max_length=120, blank=True)
    period_en = models.CharField("英文制作时期", max_length=120, blank=True)
    authors = models.CharField("制作者", max_length=500, blank=True)
    authors_en = models.CharField("英文制作者", max_length=500, blank=True)
    completion_percent = models.PositiveSmallIntegerField("完成百分比", default=100)
    published_at = models.DateTimeField("发布时间", null=True, blank=True)
    is_dev_data = models.BooleanField("开发测试数据", default=False)

    class Meta:
        ordering = ["sort_order", "-published_at", "title"]
        verbose_name = "作品"
        verbose_name_plural = "作品"
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

    def clean(self):
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()

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

    work = models.ForeignKey(Work, verbose_name="作品", on_delete=models.CASCADE, related_name="images")
    media = models.ForeignKey(MediaAsset, verbose_name="媒体文件", on_delete=models.PROTECT, related_name="work_images")
    kind = models.CharField("图片用途", max_length=16, choices=Kind.choices, default=Kind.GALLERY)
    alt_text = models.CharField("替代文字", max_length=240)
    alt_text_en = models.CharField("英文替代文字", max_length=240, blank=True)
    caption = models.CharField("图片说明", max_length=500, blank=True)
    caption_en = models.CharField("英文图片说明", max_length=500, blank=True)
    room_name = models.CharField("空间名称", max_length=120, blank=True)
    room_name_en = models.CharField("英文空间名称", max_length=120, blank=True)
    sort_order = models.PositiveIntegerField("排序", default=0)
    focal_x = models.DecimalField("水平焦点（%）", max_digits=5, decimal_places=2, default=50)
    focal_y = models.DecimalField("垂直焦点（%）", max_digits=5, decimal_places=2, default=50)

    class Meta:
        ordering = ["sort_order", "created_at"]
        verbose_name = "作品图片"
        verbose_name_plural = "作品图片"
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

    work = models.ForeignKey(Work, verbose_name="关联作品", null=True, blank=True, on_delete=models.SET_NULL, related_name="public_process_posts")
    title = models.CharField("日志标题", max_length=180)
    title_en = models.CharField("英文日志标题", max_length=180, blank=True)
    slug = models.SlugField("网址标识", max_length=200, unique=True, blank=True)
    summary = models.CharField("日志摘要", max_length=300, blank=True)
    summary_en = models.CharField("英文日志摘要", max_length=300, blank=True)
    body = models.TextField("日志正文", max_length=12000)
    body_en = models.TextField("英文日志正文", max_length=12000, blank=True)
    status = models.CharField("发布状态", max_length=16, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField("发布时间", null=True, blank=True)
    is_dev_data = models.BooleanField("开发测试数据", default=False)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        verbose_name = "公开制作日志"
        verbose_name_plural = "公开制作日志"
        constraints = [
            models.CheckConstraint(
                condition=~Q(status="published") | Q(published_at__isnull=False),
                name="portfolio_published_process_has_timestamp",
            )
        ]

    def clean(self):
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = f"process-{self.id.hex}"
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class PublicProcessImage(UUIDTimeStampedModel):
    post = models.ForeignKey(PublicProcessPost, verbose_name="公开制作日志", on_delete=models.CASCADE, related_name="images")
    media = models.ForeignKey(MediaAsset, verbose_name="媒体文件", on_delete=models.PROTECT, related_name="public_process_images")
    alt_text = models.CharField("替代文字", max_length=240)
    alt_text_en = models.CharField("英文替代文字", max_length=240, blank=True)
    caption = models.CharField("图片说明", max_length=500, blank=True)
    caption_en = models.CharField("英文图片说明", max_length=500, blank=True)
    sort_order = models.PositiveIntegerField("排序", default=0)

    class Meta:
        ordering = ["sort_order", "created_at"]
        verbose_name = "公开制作日志图片"
        verbose_name_plural = "公开制作日志图片"
        constraints = [models.UniqueConstraint(fields=["post", "sort_order"], name="portfolio_unique_process_image_order")]

    def clean(self):
        if self.media_id and (
            self.media.access != MediaAsset.Access.PUBLIC
            or self.media.kind != MediaAsset.Kind.PUBLIC_PROCESS
        ):
            raise ValidationError({"media": "公开制作日志只能使用对应类型的公开媒体。"})


class StudioSetting(UUIDTimeStampedModel):
    key = models.SlugField("设置标识", max_length=32, unique=True, default="default")
    studio_name = models.CharField("工作室名称", max_length=120, default="知行造境")
    studio_name_en = models.CharField("英文名称", max_length=120, default="Zhixing Studio")
    tagline = models.CharField("简介标题", max_length=240, blank=True)
    tagline_en = models.CharField("英文简介标题", max_length=240, blank=True)
    description = models.TextField("工作室说明", max_length=3000, blank=True)
    description_en = models.TextField("英文工作室说明", max_length=3000, blank=True)
    contact_name = models.CharField("联系人", max_length=80, blank=True)
    phone = models.CharField("电话", max_length=32, blank=True)
    wechat = models.CharField("微信", max_length=64, blank=True)
    email = models.EmailField("邮箱", blank=True)
    privacy_notice = models.TextField("隐私说明", max_length=5000, blank=True)
    privacy_notice_en = models.TextField("英文隐私说明", max_length=5000, blank=True)
    is_dev_data = models.BooleanField("开发测试数据", default=False)

    class Meta:
        verbose_name = "工作室设置"
        verbose_name_plural = "工作室设置"

    def __str__(self):
        return self.studio_name
