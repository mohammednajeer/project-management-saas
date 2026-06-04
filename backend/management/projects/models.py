import uuid
from django.db import models


class Project(models.Model):
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    STATUS_CHOICES = [
        ("planning", "Planning"),
        ("active", "Active"),
        ("on_hold", "On Hold"),
        ("completed", "Completed"),
        ("archived", "Archived"),
    ]

    HEALTH_CHOICES = [
        ("healthy", "Healthy"),
        ("attention", "Attention"),
        ("at_risk", "At Risk"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(max_length=255)

    description = models.TextField(blank=True, null=True)

    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="medium",
    )

    due_date = models.DateField(null=True, blank=True)

    is_overdue = models.BooleanField(default=False)

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="projects",
    )

    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="created_projects",
    )

    project_lead = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="led_projects",
        null=True,
        blank=True,
    )

    members = models.ManyToManyField(
        "accounts.User",
        related_name="projects",
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active",
    )

    health = models.CharField(
        max_length=20,
        choices=HEALTH_CHOICES,
        default="healthy",
        db_index=True,
    )

    health_updated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ProjectMilestone(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="milestones",
    )

    title = models.CharField(max_length=255)

    description = models.TextField(blank=True, null=True)

    target_date = models.DateField()

    is_overdue = models.BooleanField(default=False)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["target_date", "created_at"]

    def __str__(self):
        return f"{self.title} ({self.project.name})"
