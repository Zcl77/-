from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("projects", "0003_populate_message_dedupe")]

    operations = [
        migrations.AlterField(
            model_name="projectmessage",
            name="submission_fingerprint",
            field=models.CharField(db_index=True, editable=False, max_length=64, verbose_name="防重复指纹"),
        ),
        migrations.AlterField(
            model_name="projectmessage",
            name="submission_bucket",
            field=models.PositiveBigIntegerField(editable=False, verbose_name="防重复时间段"),
        ),
    ]
