from django.test import TestCase
from django.contrib.admin.sites import AdminSite
from django.core.cache import cache
from django.test import RequestFactory
from django.utils import timezone
from rest_framework.test import APIClient

from common.tests.utils import csrf_token

from accounts.models import CustomerProfile, User
from interactions.admin import ReviewAdmin
from interactions.models import Inquiry, Review
from projects.services import create_order_from_inquiry


class PublicSubmissionTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        self.token = csrf_token(self.client)

    def post_json(self, url, payload):
        return self.client.post(url, payload, format="json", HTTP_X_CSRFTOKEN=self.token)

    def test_review_requires_csrf_rejects_extra_fields_and_defaults_to_pending(self):
        payload = {
            "reviewer_name": "本地测试访客",
            "project_name": "测试项目",
            "rating": 5,
            "comment": "这是一条待审核的本地测试评价。",
        }
        no_csrf = APIClient(enforce_csrf_checks=True).post("/api/v1/reviews", payload, format="json")
        self.assertEqual(no_csrf.status_code, 403)

        extra = self.post_json("/api/v1/reviews", {**payload, "status": "approved"})
        self.assertEqual(extra.status_code, 400)

        response = self.post_json("/api/v1/reviews", payload)
        self.assertEqual(response.status_code, 201)
        review = Review.objects.get(pk=response.json()["id"])
        self.assertEqual(review.status, Review.Status.PENDING)
        self.assertEqual(self.client.get("/api/v1/reviews").json()["results"], [])

        review.status = Review.Status.APPROVED
        review.save(update_fields=["status", "updated_at"])
        self.assertEqual(len(self.client.get("/api/v1/reviews").json()["results"]), 1)

    def test_review_rating_must_be_an_integer_from_one_to_five(self):
        base = {
            "reviewer_name": "本地测试访客",
            "project_name": "测试项目",
            "comment": "评分边界测试。",
        }
        for invalid_rating in (0, 6, 4.5):
            with self.subTest(rating=invalid_rating):
                response = self.post_json("/api/v1/reviews", {**base, "rating": invalid_rating})
                self.assertEqual(response.status_code, 400)

    def test_inquiry_requires_explicit_consent_and_rejects_server_owned_fields(self):
        payload = {
            "name": "本地询价人",
            "contact_type": "wechat",
            "contact_value": "local-test-contact",
            "project_type": "建筑微缩模型",
            "description": "仅用于自动化测试的需求说明。",
            "privacy_consent": True,
        }
        response = self.post_json("/api/v1/inquiries", {**payload, "status": "closed"})
        self.assertEqual(response.status_code, 400)

        response = self.post_json("/api/v1/inquiries", {**payload, "privacy_consent": False})
        self.assertEqual(response.status_code, 400)

        response = self.post_json("/api/v1/inquiries", payload)
        self.assertEqual(response.status_code, 201)
        inquiry = Inquiry.objects.get(pk=response.json()["id"])
        self.assertEqual(inquiry.status, Inquiry.Status.NEW)
        self.assertFalse(inquiry.is_dev_data)

    def test_review_and_inquiry_duplicate_submissions_are_idempotent(self):
        review_payload = {
            "reviewer_name": "防重复访客",
            "project_name": "防重复项目",
            "rating": 5,
            "comment": "相同评价短时间内只能生成一条。",
        }
        first = self.post_json("/api/v1/reviews", review_payload)
        second = self.post_json("/api/v1/reviews", review_payload)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.json()["duplicate"])
        self.assertEqual(Review.objects.filter(reviewer_name="防重复访客").count(), 1)

        inquiry_payload = {
            "name": "防重复询价人",
            "contact_type": "wechat",
            "contact_value": "dedupe-contact",
            "project_type": "防重复模型",
            "description": "相同询价短时间内只能生成一条。",
            "privacy_consent": True,
        }
        first = self.post_json("/api/v1/inquiries", inquiry_payload)
        second = self.post_json("/api/v1/inquiries", inquiry_payload)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.json()["duplicate"])
        self.assertEqual(Inquiry.objects.filter(name="防重复询价人").count(), 1)

    def test_review_admin_records_moderator_and_time(self):
        staff = User.objects.create_superuser(username="review-admin", password="unused")
        review = Review.objects.create(
            reviewer_name="审核测试",
            project_name="测试项目",
            rating=5,
            comment="审核记录必须完整。",
        )
        review.status = Review.Status.APPROVED
        request = RequestFactory().post("/admin/interactions/review/")
        request.user = staff

        class ChangedStatusForm:
            changed_data = ["status"]

        ReviewAdmin(Review, AdminSite()).save_model(request, review, ChangedStatusForm(), True)
        review.refresh_from_db()
        self.assertEqual(review.moderated_by, staff)
        self.assertIsNotNone(review.moderated_at)
        self.assertLessEqual(review.moderated_at, timezone.now())

    def test_inquiry_creates_or_reuses_one_customer_order(self):
        user = User.objects.create_user(username="inquiry-customer", password="unused")
        customer = CustomerProfile.objects.create(user=user, display_name="询价客户")
        inquiry = Inquiry.objects.create(
            name="询价客户",
            contact_type=Inquiry.ContactType.WECHAT,
            contact_value="local-contact",
            project_type="场景模型",
            description="用于订单转换幂等测试。",
            privacy_consent=True,
            customer=customer,
        )

        first, created = create_order_from_inquiry(inquiry)
        second, created_again = create_order_from_inquiry(inquiry)
        self.assertTrue(created)
        self.assertFalse(created_again)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(customer.orders.count(), 1)
