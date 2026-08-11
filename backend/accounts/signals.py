import logging

from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver


logger = logging.getLogger("zhixing.security")


@receiver(user_logged_in)
def log_login(sender, request, user, **kwargs):
    logger.info("auth.login user_id=%s", user.pk)


@receiver(user_logged_out)
def log_logout(sender, request, user, **kwargs):
    logger.info("auth.logout user_id=%s", getattr(user, "pk", None))
