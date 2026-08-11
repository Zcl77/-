from django.test import TestCase
from rest_framework.test import APIClient

from common.tests.utils import csrf_token

from interactions.models import Inquiry, Review


class PublicSubmissionTests(TestCase):
    def setUp(self):
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
