import tempfile

from django.core.exceptions import ValidationError
from django.test import TransactionTestCase, override_settings

from common.tests.utils import image_upload
from media_library.models import MediaAsset
from portfolio.models import Category, Work, WorkImage


class ImageLifecycleTests(TransactionTestCase):
    def setUp(self):
        self.media_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.media_directory.cleanup)
        self.settings_override = override_settings(MEDIA_ROOT=self.media_directory.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)

    def create_public_asset(self, name="work.png"):
        return MediaAsset.objects.create(
            access=MediaAsset.Access.PUBLIC,
            kind=MediaAsset.Kind.WORK,
            original=image_upload(name),
            is_dev_data=True,
        )

    def test_valid_upload_keeps_original_and_generates_webp_derivatives(self):
        asset = self.create_public_asset()

        self.assertEqual(asset.detected_content_type, "image/png")
        self.assertEqual((asset.width, asset.height), (32, 24))
        self.assertTrue(asset.original.storage.exists(asset.original.name))
        self.assertTrue(asset.display.name.endswith("display.webp"))
        self.assertTrue(asset.thumbnail.name.endswith("thumbnail.webp"))
        self.assertTrue(asset.display.storage.exists(asset.display.name))
        self.assertTrue(asset.thumbnail.storage.exists(asset.thumbnail.name))

    def test_mismatched_extension_and_real_content_is_rejected_without_files(self):
        asset = MediaAsset(
            access=MediaAsset.Access.PUBLIC,
            kind=MediaAsset.Kind.WORK,
            original=image_upload("pretend.jpg", image_format="PNG", content_type="image/jpeg"),
            is_dev_data=True,
        )

        with self.assertRaises(ValidationError):
            asset.save()

        self.assertEqual(MediaAsset.objects.count(), 0)

    def test_excessive_pixel_dimension_is_rejected_before_persistent_save(self):
        asset = MediaAsset(
            access=MediaAsset.Access.PUBLIC,
            kind=MediaAsset.Kind.WORK,
            original=image_upload("too-wide.png", size=(12001, 1)),
            is_dev_data=True,
        )
        with self.assertRaises(ValidationError):
            asset.save()
        self.assertEqual(MediaAsset.objects.count(), 0)

    def test_deleting_asset_removes_all_file_variants(self):
        asset = self.create_public_asset()
        storage = asset.original.storage
        names = [asset.original.name, asset.display.name, asset.thumbnail.name]

        asset.delete()

        self.assertTrue(all(not storage.exists(name) for name in names))

    def test_successful_reference_replacement_cleans_old_unreferenced_asset(self):
        category = Category.objects.create(name="替换测试", is_visible=True, is_dev_data=True)
        work = Work.objects.create(category=category, title="替换测试作品", is_dev_data=True)
        old_asset = self.create_public_asset("old.png")
        new_asset = self.create_public_asset("new.png")
        old_names = [old_asset.original.name, old_asset.display.name, old_asset.thumbnail.name]
        storage = old_asset.original.storage
        link = WorkImage.objects.create(work=work, media=old_asset, alt_text="旧图")

        link.media = new_asset
        link.alt_text = "新图"
        link.save()

        self.assertFalse(MediaAsset.objects.filter(pk=old_asset.pk).exists())
        self.assertTrue(all(not storage.exists(name) for name in old_names))
        self.assertEqual(WorkImage.objects.get(pk=link.pk).media_id, new_asset.pk)

    def test_failed_new_upload_leaves_existing_reference_and_files_untouched(self):
        category = Category.objects.create(name="失败测试", is_visible=True, is_dev_data=True)
        work = Work.objects.create(category=category, title="失败测试作品", is_dev_data=True)
        old_asset = self.create_public_asset("existing.png")
        old_names = [old_asset.original.name, old_asset.display.name, old_asset.thumbnail.name]
        storage = old_asset.original.storage
        link = WorkImage.objects.create(work=work, media=old_asset, alt_text="现有图片")
        invalid_asset = MediaAsset(
            access=MediaAsset.Access.PUBLIC,
            kind=MediaAsset.Kind.WORK,
            original=image_upload("invalid.jpg", image_format="PNG", content_type="image/jpeg"),
            is_dev_data=True,
        )

        with self.assertRaises(ValidationError):
            invalid_asset.save()

        link.refresh_from_db()
        self.assertEqual(link.media_id, old_asset.pk)
        self.assertTrue(all(storage.exists(name) for name in old_names))
