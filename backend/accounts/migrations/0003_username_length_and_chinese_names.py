import django.contrib.auth.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def refuse_long_usernames(apps, schema_editor):
    user_model = apps.get_model("accounts", "User")
    count = user_model.objects.filter(username__regex=r"^.{19,}$").count()
    if count:
        raise RuntimeError(
            f"检测到 {count} 个用户名超过 18 个字符。迁移已安全停止，请先人工决定新用户名。"
        )


class Migration(migrations.Migration):
    dependencies = [("accounts", "0002_user_is_dev_data")]

    operations = [
        migrations.AlterModelOptions(
            name="user",
            options={"verbose_name": "用户账号", "verbose_name_plural": "用户账号"},
        ),
        migrations.AlterModelOptions(
            name="customerprofile",
            options={
                "ordering": ["display_name", "created_at"],
                "verbose_name": "客户资料",
                "verbose_name_plural": "客户资料",
            },
        ),
        migrations.AlterModelOptions(
            name="securityevent",
            options={
                "ordering": ["-created_at"],
                "verbose_name": "安全日志",
                "verbose_name_plural": "安全日志",
            },
        ),
        migrations.RunPython(refuse_long_usernames, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="username",
            field=models.CharField(
                error_messages={"unique": "该用户名已被使用。"},
                help_text="最多 18 个字符，可使用字母、数字及 @/./+/-/_。",
                max_length=18,
                unique=True,
                validators=[django.contrib.auth.validators.UnicodeUsernameValidator()],
                verbose_name="用户名",
            ),
        ),
        migrations.AlterField(model_name="user", name="role", field=models.CharField(choices=[("staff", "工作室员工"), ("customer", "客户")], default="customer", max_length=16, verbose_name="账号角色")),
        migrations.AlterField(model_name="user", name="must_change_password", field=models.BooleanField(default=True, verbose_name="下次登录必须修改密码")),
        migrations.AlterField(model_name="user", name="is_dev_data", field=models.BooleanField(default=False, verbose_name="开发测试数据")),
        migrations.AlterField(model_name="customerprofile", name="user", field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="customer_profile", to=settings.AUTH_USER_MODEL, verbose_name="用户账号")),
        migrations.AlterField(model_name="customerprofile", name="display_name", field=models.CharField(max_length=80, verbose_name="客户称呼")),
        migrations.AlterField(model_name="customerprofile", name="phone", field=models.CharField(blank=True, max_length=32, verbose_name="电话")),
        migrations.AlterField(model_name="customerprofile", name="wechat", field=models.CharField(blank=True, max_length=64, verbose_name="微信")),
        migrations.AlterField(model_name="customerprofile", name="company", field=models.CharField(blank=True, max_length=120, verbose_name="单位")),
        migrations.AlterField(model_name="customerprofile", name="internal_notes", field=models.TextField(blank=True, max_length=2000, verbose_name="内部备注")),
        migrations.AlterField(model_name="customerprofile", name="is_active", field=models.BooleanField(default=True, verbose_name="客户资料有效")),
        migrations.AlterField(model_name="customerprofile", name="is_dev_data", field=models.BooleanField(default=False, verbose_name="开发测试数据")),
        migrations.AlterField(model_name="securityevent", name="user", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="security_events", to=settings.AUTH_USER_MODEL, verbose_name="用户账号")),
        migrations.AlterField(model_name="securityevent", name="event", field=models.CharField(choices=[("login", "登录"), ("login_failed", "登录失败"), ("logout", "退出"), ("password_changed", "修改密码")], max_length=32, verbose_name="事件")),
        migrations.AlterField(model_name="securityevent", name="success", field=models.BooleanField(default=True, verbose_name="成功")),
        migrations.AlterField(model_name="securityevent", name="created_at", field=models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="发生时间")),
    ]
