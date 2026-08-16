from decimal import Decimal

from django.test import SimpleTestCase

from projects.payment_providers import PaymentProviderUnavailable, PaymentRequest, get_payment_provider


class PaymentProviderBoundaryTests(SimpleTestCase):
    def test_request_preserves_decimal_amount_and_iso_currency(self):
        request = PaymentRequest(
            order_id="order-id",
            payment_type="deposit",
            amount=Decimal("300.00"),
            currency="USD",
            idempotency_key="order-id:deposit",
        )
        self.assertEqual(request.amount, Decimal("300.00"))
        self.assertEqual(request.currency, "USD")

    def test_no_real_provider_is_registered(self):
        with self.assertRaises(PaymentProviderUnavailable):
            get_payment_provider("stripe")
