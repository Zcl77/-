import tempfile

from django.test import TransactionTestCase, override_settings
from rest_framework.test import APIClient

from common.tests.utils import image_upload
from media_library.models import MediaAsset

from portfolio.models import Category, PublicProcessPost, Work, WorkImage


class PublicPortfolioApiTests(TransactionTestCase):
    def setUp(self):
        self.media_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.media_directory.cleanup)
        self.settings_override = override_settings(MEDIA_ROOT=self.media_directory.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.client = APIClient()

        self.visible_category = Category.objects.create(name="公开分类", is_visible=True, is_dev_data=True)
        self.hidden_category = Category.objects.create(name="隐藏分类", is_visible=False, is_dev_data=True)
        self.visible_work = Work.objects.create(
            category=self.visible_category,
            title="公开作品",
            status=Work.Status.PUBLISHED,
            is_dev_data=True,
        )
        self.hidden_work = Work.objects.create(
            category=self.hidden_category,
            title="隐藏作品",
            status=Work.Status.PUBLISHED,
            is_dev_data=True,
        )
        self.public_asset = MediaAsset.objects.create(
            access=MediaAsset.Access.PUBLIC,
            kind=MediaAsset.Kind.WORK,
            original=image_upload("public-work.png"),
            is_dev_data=True,
        )
        self.hidden_asset = MediaAsset.objects.create(
            access=MediaAsset.Access.PUBLIC,
            kind=MediaAsset.Kind.WORK,
            original=image_upload("hidden-work.png"),
            is_dev_data=True,
        )
        WorkImage.objects.create(
            work=self.visible_work,
            media=self.public_asset,
            kind=WorkImage.Kind.COVER,
            alt_text="公开作品封面",
        )
        WorkImage.objects.create(
            work=self.hidden_work,
            media=self.hidden_asset,
            kind=WorkImage.Kind.COVER,
            alt_text="隐藏作品封面",
        )

    def test_public_lists_never_leak_hidden_categories_or_works(self):
        categories = self.client.get("/api/v1/categories")
        works = self.client.get("/api/v1/works")

        self.assertEqual([item["id"] for item in categories.json()], [str(self.visible_category.pk)])
        self.assertEqual([item["id"] for item in works.json()["results"]], [str(self.visible_work.pk)])
        self.assertEqual(self.client.get(f"/api/v1/works/{self.hidden_work.slug}").status_code, 404)

    def test_public_media_requires_a_currently_visible_reference(self):
        visible_response = self.client.get(f"/api/v1/media/public/{self.public_asset.pk}?variant=thumbnail")
        self.assertEqual(visible_response.status_code, 200)
        visible_response.close()
        self.assertEqual(self.client.get(f"/api/v1/media/public/{self.hidden_asset.pk}").status_code, 404)

    def test_process_post_linked_to_hidden_work_is_not_public(self):
        visible_post = PublicProcessPost.objects.create(
            title="独立公开日志",
            body="真实制作记录",
            status=PublicProcessPost.Status.PUBLISHED,
            is_dev_data=True,
        )
        hidden_post = PublicProcessPost.objects.create(
            work=self.hidden_work,
            title="隐藏作品日志",
            body="不应公开",
            status=PublicProcessPost.Status.PUBLISHED,
            is_dev_data=True,
        )

        response = self.client.get("/api/v1/public-process")
        ids = [item["id"] for item in response.json()["results"]]
        self.assertIn(str(visible_post.pk), ids)
        self.assertNotIn(str(hidden_post.pk), ids)

    def test_chinese_titles_receive_stable_ascii_slugs(self):
        self.assertTrue(self.visible_category.slug.startswith("category-"))
        self.assertTrue(self.visible_work.slug.startswith("work-"))
        post = PublicProcessPost.objects.create(title="中文日志", body="内容", is_dev_data=True)
        self.assertTrue(post.slug.startswith("process-"))
