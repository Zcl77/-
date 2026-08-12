import importlib

from django.test import SimpleTestCase


class UsernameMigrationSafetyTests(SimpleTestCase):
    def test_migration_refuses_to_truncate_long_usernames(self):
        migration = importlib.import_module("accounts.migrations.0003_username_length_and_chinese_names")

        class FakeQuerySet:
            def count(self):
                return 2

        class FakeUserManager:
            def filter(self, **kwargs):
                self.filter_arguments = kwargs
                return FakeQuerySet()

        fake_manager = FakeUserManager()

        class FakeApps:
            def get_model(self, app_label, model_name):
                self.requested_model = (app_label, model_name)
                return type("FakeUser", (), {"objects": fake_manager})

        apps = FakeApps()
        with self.assertRaisesRegex(RuntimeError, "2 个用户名超过 18 个字符"):
            migration.refuse_long_usernames(apps, None)

        self.assertEqual(apps.requested_model, ("accounts", "User"))
        self.assertEqual(fake_manager.filter_arguments, {"username__regex": r"^.{19,}$"})
