from decimal import Decimal
from unittest.mock import patch

from django.forms.models import inlineformset_factory
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from accounts.models import CustomerProfile, User
from common.tests.utils import TEST_PASSWORD
from projects.admin import ProjectMembershipInlineFormSet
from projects.models import ClientProject, Order, ProductionStage, ProgressUpdate, ProjectMembership
from projects.services import ensure_project_scaffold


class OrderWorkflowTests(TransactionTestCase):
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
        self.assertEqual(client.post(url, {"decision": "accepted"}, format="json").status_code, 400)

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
