from django.contrib.auth.hashers import identify_hasher
from django.test import TestCase
from rest_framework.test import APIClient

from common.tests.utils import TEST_PASSWORD, csrf_token

from accounts.models import CustomerProfile, SecurityEvent, User


class AuthenticationApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="customer-auth-test",
            password=TEST_PASSWORD,
            role=User.Role.CUSTOMER,
            must_change_password=True,
        )
        CustomerProfile.objects.create(user=self.user, display_name="测试客户", is_dev_data=True)

    def test_me_is_safe_for_anonymous_visitors(self):
        response = APIClient().get("/api/v1/auth/me")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"authenticated": False})

    def test_login_requires_csrf_and_rotates_into_authenticated_session(self):
        client = APIClient(enforce_csrf_checks=True)
        payload = {"username": self.user.username, "password": TEST_PASSWORD}

        self.assertEqual(client.post("/api/v1/auth/login", payload, format="json").status_code, 403)
        token = csrf_token(client)
        response = client.post("/api/v1/auth/login", payload, format="json", HTTP_X_CSRFTOKEN=token)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["user"]["authenticated"])
        self.assertTrue(response.json()["user"]["mustChangePassword"])
        self.assertTrue(SecurityEvent.objects.filter(user=self.user, event=SecurityEvent.Event.LOGIN).exists())

    def test_login_rejects_unknown_fields_and_invalid_credentials(self):
        client = APIClient(enforce_csrf_checks=True)
        token = csrf_token(client)
        response = client.post(
            "/api/v1/auth/login",
            {"username": self.user.username, "password": TEST_PASSWORD, "admin": True},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 400)

        response = client.post(
            "/api/v1/auth/login",
            {"username": self.user.username, "password": "incorrect-password"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 403)
        self.assertNotIn(self.user.username, str(response.json()))

    def test_password_change_keeps_session_and_uses_argon2(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.user)
        token = csrf_token(client)
        new_password = "Changed-local-password-9375"

        response = client.post(
            "/api/v1/auth/password/change",
            {"current_password": TEST_PASSWORD, "new_password": new_password},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.must_change_password)
        self.assertEqual(identify_hasher(self.user.password).algorithm, "argon2")
        self.assertTrue(client.get("/api/v1/auth/me").json()["authenticated"])
        self.assertTrue(
            SecurityEvent.objects.filter(user=self.user, event=SecurityEvent.Event.PASSWORD_CHANGED).exists()
        )

    def test_logout_ends_the_server_session(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.user)
        token = csrf_token(client)

        self.assertEqual(client.post("/api/v1/auth/logout", HTTP_X_CSRFTOKEN=token).status_code, 204)
        self.assertEqual(client.get("/api/v1/auth/me").json(), {"authenticated": False})
        self.assertTrue(SecurityEvent.objects.filter(user=self.user, event=SecurityEvent.Event.LOGOUT).exists())
