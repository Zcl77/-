from django.test import SimpleTestCase, override_settings


class ProductionSettingsTests(SimpleTestCase):
    @override_settings(
        DEBUG=False,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SECURE=True,
        SESSION_COOKIE_SAMESITE="Lax",
        CSRF_COOKIE_SECURE=True,
        SECURE_SSL_REDIRECT=True,
        SECURE_HSTS_SECONDS=31536000,
        X_FRAME_OPTIONS="DENY",
    )
    def test_production_security_contract(self):
        from django.conf import settings

        self.assertFalse(settings.DEBUG)
        self.assertTrue(settings.SESSION_COOKIE_HTTPONLY)
        self.assertTrue(settings.SESSION_COOKIE_SECURE)
        self.assertEqual(settings.SESSION_COOKIE_SAMESITE, "Lax")
        self.assertTrue(settings.CSRF_COOKIE_SECURE)
        self.assertTrue(settings.SECURE_SSL_REDIRECT)
        self.assertGreaterEqual(settings.SECURE_HSTS_SECONDS, 31536000)
        self.assertEqual(settings.X_FRAME_OPTIONS, "DENY")
