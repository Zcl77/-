import io
import tempfile

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TransactionTestCase, override_settings

from accounts.models import User
from media_library.models import MediaAsset
from portfolio.models import Category, StudioSetting, Work
from projects.models import ClientProject, PaymentRecord, ProjectMembership


class DevelopmentDataCommandTests(TransactionTestCase):
    def setUp(self):
        self.media_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.media_directory.cleanup)

    @override_settings(DEBUG=False, ENVIRONMENT="development")
    def test_seed_refuses_to_run_when_debug_is_disabled(self):
        with self.assertRaises(CommandError):
            call_command("seed_dev_data", stdout=io.StringIO())

    @override_settings(DEBUG=True, ENVIRONMENT="production")
    def test_seed_refuses_to_run_outside_the_development_environment(self):
        with self.assertRaises(CommandError):
            call_command("seed_dev_data", stdout=io.StringIO())

    def test_seed_and_cleanup_are_explicit_and_leave_real_records_untouched(self):
        real_category = Category.objects.create(
            name="真实保留分类",
            slug="real-category-kept-by-cleanup",
            is_visible=False,
            is_dev_data=False,
        )
        real_setting = StudioSetting.objects.create(
            studio_name="真实保留设置",
            is_dev_data=False,
        )

        with override_settings(
            DEBUG=True,
            ENVIRONMENT="development",
            MEDIA_ROOT=self.media_directory.name,
        ):
            call_command("seed_dev_data", stdout=io.StringIO())

            customer = User.objects.get(username="local_dev_customer")
            project = ClientProject.objects.get(is_dev_data=True)
            asset = MediaAsset.objects.filter(is_dev_data=True).first()
            self.assertTrue(customer.is_dev_data)
            self.assertTrue(customer.must_change_password)
            self.assertTrue(ProjectMembership.objects.filter(project=project, user=customer).exists())
            self.assertTrue(Work.objects.filter(status=Work.Status.PUBLISHED, is_dev_data=True).exists())
            self.assertIsNotNone(asset)
            self.assertTrue(asset.original.storage.exists(asset.original.name))
            payment = PaymentRecord.objects.create(
                order=project.order,
                payment_type=PaymentRecord.PaymentType.DEPOSIT,
                amount="3888.00",
                status=PaymentRecord.Status.SUCCEEDED,
                mock_transaction_id="MOCK-DEV-CLEANUP",
            )

            with self.assertRaises(CommandError):
                call_command("seed_dev_data", stdout=io.StringIO())

            preview = io.StringIO()
            call_command("clean_dev_data", stdout=preview)
            self.assertIn("仅预检", preview.getvalue())
            self.assertTrue(User.objects.filter(is_dev_data=True).exists())

            call_command("clean_dev_data", "--apply", stdout=io.StringIO())

        self.assertFalse(User.objects.filter(is_dev_data=True).exists())
        self.assertFalse(MediaAsset.objects.filter(is_dev_data=True).exists())
        self.assertFalse(PaymentRecord.objects.filter(pk=payment.pk).exists())
        self.assertTrue(Category.objects.filter(pk=real_category.pk).exists())
        self.assertTrue(StudioSetting.objects.filter(pk=real_setting.pk).exists())
