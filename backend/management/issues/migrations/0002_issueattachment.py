import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_user_bio_user_department_user_designation_and_more"),
        ("issues", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="IssueAttachment",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "file",
                    models.FileField(
                        upload_to="issue_attachments/",
                    ),
                ),
                (
                    "original_name",
                    models.CharField(
                        max_length=255,
                    ),
                ),
                (
                    "uploaded_at",
                    models.DateTimeField(
                        auto_now_add=True,
                    ),
                ),
                (
                    "issue",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="attachments",
                        to="issues.issue",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="issue_attachments",
                        to="accounts.user",
                    ),
                ),
            ],
        ),
    ]
