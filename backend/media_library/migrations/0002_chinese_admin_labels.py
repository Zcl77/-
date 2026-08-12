import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
import media_library.models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_username_length_and_chinese_names"),
        ("media_library", "0001_initial"),
    ]

    operations = [
        migrations.AlterModelOptions(name="mediaasset", options={"ordering": ["-created_at"], "verbose_name": "媒体文件", "verbose_name_plural": "媒体文件"}),
        migrations.AlterField(model_name="mediaasset", name="access", field=models.CharField(choices=[("public", "公开"), ("private", "私人")], max_length=16, verbose_name="访问范围")),
        migrations.AlterField(model_name="mediaasset", name="kind", field=models.CharField(choices=[("work", "作品"), ("public_process", "公开制作日志"), ("progress", "客户进度"), ("inquiry", "询价附件"), ("studio", "工作室资料")], max_length=32, verbose_name="媒体用途")),
        migrations.AlterField(model_name="mediaasset", name="original", field=models.ImageField(max_length=500, upload_to=media_library.models.original_upload_path, verbose_name="原始图片")),
        migrations.AlterField(model_name="mediaasset", name="display", field=models.ImageField(blank=True, max_length=500, upload_to=media_library.models.display_upload_path, verbose_name="展示图片")),
        migrations.AlterField(model_name="mediaasset", name="thumbnail", field=models.ImageField(blank=True, max_length=500, upload_to=media_library.models.thumbnail_upload_path, verbose_name="缩略图")),
        migrations.AlterField(model_name="mediaasset", name="original_name", field=models.CharField(blank=True, editable=False, max_length=255, verbose_name="原文件名")),
        migrations.AlterField(model_name="mediaasset", name="declared_content_type", field=models.CharField(blank=True, editable=False, max_length=100, verbose_name="上传声明类型")),
        migrations.AlterField(model_name="mediaasset", name="detected_content_type", field=models.CharField(blank=True, editable=False, max_length=100, verbose_name="实际文件类型")),
        migrations.AlterField(model_name="mediaasset", name="size_bytes", field=models.PositiveBigIntegerField(default=0, editable=False, verbose_name="文件大小（字节）")),
        migrations.AlterField(model_name="mediaasset", name="width", field=models.PositiveIntegerField(default=0, editable=False, verbose_name="宽度")),
        migrations.AlterField(model_name="mediaasset", name="height", field=models.PositiveIntegerField(default=0, editable=False, verbose_name="高度")),
        migrations.AlterField(model_name="mediaasset", name="sha256", field=models.CharField(blank=True, db_index=True, editable=False, max_length=64, verbose_name="文件指纹")),
        migrations.AlterField(model_name="mediaasset", name="uploaded_by", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="uploaded_media", to=settings.AUTH_USER_MODEL, verbose_name="上传人")),
        migrations.AlterField(model_name="mediaasset", name="is_dev_data", field=models.BooleanField(default=False, verbose_name="开发测试数据")),
    ]
