from django.test import RequestFactory, TestCase

from common.views import csrf_failure


class HealthAndCsrfTests(TestCase):
    def test_health_checks_the_database(self):
        response = self.client.get("/api/v1/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_api_csrf_failure_uses_safe_json_message(self):
        request = RequestFactory().post("/api/v1/reviews")

        response = csrf_failure(request, reason="test detail that must not leak")

        self.assertEqual(response.status_code, 403)
        self.assertJSONEqual(
            response.content,
            {
                "error": {
                    "status": 403,
                    "message": "安全校验已过期，请刷新页面后重试。",
                    "fields": None,
                }
            },
        )
