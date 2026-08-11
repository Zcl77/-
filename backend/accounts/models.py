import uuid

from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models

from common.models import UUIDTimeStampedModel


class User(AbstractUser):
    class Role(models.TextChoices):
        STAFF = "staff", "工作室员工"
        CUSTOMER = "customer", "客户"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.CUSTOMER)
    must_change_password = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.is_staff or self.is_superuser:
            self.role = self.Role.STAFF
        super().save(*args, **kwargs)


class CustomerProfile(UUIDTimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="customer_profile")
    display_name = models.CharField(max_length=80)
    phone = models.CharField(max_length=32, blank=True)
    wechat = models.CharField(max_length=64, blank=True)
    company = models.CharField(max_length=120, blank=True)
    internal_notes = models.TextField(blank=True, max_length=2000)
    is_active = models.BooleanField(default=True)
    is_dev_data = models.BooleanField(default=False)

    class Meta:
        ordering = ["display_name", "created_at"]

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
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="security_events")
    event = models.CharField(max_length=32, choices=Event.choices)
    success = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        timestamp = self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else "unsaved"
        return f"{self.event} @ {timestamp}"
