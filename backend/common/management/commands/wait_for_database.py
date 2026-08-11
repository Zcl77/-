import time

from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = "Wait until the configured database accepts connections."

    def handle(self, *args, **options):
        self.stdout.write("Waiting for database...")
        for attempt in range(1, 31):
            try:
                connections["default"].ensure_connection()
            except OperationalError:
                if attempt == 30:
                    raise
                time.sleep(2)
            else:
                self.stdout.write(self.style.SUCCESS("Database is available."))
                return
