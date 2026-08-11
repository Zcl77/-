from django.core.management.base import BaseCommand

from common.dev_data import clear_development_data, require_development_environment


class Command(BaseCommand):
    help = "Delete only records and media explicitly marked as local development data."

    def handle(self, *args, **options):
        require_development_environment()
        counts = clear_development_data()
        summary = "，".join(f"{label} {count}" for label, count in counts.items())
        self.stdout.write(self.style.SUCCESS(f"本地开发数据已清理：{summary}。"))
