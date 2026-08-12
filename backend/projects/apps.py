from django.apps import AppConfig


class ProjectsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "projects"
    verbose_name = "客户项目与订单"

    def ready(self):
        from . import signals  # noqa: F401
