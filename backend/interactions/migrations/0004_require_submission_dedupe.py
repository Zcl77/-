from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("interactions", "0003_populate_submission_dedupe")]

    operations = [
        migrations.AlterField(
            model_name="review",
            name="submission_fingerprint",
            field=models.CharField(db_index=True, editable=False, max_length=64, verbose_name="防重复指纹"),
        ),
        migrations.AlterField(
            model_name="review",
            name="submission_bucket",
            field=models.PositiveBigIntegerField(editable=False, verbose_name="防重复时间段"),
        ),
        migrations.AlterField(
            model_name="inquiry",
            name="submission_fingerprint",
            field=models.CharField(db_index=True, editable=False, max_length=64, verbose_name="防重复指纹"),
        ),
        migrations.AlterField(
            model_name="inquiry",
            name="submission_bucket",
            field=models.PositiveBigIntegerField(editable=False, verbose_name="防重复时间段"),
        ),
    ]
