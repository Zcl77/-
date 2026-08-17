from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.admin.sites import AdminSite
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.forms.models import inlineformset_factory
from django.test import RequestFactory, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import CustomerProfile, User
from common.tests.utils import TEST_PASSWORD
from projects.admin import OrderAdmin, OrderContactAddressInline, PaymentRecordAdmin, ProjectMembershipInlineFormSet
from projects.models import (
    ClientProject,
    Order,
    OrderContactAddress,
    PaymentRecord,
    ProductionStage,
    ProgressUpdate,
    ProjectMembership,
)
from projects.services import ensure_project_scaffold


class OrderWorkflowTests(TransactionTestCase):
    checkout_payload = {
        "recipient_name": "测试客户",
        "email": "customer@example.test",
        "phone": "+86 13800000000",
        "country_code": "cn",
        "region": "上海",
        "city": "上海",
        "address_line": "测试路 1 号",
        "postal_code": "200000",
    }
    def setUp(self):
        self.staff = User.objects.create_superuser(
            username="order-admin",
            password=TEST_PASSWORD,
            must_change_password=False,
        )
        self.customer_a, self.profile_a = self.create_customer("quote-customer-a", "报价客户甲")
        self.customer_b, self.profile_b = self.create_customer("quote-customer-b", "报价客户乙")

    def create_customer(self, username, display_name):
        user = User.objects.create_user(
            username=username,
            password=TEST_PASSWORD,
            role=User.Role.CUSTOMER,
            must_change_password=False,
        )
        return user, CustomerProfile.objects.create(user=user, display_name=display_name)

    def proposed_order(self, customer, number="QUOTE-001"):
        order = Order(
            order_number=number,
            customer=customer,
            order_type="建筑微缩模型",
            confirmation_status=Order.ConfirmationStatus.PROPOSED,
            agreed_amount=Decimal("12888.50"),
        )
        order.full_clean()
        order.save()
        return order

    def mark_mock_payment_eligible(self, order, user, profile):
        user.is_dev_data = True
        user.save(update_fields=["is_dev_data", "updated_at"])
        profile.is_dev_data = True
        profile.save(update_fields=["is_dev_data", "updated_at"])
        order.is_dev_data = True
        order.save(update_fields=["is_dev_data", "updated_at"])

    def confirm_checkout(self, client, order, payload=None):
        return client.post(
            f"/api/v1/me/orders/{order.pk}/checkout-confirmation",
            payload or self.checkout_payload,
            format="json",
        )

    def test_customer_accepts_quote_once_and_project_is_created(self):
        order = self.proposed_order(self.profile_a)
        client = APIClient()
        client.force_login(self.customer_a)
        url = f"/api/v1/me/orders/{order.pk}/quote-decision"

        response = client.post(url, {"decision": "accepted"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["order"]["agreed_amount"], "12888.50")
        order.refresh_from_db()
        self.assertEqual(order.confirmation_status, Order.ConfirmationStatus.CONFIRMED)
        self.assertEqual(order.quote_decision, Order.QuoteDecision.ACCEPTED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.UNPAID)
        self.assertEqual(order.checkout_status, Order.CheckoutStatus.PENDING)
        self.assertEqual(response.json()["order"]["available_actions"], ["confirm_checkout"])
        self.assertEqual(order.final_amount, Decimal("12888.50"))
        self.assertIsNotNone(order.quote_decision_at)
        project = order.projects.get()
        self.assertEqual(project.status, ClientProject.Status.ACTIVE)
        self.assertTrue(ProjectMembership.objects.filter(project=project, user=self.customer_a).exists())

        duplicate = client.post(url, {"decision": "accepted"}, format="json")
        self.assertEqual(duplicate.status_code, 200)
        self.assertFalse(duplicate.json()["changed"])
        self.assertEqual(order.projects.count(), 1)

    def test_customer_rejects_quote_and_cannot_change_the_decision(self):
        order = self.proposed_order(self.profile_a, "QUOTE-REJECT")
        project = ClientProject.objects.create(order=order, name="待决定项目")
        client = APIClient()
        client.force_login(self.customer_a)
        url = f"/api/v1/me/orders/{order.pk}/quote-decision"

        self.assertEqual(client.post(url, {"decision": "rejected"}, format="json").status_code, 200)
        project.refresh_from_db()
        self.assertEqual(project.status, ClientProject.Status.CANCELLED)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.CANCELLED)
        self.assertEqual(client.post(url, {"decision": "accepted"}, format="json").status_code, 400)

    def test_amounts_use_decimal_and_calculate_the_final_balance(self):
        order = Order(
            order_number="QUOTE-AMOUNTS",
            customer=self.profile_a,
            order_type="金额计算测试",
            confirmation_status=Order.ConfirmationStatus.PROPOSED,
            agreed_amount=Decimal("1000.10"),
            deposit_amount=Decimal("300.03"),
        )
        order.full_clean()
        self.assertEqual(order.final_amount, Decimal("700.07"))
        order.save()
        order.refresh_from_db()
        self.assertEqual(order.deposit_amount + order.final_amount, order.agreed_amount)
        self.assertEqual(order.currency, Order.Currency.CNY)
        self.assertEqual(order.service_subtotal, Decimal("1000.10"))

    def test_cny_and_usd_checkout_totals_are_calculated_with_decimal(self):
        for currency in (Order.Currency.CNY, Order.Currency.USD):
            order = Order(
                order_number=f"TOTAL-{currency}",
                customer=self.profile_a,
                order_type="国际订单",
                confirmation_status=Order.ConfirmationStatus.PROPOSED,
                agreed_amount=Decimal("110.17"),
                service_subtotal=Decimal("100.10"),
                shipping_amount=Decimal("8.07"),
                tax_amount=Decimal("5.00"),
                discount_amount=Decimal("3.00"),
                deposit_amount=Decimal("30.03"),
                final_amount=Decimal("80.14"),
                currency=currency,
            )
            order.full_clean()
            self.assertEqual(order.calculated_total, Decimal("110.17"))

    def test_invalid_checkout_amount_components_are_rejected(self):
        order = self.proposed_order(self.profile_a, "TOTAL-INVALID")
        order.shipping_amount = Decimal("-0.01")
        with self.assertRaises(ValidationError):
            order.full_clean()

    @override_settings(MOCK_PAYMENTS_ENABLED=True)
    def test_deposit_and_final_mock_payments_advance_order_status(self):
        order = Order(
            order_number="QUOTE-MOCK-PAY",
            customer=self.profile_a,
            order_type="模拟付款测试",
            confirmation_status=Order.ConfirmationStatus.PROPOSED,
            agreed_amount=Decimal("1000.00"),
            deposit_amount=Decimal("300.00"),
        )
        order.full_clean()
        order.save()
        self.mark_mock_payment_eligible(order, self.customer_a, self.profile_a)
        client = APIClient()
        client.force_login(self.customer_a)
        quote_url = f"/api/v1/me/orders/{order.pk}/quote-decision"
        payment_url = f"/api/v1/me/orders/{order.pk}/mock-payment"

        quote = client.post(quote_url, {"decision": "accepted"}, format="json")
        self.assertEqual(quote.status_code, 200)
        self.assertEqual(quote.json()["order"]["available_actions"], ["confirm_checkout"])
        checkout = self.confirm_checkout(client, order)
        self.assertEqual(checkout.status_code, 200)
        self.assertTrue(checkout.json()["changed"])
        self.assertEqual(checkout.json()["order"]["available_actions"], ["mock_pay_deposit"])
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.DEPOSIT_PENDING)
        self.assertEqual(order.contact_address.country_code, "CN")

        duplicate_checkout = self.confirm_checkout(client, order)
        self.assertEqual(duplicate_checkout.status_code, 200)
        self.assertFalse(duplicate_checkout.json()["changed"])
        self.assertEqual(OrderContactAddress.objects.filter(order=order).count(), 1)

        self.assertEqual(
            client.post(payment_url, {"payment_type": "deposit", "amount": "0.01"}, format="json").status_code,
            400,
        )
        premature_final = client.post(payment_url, {"payment_type": "final"}, format="json")
        self.assertEqual(premature_final.status_code, 400)
        self.assertEqual(premature_final.json()["error"]["code"], "invalid_payment_state")
        self.assertIn("尾款待支付", premature_final.json()["error"]["message"])
        self.assertFalse(order.payment_records.exists())

        deposit = client.post(payment_url, {"payment_type": "deposit"}, format="json")
        self.assertEqual(deposit.status_code, 201)
        self.assertTrue(deposit.json()["created"])
        self.assertEqual(deposit.json()["order"]["available_actions"], ["mock_pay_final"])
        self.assertIn("不代表真实收款", deposit.json()["message"])
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.FINAL_PENDING)
        self.assertEqual(order.deposit_status, Order.PaymentRecordStatus.RECORDED)

        duplicate_deposit = client.post(payment_url, {"payment_type": "deposit"}, format="json")
        self.assertEqual(duplicate_deposit.status_code, 200)
        self.assertFalse(duplicate_deposit.json()["created"])
        self.assertEqual(duplicate_deposit.json()["payment"]["id"], deposit.json()["payment"]["id"])
        self.assertEqual(order.payment_records.count(), 1)

        final = client.post(payment_url, {"payment_type": "final"}, format="json")
        self.assertEqual(final.status_code, 201)
        self.assertTrue(final.json()["created"])
        self.assertEqual(final.json()["order"]["available_actions"], [])
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(order.final_payment_status, Order.PaymentRecordStatus.RECORDED)
        self.assertEqual(order.payment_records.count(), 2)
        self.assertEqual(
            list(order.payment_records.order_by("created_at").values_list("amount", flat=True)),
            [Decimal("300.00"), Decimal("700.00")],
        )
        self.assertTrue(
            all(
                record.channel == PaymentRecord.Channel.MOCK
                and record.currency == Order.Currency.CNY
                and record.status == PaymentRecord.Status.SUCCEEDED
                and record.mock_transaction_id.startswith("MOCK-")
                and record.idempotency_key.startswith(f"mock:{order.pk}:")
                and record.paid_at is not None
                for record in order.payment_records.all()
            )
        )
        duplicate_final = client.post(payment_url, {"payment_type": "final"}, format="json")
        self.assertEqual(duplicate_final.status_code, 200)
        self.assertFalse(duplicate_final.json()["created"])
        self.assertEqual(duplicate_final.json()["payment"]["id"], final.json()["payment"]["id"])
        self.assertEqual(order.payment_records.count(), 2)

        with self.assertRaises(IntegrityError), transaction.atomic():
            PaymentRecord.objects.create(
                order=order,
                payment_type=PaymentRecord.PaymentType.FINAL,
                channel=PaymentRecord.Channel.MOCK,
                amount=order.final_amount,
                currency=order.currency,
                status=PaymentRecord.Status.SUCCEEDED,
                mock_transaction_id="MOCK-DUPLICATE-STATE",
                idempotency_key=f"mock:{order.pk}:final:succeeded",
            )

    @override_settings(MOCK_PAYMENTS_ENABLED=True)
    def test_non_development_customer_or_order_cannot_use_mock_payment(self):
        order = self.proposed_order(self.profile_a, "QUOTE-MOCK-NONDEV")
        client = APIClient()
        client.force_login(self.customer_a)
        client.post(
            f"/api/v1/me/orders/{order.pk}/quote-decision",
            {"decision": "accepted"},
            format="json",
        )
        payment_url = f"/api/v1/me/orders/{order.pk}/mock-payment"

        self.assertEqual(client.post(payment_url, {"payment_type": "final"}, format="json").status_code, 400)
        order.is_dev_data = True
        order.save(update_fields=["is_dev_data", "updated_at"])
        self.assertEqual(client.post(payment_url, {"payment_type": "final"}, format="json").status_code, 400)
        order.is_dev_data = False
        order.save(update_fields=["is_dev_data", "updated_at"])
        self.customer_a.is_dev_data = True
        self.customer_a.save(update_fields=["is_dev_data", "updated_at"])
        self.profile_a.is_dev_data = True
        self.profile_a.save(update_fields=["is_dev_data", "updated_at"])
        self.assertEqual(client.post(payment_url, {"payment_type": "final"}, format="json").status_code, 400)
        self.assertFalse(order.payment_records.exists())

    @override_settings(MOCK_PAYMENTS_ENABLED=True)
    def test_other_customer_cannot_view_or_create_payment_records(self):
        order = self.proposed_order(self.profile_a, "QUOTE-PAYMENT-PRIVATE")
        owner = APIClient()
        owner.force_login(self.customer_a)
        owner.post(f"/api/v1/me/orders/{order.pk}/quote-decision", {"decision": "accepted"}, format="json")

        outsider = APIClient()
        outsider.force_login(self.customer_b)
        url = f"/api/v1/me/orders/{order.pk}/mock-payment"
        self.assertEqual(outsider.post(url, {"payment_type": "final"}, format="json").status_code, 404)
        self.assertEqual(order.payment_records.count(), 0)
        self.assertNotIn(
            str(order.pk),
            [item["id"] for item in outsider.get("/api/v1/me/orders").json()["results"]],
        )

    def test_other_customer_cannot_submit_checkout_or_view_address(self):
        order = self.proposed_order(self.profile_a, "CHECKOUT-PRIVATE")
        owner = APIClient()
        owner.force_login(self.customer_a)
        owner.post(f"/api/v1/me/orders/{order.pk}/quote-decision", {"decision": "accepted"}, format="json")
        outsider = APIClient()
        outsider.force_login(self.customer_b)

        response = self.confirm_checkout(outsider, order)
        self.assertEqual(response.status_code, 404)
        self.assertFalse(OrderContactAddress.objects.filter(order=order).exists())
        self.assertNotIn(
            str(order.pk),
            [item["id"] for item in outsider.get("/api/v1/me/orders").json()["results"]],
        )

    def test_checkout_requires_authentication(self):
        order = self.proposed_order(self.profile_a, "CHECKOUT-LOGIN-REQUIRED")
        response = self.confirm_checkout(APIClient(), order)
        self.assertIn(response.status_code, (401, 403))
        self.assertFalse(OrderContactAddress.objects.filter(order=order).exists())

    def test_checkout_rejects_amount_tampering_and_invalid_address(self):
        order = self.proposed_order(self.profile_a, "CHECKOUT-VALIDATION")
        client = APIClient()
        client.force_login(self.customer_a)
        client.post(f"/api/v1/me/orders/{order.pk}/quote-decision", {"decision": "accepted"}, format="json")
        tampered = {**self.checkout_payload, "agreed_amount": "0.01"}
        self.assertEqual(self.confirm_checkout(client, order, tampered).status_code, 400)
        invalid_country = {**self.checkout_payload, "country_code": "China"}
        self.assertEqual(self.confirm_checkout(client, order, invalid_country).status_code, 400)
        self.assertFalse(OrderContactAddress.objects.filter(order=order).exists())

    def test_expired_quote_cannot_be_accepted(self):
        order = self.proposed_order(self.profile_a, "QUOTE-EXPIRED")
        order.quote_valid_until = timezone.now() - timedelta(minutes=1)
        order.save(update_fields=["quote_valid_until", "updated_at"])
        client = APIClient()
        client.force_login(self.customer_a)
        response = client.post(
            f"/api/v1/me/orders/{order.pk}/quote-decision",
            {"decision": "accepted"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        rejected = client.post(
            f"/api/v1/me/orders/{order.pk}/quote-decision",
            {"decision": "rejected"},
            format="json",
        )
        self.assertEqual(rejected.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.quote_decision, Order.QuoteDecision.PENDING)

    @override_settings(MOCK_PAYMENTS_ENABLED=False)
    def test_mock_payment_is_blocked_outside_local_and_test_environments(self):
        order = self.proposed_order(self.profile_a, "QUOTE-MOCK-DISABLED")
        self.mark_mock_payment_eligible(order, self.customer_a, self.profile_a)
        client = APIClient()
        client.force_login(self.customer_a)
        client.post(
            f"/api/v1/me/orders/{order.pk}/quote-decision",
            {"decision": "accepted"},
            format="json",
        )
        response = client.post(
            f"/api/v1/me/orders/{order.pk}/mock-payment",
            {"payment_type": "final"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(order.payment_records.exists())
        serialized = client.get("/api/v1/me/orders").json()["results"][0]
        self.assertNotIn("mock_pay_final", serialized["available_actions"])

    @override_settings(MOCK_PAYMENTS_ENABLED=True)
    def test_usd_is_structurally_supported_but_mock_payment_remains_cny_only(self):
        order = Order(
            order_number="QUOTE-USD-REJECTED",
            customer=self.profile_a,
            order_type="币种校验测试",
            confirmation_status=Order.ConfirmationStatus.PROPOSED,
            agreed_amount=Decimal("100.00"),
            currency="USD",
        )
        order.full_clean()
        order.save()
        self.mark_mock_payment_eligible(order, self.customer_a, self.profile_a)
        client = APIClient()
        client.force_login(self.customer_a)
        accepted = client.post(
            f"/api/v1/me/orders/{order.pk}/quote-decision",
            {"decision": "accepted"},
            format="json",
        )
        self.assertEqual(accepted.status_code, 200)
        self.assertEqual(accepted.json()["order"]["currency"], "USD")
        self.assertNotIn("mock_pay_final", accepted.json()["order"]["available_actions"])
        self.assertEqual(self.confirm_checkout(client, order).status_code, 200)
        payment = client.post(
            f"/api/v1/me/orders/{order.pk}/mock-payment",
            {"payment_type": "final"},
            format="json",
        )
        self.assertEqual(payment.status_code, 400)
        self.assertEqual(payment.json()["error"]["code"], "mock_currency_unsupported")

    def test_currency_codes_are_limited_to_declared_iso_4217_choices(self):
        order = Order(
            order_number="QUOTE-EUR-REJECTED",
            customer=self.profile_a,
            order_type="模型制作",
            currency="EUR",
        )
        with self.assertRaises(ValidationError):
            order.full_clean()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Order.objects.bulk_create([order])

    def test_requoting_replaces_the_old_decision_and_timestamp(self):
        order = self.proposed_order(self.profile_a, "QUOTE-REVISED")
        original_quote_time = order.quoted_at
        order.confirmation_status = Order.ConfirmationStatus.CONFIRMED
        order.quote_decision = Order.QuoteDecision.ACCEPTED
        order.quote_decision_at = original_quote_time
        order.save()

        order.confirmation_status = Order.ConfirmationStatus.PROPOSED
        order.agreed_amount = Decimal("13500.00")
        order.full_clean()
        order.save()

        self.assertEqual(order.quote_decision, Order.QuoteDecision.PENDING)
        self.assertIsNone(order.quote_decision_at)
        self.assertGreaterEqual(order.quoted_at, original_quote_time)

    def test_partial_requote_persists_all_derived_quote_fields(self):
        order = self.proposed_order(self.profile_a, "QUOTE-PARTIAL")
        order.confirmation_status = Order.ConfirmationStatus.CONFIRMED
        order.quote_decision = Order.QuoteDecision.ACCEPTED
        order.quote_decision_at = order.quoted_at
        order.save()

        order.confirmation_status = Order.ConfirmationStatus.PROPOSED
        order.agreed_amount = Decimal("13999.00")
        order.save(update_fields=["confirmation_status", "agreed_amount", "updated_at"])

        order.refresh_from_db()
        self.assertEqual(order.quote_decision, Order.QuoteDecision.PENDING)
        self.assertIsNone(order.quote_decision_at)
        self.assertIsNotNone(order.quoted_at)

    def test_customers_cannot_view_or_decide_another_customers_quote(self):
        order = self.proposed_order(self.profile_a, "QUOTE-PRIVATE")
        client = APIClient()
        client.force_login(self.customer_b)
        self.assertEqual(
            client.post(
                f"/api/v1/me/orders/{order.pk}/quote-decision",
                {"decision": "accepted"},
                format="json",
            ).status_code,
            404,
        )
        order.refresh_from_db()
        self.assertEqual(order.quote_decision, Order.QuoteDecision.PENDING)

    def test_project_scaffold_is_idempotent_and_rolls_back_on_failure(self):
        order = self.proposed_order(self.profile_a, "QUOTE-SCAFFOLD")
        project = ClientProject.objects.create(order=order, name="幂等项目")
        ensure_project_scaffold(project.pk)
        ensure_project_scaffold(project.pk)
        self.assertEqual(project.stages.count(), 7)
        self.assertEqual(project.memberships.filter(user=self.customer_a).count(), 1)

        project.current_stage = None
        project.save(update_fields=["current_stage", "updated_at"])
        project.stages.all().delete()
        project.memberships.all().delete()
        original = ProductionStage.objects.get_or_create
        calls = 0

        def fail_after_first(*args, **kwargs):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise RuntimeError("forced rollback")
            return original(*args, **kwargs)

        with patch.object(ProductionStage.objects, "get_or_create", side_effect=fail_after_first):
            with self.assertRaises(RuntimeError):
                ensure_project_scaffold(project.pk)
        self.assertEqual(project.stages.count(), 0)
        self.assertEqual(project.memberships.count(), 0)

    def test_admin_inline_explains_duplicate_members_before_saving(self):
        order = self.proposed_order(self.profile_a, "QUOTE-INLINE")
        project = ClientProject.objects.create(order=order, name="成员表单项目")
        FormSet = inlineformset_factory(
            ClientProject,
            ProjectMembership,
            fields=("user", "role", "is_active"),
            formset=ProjectMembershipInlineFormSet,
            extra=2,
        )
        data = {
            "memberships-TOTAL_FORMS": "2",
            "memberships-INITIAL_FORMS": "0",
            "memberships-MIN_NUM_FORMS": "0",
            "memberships-MAX_NUM_FORMS": "1000",
            "memberships-0-user": str(self.customer_b.pk),
            "memberships-0-role": ProjectMembership.Role.VIEWER,
            "memberships-0-is_active": "on",
            "memberships-1-user": str(self.customer_b.pk),
            "memberships-1-role": ProjectMembership.Role.VIEWER,
            "memberships-1-is_active": "on",
        }
        formset = FormSet(data=data, instance=project, prefix="memberships")
        self.assertFalse(formset.is_valid())
        self.assertIn("同一客户不能重复添加", str(formset.errors))

    def test_admin_protects_payment_audit_fields_and_paid_order_amounts(self):
        order = self.proposed_order(self.profile_a, "QUOTE-ADMIN-AUDIT")
        PaymentRecord.objects.create(
            order=order,
            payment_type=PaymentRecord.PaymentType.FINAL,
            amount=order.final_amount,
            currency=order.currency,
            status=PaymentRecord.Status.SUCCEEDED,
            mock_transaction_id="MOCK-ADMIN-AUDIT",
            idempotency_key=f"mock:{order.pk}:final:succeeded",
        )
        request = RequestFactory().get("/admin/projects/order/")
        request.user = self.staff
        site = AdminSite()
        payment_admin = PaymentRecordAdmin(PaymentRecord, site)
        order_admin = OrderAdmin(Order, site)

        self.assertFalse(payment_admin.has_add_permission(request))
        self.assertFalse(payment_admin.has_delete_permission(request))
        self.assertIn("mock_transaction_id", payment_admin.get_readonly_fields(request))
        self.assertIn("paid_at", payment_admin.get_readonly_fields(request))
        self.assertIn("agreed_amount", order_admin.get_readonly_fields(request, order))
        self.assertIn("deposit_amount", order_admin.get_readonly_fields(request, order))
        self.assertIn("final_amount", order_admin.get_readonly_fields(request, order))
        self.assertIn(OrderContactAddressInline, order_admin.inlines)

    def test_published_progress_gets_timestamp_before_constraint_validation(self):
        order = self.proposed_order(self.profile_a, "QUOTE-PROGRESS")
        project = ClientProject.objects.create(order=order, name="发布时间项目")
        update = ProgressUpdate(
            project=project,
            title="已发布进度",
            body="发布时间由表单层和模型层安全补齐。",
            status=ProgressUpdate.Status.PUBLISHED,
            author=self.staff,
        )
        update.full_clean()
        self.assertIsNotNone(update.published_at)

    def test_partial_progress_publish_persists_generated_timestamp(self):
        order = self.proposed_order(self.profile_a, "QUOTE-PARTIAL-PUBLISH")
        project = ClientProject.objects.create(order=order, name="部分发布项目")
        update = ProgressUpdate.objects.create(
            project=project,
            title="待发布进度",
            body="部分字段保存也必须写入发布时间。",
            status=ProgressUpdate.Status.DRAFT,
            author=self.staff,
        )

        update.status = ProgressUpdate.Status.PUBLISHED
        update.save(update_fields=["status", "updated_at"])

        update.refresh_from_db()
        self.assertIsNotNone(update.published_at)
