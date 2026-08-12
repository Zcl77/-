import logging

from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.dispatch import receiver

from .models import SecurityEvent


logger = logging.getLogger("zhixing.security")


@receiver(user_logged_in)
def log_login(sender, request, user, **kwargs):
    logger.info("auth.login user_id=%s", user.pk)
    SecurityEvent.objects.create(user=user, event=SecurityEvent.Event.LOGIN, success=True)


@receiver(user_logged_out)
def log_logout(sender, request, user, **kwargs):
    logger.info("auth.logout user_id=%s", getattr(user, "pk", None))
    SecurityEvent.objects.create(user=user if getattr(user, "pk", None) else None, event=SecurityEvent.Event.LOGOUT, success=True)


@receiver(user_login_failed)
def log_login_failed(sender, credentials, request, **kwargs):
    logger.warning("auth.login_failed")
    SecurityEvent.objects.create(event=SecurityEvent.Event.LOGIN_FAILED, success=False)
