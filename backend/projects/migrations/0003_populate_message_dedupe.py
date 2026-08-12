import hashlib

from django.db import migrations


def populate_message_dedupe(apps, schema_editor):
    message_model = apps.get_model("projects", "ProjectMessage")
    for message in message_model.objects.filter(submission_fingerprint__isnull=True).iterator():
        fingerprint = hashlib.sha256(f"legacy:ProjectMessage:{message.pk}".encode("utf-8")).hexdigest()
        bucket = int(message.created_at.timestamp() // 60)
        message_model.objects.filter(pk=message.pk).update(
            submission_fingerprint=fingerprint,
            submission_bucket=bucket,
        )


class Migration(migrations.Migration):
    dependencies = [("projects", "0002_quote_workflow_and_admin_labels")]

    operations = [migrations.RunPython(populate_message_dedupe, migrations.RunPython.noop)]
