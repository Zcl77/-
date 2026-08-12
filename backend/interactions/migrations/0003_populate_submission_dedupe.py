import hashlib

from django.db import migrations


def populate_submission_dedupe(apps, schema_editor):
    for model_name in ("Review", "Inquiry"):
        model = apps.get_model("interactions", model_name)
        for item in model.objects.filter(submission_fingerprint__isnull=True).iterator():
            fingerprint = hashlib.sha256(f"legacy:{model_name}:{item.pk}".encode("utf-8")).hexdigest()
            bucket = int(item.created_at.timestamp() // 600)
            model.objects.filter(pk=item.pk).update(
                submission_fingerprint=fingerprint,
                submission_bucket=bucket,
            )


class Migration(migrations.Migration):
    dependencies = [("interactions", "0002_submission_dedupe_inquiry_orders_and_labels")]

    operations = [migrations.RunPython(populate_submission_dedupe, migrations.RunPython.noop)]
