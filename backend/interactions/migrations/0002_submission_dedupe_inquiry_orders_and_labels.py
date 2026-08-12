import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_username_length_and_chinese_names"),
        ("interactions", "0001_initial"),
        ("projects", "0004_require_message_dedupe"),
    ]

    operations = [
        migrations.AddField(model_name="review", name="submission_fingerprint", field=models.CharField(db_index=True, editable=False, max_length=64, null=True, verbose_name="防重复指纹")),
        migrations.AddField(model_name="review", name="submission_bucket", field=models.PositiveBigIntegerField(editable=False, null=True, verbose_name="防重复时间段")),
        migrations.AddField(model_name="review", name="idempotency_key", field=models.CharField(blank=True, editable=False, max_length=64, null=True, unique=True, verbose_name="幂等标识")),
        migrations.AddField(model_name="inquiry", name="submission_fingerprint", field=models.CharField(db_index=True, editable=False, max_length=64, null=True, verbose_name="防重复指纹")),
        migrations.AddField(model_name="inquiry", name="submission_bucket", field=models.PositiveBigIntegerField(editable=False, null=True, verbose_name="防重复时间段")),
        migrations.AddField(model_name="inquiry", name="idempotency_key", field=models.CharField(blank=True, editable=False, max_length=64, null=True, unique=True, verbose_name="幂等标识")),
        migrations.AddField(model_name="inquiry", name="customer", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="inquiries", to="accounts.customerprofile", verbose_name="关联客户")),
        migrations.AddField(model_name="inquiry", name="order", field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="source_inquiry", to="projects.order", verbose_name="关联订单")),
        migrations.AlterModelOptions(name="review", options={"ordering": ["-created_at"], "verbose_name": "评价", "verbose_name_plural": "评价"}),
        migrations.AlterModelOptions(name="inquiry", options={"ordering": ["-created_at"], "verbose_name": "询价", "verbose_name_plural": "询价"}),
        migrations.AlterModelOptions(name="inquiryattachment", options={"ordering": ["sort_order", "created_at"], "verbose_name": "询价附件", "verbose_name_plural": "询价附件"}),
        migrations.AlterField(model_name="review", name="work", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reviews", to="portfolio.work", verbose_name="关联作品")),
        migrations.AlterField(model_name="review", name="reviewer_name", field=models.CharField(max_length=80, verbose_name="评价人")),
        migrations.AlterField(model_name="review", name="project_name", field=models.CharField(max_length=160, verbose_name="评价对象")),
        migrations.AlterField(model_name="review", name="rating", field=models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)], verbose_name="评分")),
        migrations.AlterField(model_name="review", name="comment", field=models.TextField(max_length=2000, verbose_name="评价内容")),
        migrations.AlterField(model_name="review", name="status", field=models.CharField(choices=[("pending", "待审核"), ("approved", "已批准"), ("rejected", "已拒绝")], default="pending", max_length=16, verbose_name="审核状态")),
        migrations.AlterField(model_name="review", name="moderated_by", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="moderated_reviews", to=settings.AUTH_USER_MODEL, verbose_name="审核人")),
        migrations.AlterField(model_name="review", name="moderated_at", field=models.DateTimeField(blank=True, null=True, verbose_name="审核时间")),
        migrations.AlterField(model_name="review", name="is_dev_data", field=models.BooleanField(default=False, verbose_name="开发测试数据")),
        migrations.AlterField(model_name="inquiry", name="name", field=models.CharField(max_length=80, verbose_name="联系人姓名")),
        migrations.AlterField(model_name="inquiry", name="contact_type", field=models.CharField(choices=[("phone", "手机号"), ("wechat", "微信")], max_length=16, verbose_name="联系方式类型")),
        migrations.AlterField(model_name="inquiry", name="contact_value", field=models.CharField(max_length=80, verbose_name="联系方式")),
        migrations.AlterField(model_name="inquiry", name="project_type", field=models.CharField(max_length=100, verbose_name="项目类型")),
        migrations.AlterField(model_name="inquiry", name="scale", field=models.CharField(blank=True, max_length=40, verbose_name="模型比例")),
        migrations.AlterField(model_name="inquiry", name="budget_range", field=models.CharField(blank=True, max_length=80, verbose_name="预算范围")),
        migrations.AlterField(model_name="inquiry", name="expected_delivery_date", field=models.DateField(blank=True, null=True, verbose_name="期望交付日期")),
        migrations.AlterField(model_name="inquiry", name="description", field=models.TextField(max_length=5000, verbose_name="需求说明")),
        migrations.AlterField(model_name="inquiry", name="privacy_consent", field=models.BooleanField(default=False, verbose_name="已同意隐私说明")),
        migrations.AlterField(model_name="inquiry", name="status", field=models.CharField(choices=[("new", "新询价"), ("contacted", "已联系"), ("closed", "已关闭"), ("spam", "垃圾信息")], default="new", max_length=16, verbose_name="处理状态")),
        migrations.AlterField(model_name="inquiry", name="assigned_to", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_inquiries", to=settings.AUTH_USER_MODEL, verbose_name="负责人")),
        migrations.AlterField(model_name="inquiry", name="is_dev_data", field=models.BooleanField(default=False, verbose_name="开发测试数据")),
        migrations.AlterField(model_name="inquiryattachment", name="inquiry", field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attachments", to="interactions.inquiry", verbose_name="询价")),
        migrations.AlterField(model_name="inquiryattachment", name="media", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="inquiry_attachments", to="media_library.mediaasset", verbose_name="参考图片")),
        migrations.AlterField(model_name="inquiryattachment", name="sort_order", field=models.PositiveIntegerField(default=0, verbose_name="排序")),
        migrations.AddConstraint(model_name="review", constraint=models.UniqueConstraint(fields=("submission_fingerprint", "submission_bucket"), name="interactions_review_short_dedupe")),
        migrations.AddConstraint(model_name="inquiry", constraint=models.UniqueConstraint(fields=("submission_fingerprint", "submission_bucket"), name="interactions_inquiry_short_dedupe")),
    ]
