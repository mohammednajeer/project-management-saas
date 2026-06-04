from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


def refresh_all_project_health(apps, schema_editor):
    Project = apps.get_model("projects", "Project")
    for project in Project.objects.all():
        project.health = "healthy"
        project.save(update_fields=["health"])


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0003_alter_project_status"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="health",
            field=models.CharField(
                choices=[
                    ("healthy", "Healthy"),
                    ("attention", "Attention"),
                    ("at_risk", "At Risk"),
                ],
                db_index=True,
                default="healthy",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="project",
            name="health_updated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="project",
            name="project_lead",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="led_projects",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name="ProjectMilestone",
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
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, null=True)),
                ("target_date", models.DateField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("in_progress", "In Progress"),
                            ("completed", "Completed"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="milestones",
                        to="projects.project",
                    ),
                ),
            ],
            options={
                "ordering": ["target_date", "created_at"],
            },
        ),
        migrations.RunPython(
            refresh_all_project_health,
            migrations.RunPython.noop,
        ),
    ]
