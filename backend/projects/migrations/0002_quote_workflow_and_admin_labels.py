import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def initialize_existing_quotes(apps, schema_editor):
    order_model = apps.get_model("projects", "Order")
    order_model.objects.filter(confirmation_status="proposed").update(
        quote_decision="pending",
        quoted_at=models.F("updated_at"),
    )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_username_length_and_chinese_names"),
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="quoted_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="报价时间"),
        ),
        migrations.AddField(
            model_name="order",
            name="quote_decision",
            field=models.CharField(
                choices=[
                    ("none", "尚未报价"),
                    ("pending", "等待客户决定"),
                    ("accepted", "客户已接受"),
                    ("rejected", "客户已拒绝"),
                ],
                default="none",
                max_length=16,
                verbose_name="客户报价决定",
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="quote_decision_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="客户决定时间"),
        ),
        migrations.RunPython(initialize_existing_quotes, migrations.RunPython.noop),
        migrations.AddField(
            model_name="projectmessage",
            name="idempotency_key",
            field=models.CharField(blank=True, editable=False, max_length=64, null=True, unique=True, verbose_name="幂等标识"),
        ),
        migrations.AddField(model_name="projectmessage", name="submission_fingerprint", field=models.CharField(db_index=True, editable=False, max_length=64, null=True, verbose_name="防重复指纹")),
        migrations.AddField(model_name="projectmessage", name="submission_bucket", field=models.PositiveBigIntegerField(editable=False, null=True, verbose_name="防重复时间段")),
        migrations.AlterModelOptions(name="order", options={"ordering": ["-created_at"], "verbose_name": "订单", "verbose_name_plural": "订单"}),
        migrations.AlterModelOptions(name="clientproject", options={"ordering": ["-updated_at", "name"], "verbose_name": "客户项目", "verbose_name_plural": "客户项目"}),
        migrations.AlterModelOptions(name="projectmembership", options={"ordering": ["created_at"], "verbose_name": "项目成员", "verbose_name_plural": "项目成员"}),
        migrations.AlterModelOptions(name="productionstage", options={"ordering": ["sort_order", "created_at"], "verbose_name": "制作阶段", "verbose_name_plural": "制作阶段"}),
        migrations.AlterModelOptions(name="progressupdate", options={"ordering": ["-published_at", "-created_at"], "verbose_name": "进度更新", "verbose_name_plural": "进度更新"}),
        migrations.AlterModelOptions(name="progressimage", options={"ordering": ["sort_order", "created_at"], "verbose_name": "进度图片", "verbose_name_plural": "进度图片"}),
        migrations.AlterModelOptions(name="progressreceipt", options={"verbose_name": "进度确认记录", "verbose_name_plural": "进度确认记录"}),
        migrations.AlterModelOptions(name="projectmessage", options={"ordering": ["created_at"], "verbose_name": "项目留言", "verbose_name_plural": "项目留言"}),
        migrations.AlterModelOptions(name="projectmessagereceipt", options={"verbose_name": "留言阅读记录", "verbose_name_plural": "留言阅读记录"}),
        migrations.AlterField(model_name="order", name="order_number", field=models.CharField(max_length=64, unique=True, verbose_name="订单编号")),
        migrations.AlterField(model_name="order", name="customer", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="orders", to="accounts.customerprofile", verbose_name="客户")),
        migrations.AlterField(model_name="order", name="order_type", field=models.CharField(max_length=80, verbose_name="订单类型")),
        migrations.AlterField(model_name="order", name="confirmation_status", field=models.CharField(choices=[("inquiry", "询价中"), ("proposed", "已报价"), ("confirmed", "已确认"), ("cancelled", "已取消")], default="inquiry", max_length=16, verbose_name="报价确认状态")),
        migrations.AlterField(model_name="order", name="agreed_amount", field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True, verbose_name="报价金额")),
        migrations.AlterField(model_name="order", name="deposit_status", field=models.CharField(choices=[("not_recorded", "未记录"), ("pending", "待线下确认"), ("recorded", "已人工记录"), ("waived", "无需收取")], default="not_recorded", max_length=16, verbose_name="定金状态")),
        migrations.AlterField(model_name="order", name="final_payment_status", field=models.CharField(choices=[("not_recorded", "未记录"), ("pending", "待线下确认"), ("recorded", "已人工记录"), ("waived", "无需收取")], default="not_recorded", max_length=16, verbose_name="尾款状态")),
        migrations.AlterField(model_name="order", name="delivery_status", field=models.CharField(choices=[("not_ready", "未交付"), ("ready", "待交付"), ("delivered", "已交付")], default="not_ready", max_length=16, verbose_name="交付状态")),
        migrations.AlterField(model_name="order", name="notes", field=models.TextField(blank=True, max_length=5000, verbose_name="内部备注")),
        migrations.AlterField(model_name="order", name="is_dev_data", field=models.BooleanField(default=False, verbose_name="开发测试数据")),
        migrations.AlterField(model_name="clientproject", name="order", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="projects", to="projects.order", verbose_name="订单")),
        migrations.AlterField(model_name="clientproject", name="name", field=models.CharField(max_length=180, verbose_name="项目名称")),
        migrations.AlterField(model_name="clientproject", name="description", field=models.TextField(blank=True, max_length=10000, verbose_name="项目说明")),
        migrations.AlterField(model_name="clientproject", name="status", field=models.CharField(choices=[("planning", "筹备中"), ("active", "制作中"), ("paused", "已暂停"), ("review", "待验收"), ("completed", "已完成"), ("cancelled", "已取消")], default="planning", max_length=16, verbose_name="项目状态")),
        migrations.AlterField(model_name="clientproject", name="completion_percent", field=models.PositiveSmallIntegerField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)], verbose_name="完成百分比")),
        migrations.AlterField(model_name="clientproject", name="next_plan", field=models.CharField(blank=True, max_length=500, verbose_name="下一步计划")),
        migrations.AlterField(model_name="clientproject", name="expected_next_update_at", field=models.DateTimeField(blank=True, null=True, verbose_name="预计下次更新时间")),
        migrations.AlterField(model_name="clientproject", name="manager", field=models.ForeignKey(blank=True, limit_choices_to={"role": "staff"}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="managed_projects", to=settings.AUTH_USER_MODEL, verbose_name="项目负责人")),
        migrations.AlterField(model_name="clientproject", name="current_stage", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="current_for_projects", to="projects.productionstage", verbose_name="当前制作阶段")),
        migrations.AlterField(model_name="clientproject", name="is_dev_data", field=models.BooleanField(default=False, verbose_name="开发测试数据")),
        migrations.AlterField(model_name="projectmembership", name="project", field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memberships", to="projects.clientproject", verbose_name="客户项目")),
        migrations.AlterField(model_name="projectmembership", name="user", field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="project_memberships", to=settings.AUTH_USER_MODEL, verbose_name="客户账号")),
        migrations.AlterField(model_name="projectmembership", name="role", field=models.CharField(choices=[("owner", "主要客户"), ("viewer", "查看成员")], default="viewer", max_length=16, verbose_name="成员角色")),
        migrations.AlterField(model_name="projectmembership", name="is_active", field=models.BooleanField(default=True, verbose_name="允许访问")),
        migrations.AlterField(model_name="productionstage", name="project", field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="stages", to="projects.clientproject", verbose_name="客户项目")),
        migrations.AlterField(model_name="productionstage", name="name", field=models.CharField(max_length=120, verbose_name="阶段名称")),
        migrations.AlterField(model_name="productionstage", name="sort_order", field=models.PositiveIntegerField(default=0, verbose_name="排序")),
        migrations.AlterField(model_name="productionstage", name="status", field=models.CharField(choices=[("pending", "待开始"), ("active", "进行中"), ("completed", "已完成"), ("skipped", "已跳过")], default="pending", max_length=16, verbose_name="阶段状态")),
        migrations.AlterField(model_name="productionstage", name="description", field=models.CharField(blank=True, max_length=500, verbose_name="阶段说明")),
        migrations.AlterField(model_name="productionstage", name="started_at", field=models.DateTimeField(blank=True, null=True, verbose_name="开始时间")),
        migrations.AlterField(model_name="productionstage", name="completed_at", field=models.DateTimeField(blank=True, null=True, verbose_name="完成时间")),
        migrations.AlterField(model_name="progressupdate", name="project", field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="progress_updates", to="projects.clientproject", verbose_name="客户项目")),
        migrations.AlterField(model_name="progressupdate", name="stage", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="updates", to="projects.productionstage", verbose_name="制作阶段")),
        migrations.AlterField(model_name="progressupdate", name="title", field=models.CharField(max_length=180, verbose_name="进度标题")),
        migrations.AlterField(model_name="progressupdate", name="body", field=models.TextField(max_length=12000, verbose_name="进度内容")),
        migrations.AlterField(model_name="progressupdate", name="next_plan", field=models.CharField(blank=True, max_length=500, verbose_name="下一步计划")),
        migrations.AlterField(model_name="progressupdate", name="expected_next_update_at", field=models.DateTimeField(blank=True, null=True, verbose_name="预计下次更新时间")),
        migrations.AlterField(model_name="progressupdate", name="status", field=models.CharField(choices=[("draft", "草稿"), ("published", "已发布")], default="draft", max_length=16, verbose_name="发布状态")),
        migrations.AlterField(model_name="progressupdate", name="requires_acknowledgement", field=models.BooleanField(default=False, verbose_name="需要客户确认")),
        migrations.AlterField(model_name="progressupdate", name="published_at", field=models.DateTimeField(blank=True, null=True, verbose_name="发布时间")),
        migrations.AlterField(model_name="progressupdate", name="author", field=models.ForeignKey(limit_choices_to={"role": "staff"}, on_delete=django.db.models.deletion.PROTECT, related_name="authored_progress_updates", to=settings.AUTH_USER_MODEL, verbose_name="发布人")),
        migrations.AlterField(model_name="progressupdate", name="is_dev_data", field=models.BooleanField(default=False, verbose_name="开发测试数据")),
        migrations.AlterField(model_name="progressimage", name="update", field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="images", to="projects.progressupdate", verbose_name="进度更新")),
        migrations.AlterField(model_name="progressimage", name="media", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="progress_images", to="media_library.mediaasset", verbose_name="媒体文件")),
        migrations.AlterField(model_name="progressimage", name="caption", field=models.CharField(blank=True, max_length=500, verbose_name="图片说明")),
        migrations.AlterField(model_name="progressimage", name="alt_text", field=models.CharField(max_length=240, verbose_name="替代文字")),
        migrations.AlterField(model_name="progressimage", name="sort_order", field=models.PositiveIntegerField(default=0, verbose_name="排序")),
        migrations.AlterField(model_name="progressreceipt", name="update", field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="receipts", to="projects.progressupdate", verbose_name="进度更新")),
        migrations.AlterField(model_name="progressreceipt", name="user", field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="progress_receipts", to=settings.AUTH_USER_MODEL, verbose_name="客户账号")),
        migrations.AlterField(model_name="progressreceipt", name="viewed_at", field=models.DateTimeField(blank=True, null=True, verbose_name="查看时间")),
        migrations.AlterField(model_name="progressreceipt", name="acknowledged_at", field=models.DateTimeField(blank=True, null=True, verbose_name="确认时间")),
        migrations.AlterField(model_name="projectmessage", name="project", field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="projects.clientproject", verbose_name="客户项目")),
        migrations.AlterField(model_name="projectmessage", name="author", field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="project_messages", to=settings.AUTH_USER_MODEL, verbose_name="留言人")),
        migrations.AlterField(model_name="projectmessage", name="body", field=models.TextField(max_length=3000, verbose_name="留言内容")),
        migrations.AlterField(model_name="projectmessage", name="parent", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="replies", to="projects.projectmessage", verbose_name="回复的留言")),
        migrations.AlterField(model_name="projectmessage", name="is_dev_data", field=models.BooleanField(default=False, verbose_name="开发测试数据")),
        migrations.AlterField(model_name="projectmessagereceipt", name="message", field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="receipts", to="projects.projectmessage", verbose_name="项目留言")),
        migrations.AlterField(model_name="projectmessagereceipt", name="user", field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="message_receipts", to=settings.AUTH_USER_MODEL, verbose_name="查看账号")),
        migrations.AlterField(model_name="projectmessagereceipt", name="read_at", field=models.DateTimeField(blank=True, null=True, verbose_name="阅读时间")),
        migrations.AddConstraint(model_name="projectmessage", constraint=models.UniqueConstraint(fields=("submission_fingerprint", "submission_bucket"), name="projects_message_short_dedupe")),
    ]
