import tempfile

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import CustomerProfile, User
from common.tests.utils import TEST_PASSWORD, image_upload
from media_library.models import MediaAsset

from projects.models import ClientProject, Order, ProgressImage, ProgressUpdate, ProjectMessage


class CustomerObjectPermissionTests(TestCase):
    def setUp(self):
        self.media_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.media_directory.cleanup)
        self.settings_override = override_settings(
            MEDIA_ROOT=self.media_directory.name,
            USE_X_ACCEL_REDIRECT=False,
        )
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)

        self.staff = User.objects.create_superuser(
            username="staff-permission-test",
            password=TEST_PASSWORD,
            must_change_password=False,
        )
        self.customer_a, profile_a = self.create_customer("customer-a", "客户甲")
        self.customer_b, profile_b = self.create_customer("customer-b", "客户乙")
        self.order_a = Order.objects.create(
            order_number="TEST-A-001",
            customer=profile_a,
            order_type="测试订单",
            is_dev_data=True,
        )
        self.order_b = Order.objects.create(
            order_number="TEST-B-001",
            customer=profile_b,
            order_type="测试订单",
            is_dev_data=True,
        )
        self.project_a = ClientProject.objects.create(order=self.order_a, name="甲的项目", is_dev_data=True)
        self.project_b = ClientProject.objects.create(order=self.order_b, name="乙的项目", is_dev_data=True)
        self.update_b = ProgressUpdate.objects.create(
            project=self.project_b,
            stage=self.project_b.stages.first(),
            title="乙的私人进度",
            body="仅客户乙可以看到。",
            status=ProgressUpdate.Status.PUBLISHED,
            author=self.staff,
            is_dev_data=True,
        )
        self.private_asset_b = MediaAsset.objects.create(
            access=MediaAsset.Access.PRIVATE,
            kind=MediaAsset.Kind.PROGRESS,
            original=image_upload("private-b.png"),
            uploaded_by=self.staff,
            is_dev_data=True,
        )
        ProgressImage.objects.create(
            update=self.update_b,
            media=self.private_asset_b,
            alt_text="客户乙私人进度图片",
        )
        self.message_b = ProjectMessage.objects.create(
            project=self.project_b,
            author=self.customer_b,
            body="客户乙的私人留言",
            is_dev_data=True,
        )

    def create_customer(self, username, display_name):
        user = User.objects.create_user(
            username=username,
            password=TEST_PASSWORD,
            role=User.Role.CUSTOMER,
            must_change_password=False,
        )
        profile = CustomerProfile.objects.create(
            user=user,
            display_name=display_name,
            is_dev_data=True,
        )
        return user, profile

    def logged_in_client(self, user):
        client = APIClient()
        client.force_login(user)
        return client

    def test_customer_lists_only_owned_orders_and_explicit_projects(self):
        client = self.logged_in_client(self.customer_a)

        orders = client.get("/api/v1/me/orders")
        projects = client.get("/api/v1/me/projects")

        self.assertEqual(orders.status_code, 200)
        self.assertEqual([item["id"] for item in orders.json()["results"]], [str(self.order_a.pk)])
        self.assertEqual(projects.status_code, 200)
        self.assertEqual([item["id"] for item in projects.json()["results"]], [str(self.project_a.pk)])

    def test_customer_cannot_guess_another_project_or_nested_objects(self):
        client = self.logged_in_client(self.customer_a)
        project_id = self.project_b.pk

        self.assertEqual(client.get(f"/api/v1/me/projects/{project_id}").status_code, 404)
        self.assertEqual(client.get(f"/api/v1/me/projects/{project_id}/stages").status_code, 404)
        self.assertEqual(client.get(f"/api/v1/me/projects/{project_id}/updates").status_code, 404)
        self.assertEqual(client.get(f"/api/v1/me/projects/{project_id}/messages").status_code, 404)
        self.assertEqual(
            client.post(
                f"/api/v1/me/projects/{project_id}/messages",
                {"body": "不应写入"},
                format="json",
            ).status_code,
            404,
        )
        self.assertEqual(
            client.post(
                f"/api/v1/me/projects/{project_id}/updates/{self.update_b.pk}/acknowledge",
                format="json",
            ).status_code,
            404,
        )
        self.assertFalse(ProjectMessage.objects.filter(body="不应写入").exists())

    def test_customer_cannot_fetch_another_customers_private_media(self):
        client = self.logged_in_client(self.customer_a)
        response = client.get(f"/api/v1/me/media/{self.private_asset_b.pk}")
        self.assertEqual(response.status_code, 404)

    def test_authorized_customer_can_view_and_acknowledge_own_progress(self):
        client = self.logged_in_client(self.customer_b)
        updates_url = f"/api/v1/me/projects/{self.project_b.pk}/updates"
        response = client.get(updates_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"][0]["id"], str(self.update_b.pk))
        self.assertIsNotNone(response.json()["results"][0]["receipt"]["viewedAt"])

        response = client.post(
            f"{updates_url}/{self.update_b.pk}/acknowledge",
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.json()["acknowledgedAt"])

        media_response = client.get(f"/api/v1/me/media/{self.private_asset_b.pk}?variant=thumbnail")
        self.assertEqual(media_response.status_code, 200)
        media_response.close()

    def test_superuser_can_view_projects_and_private_media(self):
        client = self.logged_in_client(self.staff)
        self.assertEqual(client.get(f"/api/v1/me/projects/{self.project_b.pk}").status_code, 200)
        media_response = client.get(f"/api/v1/me/media/{self.private_asset_b.pk}")
        self.assertEqual(media_response.status_code, 200)
        media_response.close()

    def test_anonymous_and_temporary_password_sessions_are_blocked(self):
        self.assertIn(APIClient().get("/api/v1/me/projects").status_code, {401, 403})
        self.customer_a.must_change_password = True
        self.customer_a.save(update_fields=["must_change_password", "updated_at"])
        response = self.logged_in_client(self.customer_a).get("/api/v1/me/projects")
        self.assertEqual(response.status_code, 403)
