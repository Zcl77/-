import tempfile

from django.contrib.auth.models import Permission
from django.test import TransactionTestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import CustomerProfile, User
from common.tests.utils import TEST_PASSWORD, csrf_token, image_upload
from media_library.models import MediaAsset

from projects.models import (
    ClientProject,
    Order,
    PaymentRecord,
    ProgressImage,
    ProgressUpdate,
    ProjectMembership,
    ProjectMessage,
)


class CustomerObjectPermissionTests(TransactionTestCase):
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
            username="permission-staff",
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

    def test_project_viewer_does_not_receive_another_customers_order_or_payments(self):
        ProjectMembership.objects.create(
            project=self.project_b,
            user=self.customer_a,
            role=ProjectMembership.Role.VIEWER,
        )
        PaymentRecord.objects.create(
            order=self.order_b,
            payment_type=PaymentRecord.PaymentType.DEPOSIT,
            amount="100.00",
            status=PaymentRecord.Status.SUCCEEDED,
            mock_transaction_id="MOCK-PRIVATE-B",
        )

        response = self.logged_in_client(self.customer_a).get(f"/api/v1/me/projects/{self.project_b.pk}")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["order"])

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

    def test_customer_never_sees_draft_progress_and_messages_are_idempotent(self):
        draft = ProgressUpdate.objects.create(
            project=self.project_b,
            title="不应公开的草稿",
            body="客户不能看到。",
            status=ProgressUpdate.Status.DRAFT,
            author=self.staff,
            is_dev_data=True,
        )
        client = self.logged_in_client(self.customer_b)
        updates = client.get(f"/api/v1/me/projects/{self.project_b.pk}/updates").json()["results"]
        self.assertNotIn(str(draft.pk), [item["id"] for item in updates])

        url = f"/api/v1/me/projects/{self.project_b.pk}/messages"
        headers = {"HTTP_IDEMPOTENCY_KEY": "message-idempotency-test"}
        first = client.post(url, {"body": "只保存一次的留言"}, format="json", **headers)
        second = client.post(url, {"body": "只保存一次的留言"}, format="json", **headers)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(ProjectMessage.objects.filter(body="只保存一次的留言").count(), 1)

    def test_superuser_can_view_projects_and_private_media(self):
        client = self.logged_in_client(self.staff)
        self.assertEqual(client.get(f"/api/v1/me/projects/{self.project_b.pk}").status_code, 200)
        media_response = client.get(f"/api/v1/me/media/{self.private_asset_b.pk}")
        self.assertEqual(media_response.status_code, 200)
        media_response.close()

    def test_ordinary_staff_requires_explicit_model_permissions(self):
        staff = User.objects.create_user(
            username="limited-staff",
            password=TEST_PASSWORD,
            is_staff=True,
            must_change_password=False,
        )
        client = self.logged_in_client(staff)

        self.assertEqual(client.get("/api/v1/me/orders").json()["results"], [])
        self.assertEqual(client.get("/api/v1/me/projects").json()["results"], [])
        self.assertEqual(client.get(f"/api/v1/me/projects/{self.project_b.pk}").status_code, 404)
        self.assertEqual(client.get(f"/api/v1/me/media/{self.private_asset_b.pk}").status_code, 404)

        staff.user_permissions.add(
            Permission.objects.get(codename="view_order"),
            Permission.objects.get(codename="view_clientproject"),
            Permission.objects.get(codename="view_mediaasset"),
        )
        staff = User.objects.get(pk=staff.pk)
        client = self.logged_in_client(staff)

        self.assertEqual(len(client.get("/api/v1/me/orders").json()["results"]), 2)
        self.assertEqual(len(client.get("/api/v1/me/projects").json()["results"]), 2)
        self.assertEqual(client.get(f"/api/v1/me/projects/{self.project_b.pk}").status_code, 200)
        media_response = client.get(f"/api/v1/me/media/{self.private_asset_b.pk}")
        self.assertEqual(media_response.status_code, 200)
        media_response.close()

    def test_private_write_endpoints_require_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.customer_b)
        quote = Order.objects.create(
            order_number="TEST-CSRF-QUOTE",
            customer=self.order_b.customer,
            order_type="安全测试订单",
            confirmation_status=Order.ConfirmationStatus.PROPOSED,
            agreed_amount="100.00",
        )

        quote_url = f"/api/v1/me/orders/{quote.pk}/quote-decision"
        checkout_url = f"/api/v1/me/orders/{quote.pk}/checkout-confirmation"
        payment_url = f"/api/v1/me/orders/{quote.pk}/mock-payment"
        message_url = f"/api/v1/me/projects/{self.project_b.pk}/messages"
        acknowledge_url = f"/api/v1/me/projects/{self.project_b.pk}/updates/{self.update_b.pk}/acknowledge"
        self.assertEqual(client.post(quote_url, {"decision": "accepted"}, format="json").status_code, 403)
        self.assertEqual(client.post(checkout_url, {}, format="json").status_code, 403)
        self.assertEqual(client.post(payment_url, {"payment_type": "final"}, format="json").status_code, 403)
        self.assertEqual(client.post(message_url, {"body": "缺少 CSRF"}, format="json").status_code, 403)
        self.assertEqual(client.post(acknowledge_url, format="json").status_code, 403)

        token = csrf_token(client)
        self.assertEqual(
            client.post(message_url, {"body": "通过 CSRF 校验"}, format="json", HTTP_X_CSRFTOKEN=token).status_code,
            201,
        )

    def test_anonymous_and_temporary_password_sessions_are_blocked(self):
        self.assertIn(APIClient().get("/api/v1/me/projects").status_code, {401, 403})
        self.assertIn(
            APIClient().post(
                f"/api/v1/me/orders/{self.order_a.pk}/mock-payment",
                {"payment_type": "final"},
                format="json",
            ).status_code,
            {401, 403},
        )
        self.customer_a.must_change_password = True
        self.customer_a.save(update_fields=["must_change_password", "updated_at"])
        response = self.logged_in_client(self.customer_a).get("/api/v1/me/projects")
        self.assertEqual(response.status_code, 403)
