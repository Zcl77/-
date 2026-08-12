import uuid

from django.contrib.auth.models import AbstractUser
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError
from django.db import models

from common.models import UUIDTimeStampedModel


class User(AbstractUser):
    class Role(models.TextChoices):
        STAFF = "staff", "工作室员工"
        CUSTOMER = "customer", "客户"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(
        "用户名",
        max_length=18,
        unique=True,
        help_text="最多 18 个字符，可使用字母、数字及 @/./+/-/_。",
        validators=[UnicodeUsernameValidator()],
        error_messages={"unique": "该用户名已被使用。"},
    )
    role = models.CharField("账号角色", max_length=16, choices=Role.choices, default=Role.CUSTOMER)
    must_change_password = models.BooleanField("下次登录必须修改密码", default=True)
    is_dev_data = models.BooleanField("开发测试数据", default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "用户账号"
        verbose_name_plural = "用户账号"

    def save(self, *args, **kwargs):
        if self.is_staff or self.is_superuser:
            self.role = self.Role.STAFF
        super().save(*args, **kwargs)


class CustomerProfile(UUIDTimeStampedModel):
    user = models.OneToOneField(User, verbose_name="用户账号", on_delete=models.CASCADE, related_name="customer_profile")
    display_name = models.CharField("客户称呼", max_length=80)
    phone = models.CharField("电话", max_length=32, blank=True)
    wechat = models.CharField("微信", max_length=64, blank=True)
    company = models.CharField("单位", max_length=120, blank=True)
    internal_notes = models.TextField("内部备注", blank=True, max_length=2000)
    is_active = models.BooleanField("客户资料有效", default=True)
    is_dev_data = models.BooleanField("开发测试数据", default=False)

    class Meta:
        ordering = ["display_name", "created_at"]
        verbose_name = "客户资料"
        verbose_name_plural = "客户资料"

    def clean(self):
        if self.user_id and self.user.role != User.Role.CUSTOMER:
            raise ValidationError({"user": "客户资料只能绑定客户角色账号。"})

    def __str__(self):
        return self.display_name


class SecurityEvent(models.Model):
    class Event(models.TextChoices):
        LOGIN = "login", "登录"
        LOGIN_FAILED = "login_failed", "登录失败"
        LOGOUT = "logout", "退出"
        PASSWORD_CHANGED = "password_changed", "修改密码"

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, verbose_name="用户账号", null=True, blank=True, on_delete=models.SET_NULL, related_name="security_events")
    event = models.CharField("事件", max_length=32, choices=Event.choices)
    success = models.BooleanField("成功", default=True)
    created_at = models.DateTimeField("发生时间", auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "安全日志"
        verbose_name_plural = "安全日志"

    def __str__(self):
        timestamp = self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else "unsaved"
        return f"{self.event} @ {timestamp}"
