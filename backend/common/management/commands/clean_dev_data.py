from django.core.management.base import BaseCommand

from common.dev_data import clear_development_data, development_data_counts, require_development_environment


class Command(BaseCommand):
    help = "Preview local development data cleanup; pass --apply to delete marked records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="实际删除明确标记为开发测试数据的记录和媒体文件。",
        )

    def handle(self, *args, **options):
        require_development_environment()
        counts = clear_development_data() if options["apply"] else development_data_counts()
        summary = "，".join(f"{label} {count}" for label, count in counts.items())
        if options["apply"]:
            self.stdout.write(self.style.SUCCESS(f"本地开发数据已清理：{summary}。"))
        else:
            self.stdout.write(f"仅预检（未删除任何数据）：{summary}。如需执行，请明确追加 --apply。")
