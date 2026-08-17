from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import CustomerProfile, User
from common.dev_data import require_development_environment
from projects.models import Order, PaymentRecord


class Command(BaseCommand):
    help = "Create or refresh the local-only checkout quote used for manual acceptance checks."

    def handle(self, *args, **options):
        require_development_environment()
        try:
            user = User.objects.get(username="local_dev_customer", role=User.Role.CUSTOMER, is_dev_data=True)
            profile = CustomerProfile.objects.get(user=user, is_dev_data=True)
        except (User.DoesNotExist, CustomerProfile.DoesNotExist) as exc:
            raise CommandError("Run seed_dev_data first; local_dev_customer must be development data.") from exc

        with transaction.atomic():
            order, created = Order.objects.select_for_update().get_or_create(
                order_number="DEV-CHECKOUT-0001",
                defaults={
                    "customer": profile,
                    "order_type": "Local checkout acceptance test",
                    "confirmation_status": Order.ConfirmationStatus.PROPOSED,
                    "currency": Order.Currency.CNY,
                    "agreed_amount": Decimal("1250.00"),
                    "service_subtotal": Decimal("1250.00"),
                    "shipping_amount": Decimal("0.00"),
                    "tax_amount": Decimal("0.00"),
                    "discount_amount": Decimal("0.00"),
                    "deposit_amount": Decimal("300.00"),
                    "final_amount": Decimal("950.00"),
                    "quoted_at": timezone.now(),
                    "quote_valid_until": timezone.now() + timedelta(days=14),
                    "quote_decision": Order.QuoteDecision.PENDING,
                    "payment_status": Order.PaymentStatus.UNPAID,
                    "checkout_status": Order.CheckoutStatus.NOT_STARTED,
                    "notes": "Local development checkout quote. Not a real transaction.",
                    "is_dev_data": True,
                },
            )
            if not created:
                if not order.is_dev_data or order.customer_id != profile.pk:
                    raise CommandError("DEV-CHECKOUT-0001 exists but is not owned by the local dev customer.")
                if PaymentRecord.objects.filter(order=order).exists():
                    raise CommandError("DEV-CHECKOUT-0001 already has payment records; refusing to reset it.")
                if order.quote_decision == Order.QuoteDecision.ACCEPTED:
                    raise CommandError("DEV-CHECKOUT-0001 has already been accepted; create a new test order instead.")
                order.customer = profile
                order.order_type = "Local checkout acceptance test"
                order.confirmation_status = Order.ConfirmationStatus.PROPOSED
                order.currency = Order.Currency.CNY
                order.agreed_amount = Decimal("1250.00")
                order.service_subtotal = Decimal("1250.00")
                order.shipping_amount = Decimal("0.00")
                order.tax_amount = Decimal("0.00")
                order.discount_amount = Decimal("0.00")
                order.deposit_amount = Decimal("300.00")
                order.final_amount = Decimal("950.00")
                order.quoted_at = timezone.now()
                order.quote_valid_until = timezone.now() + timedelta(days=14)
                order.quote_decision = Order.QuoteDecision.PENDING
                order.quote_decision_at = None
                order.payment_status = Order.PaymentStatus.UNPAID
                order.deposit_status = Order.PaymentRecordStatus.NOT_RECORDED
                order.final_payment_status = Order.PaymentRecordStatus.NOT_RECORDED
                order.checkout_status = Order.CheckoutStatus.NOT_STARTED
                order.checkout_confirmed_at = None
                order.is_dev_data = True
                order.full_clean()
                order.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"{order.order_number} is ready for local checkout acceptance until {order.quote_valid_until:%Y-%m-%d %H:%M:%S %Z}."
            )
        )
