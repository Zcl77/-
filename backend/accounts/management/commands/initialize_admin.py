from getpass import getpass

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User


class Command(BaseCommand):
    help = "Interactively create the first administrator without exposing a password in shell history."

    def add_arguments(self, parser):
        parser.add_argument("--username")
        parser.add_argument("--email", default="")

    @transaction.atomic
    def handle(self, *args, **options):
        username = (options["username"] or input("管理员用户名: ")).strip()
        if not username:
            raise CommandError("用户名不能为空。")
        if User.objects.filter(username=username).exists():
            raise CommandError("该用户名已经存在。")

        password = getpass("管理员密码: ")
        confirmation = getpass("再次输入密码: ")
        if password != confirmation:
            raise CommandError("两次输入的密码不一致。")

        candidate = User(
            username=username,
            email=options["email"],
            role=User.Role.STAFF,
            is_staff=True,
            is_superuser=True,
            must_change_password=False,
        )
        try:
            validate_password(password, user=candidate)
            candidate.full_clean(exclude=["password"])
        except ValidationError as exc:
            raise CommandError("；".join(exc.messages)) from exc

        candidate.set_password(password)
        candidate.save()
        self.stdout.write(self.style.SUCCESS(f"管理员 {username} 已创建。"))
