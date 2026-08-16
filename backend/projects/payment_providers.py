from dataclasses import dataclass
from decimal import Decimal
from typing import Mapping, Protocol


class PaymentProviderUnavailable(Exception):
    """Raised when no explicitly configured real payment provider is available."""


@dataclass(frozen=True)
class PaymentRequest:
    order_id: str
    payment_type: str
    amount: Decimal
    currency: str
    idempotency_key: str
    return_url: str | None = None


@dataclass(frozen=True)
class PaymentResult:
    provider: str
    provider_transaction_id: str
    status: str
    metadata: Mapping[str, object]


class PaymentProvider(Protocol):
    code: str

    def create_payment(self, request: PaymentRequest) -> PaymentResult: ...

    def refund(self, provider_transaction_id: str, amount: Decimal, idempotency_key: str) -> PaymentResult: ...

    def verify_webhook(self, headers: Mapping[str, str], body: bytes) -> Mapping[str, object]: ...


def get_payment_provider(code: str) -> PaymentProvider:
    """Extension boundary for future providers; none are enabled in this release."""
    raise PaymentProviderUnavailable(f"Payment provider {code!r} is not configured.")
