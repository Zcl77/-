import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        STAFF = "staff", "工作室员工"
        CUSTOMER = "customer", "客户"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.CUSTOMER)
    must_change_password = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.is_staff or self.is_superuser:
            self.role = self.Role.STAFF
        super().save(*args, **kwargs)
