import uuid

from django.db import models


class Issue(models.Model):

    STATUS_CHOICES = [

        ("open", "Open"),

        ("investigating", "Investigating"),

        ("resolved", "Resolved"),

        ("closed", "Closed"),
    ]

    PRIORITY_CHOICES = [

        ("low", "Low"),

        ("medium", "Medium"),

        ("high", "High"),

        ("critical", "Critical"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    title = models.CharField(
        max_length=255
    )

    description = models.TextField()

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="issues"
    )

    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.CASCADE,
        related_name="issues",
        null=True,
        blank=True
    )

    subtask = models.ForeignKey(
        "tasks.SubTask",
        on_delete=models.CASCADE,
        related_name="issues",
        null=True,
        blank=True
    )

    raised_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="raised_issues"
    )

    assigned_to = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="assigned_issues",
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="open"
    )

    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="medium"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):

        return (
            f"{self.title} - "
            f"{self.status}"
        )


class IssueAttachment(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name="attachments"
    )

    uploaded_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="issue_attachments"
    )

    file = models.FileField(
        upload_to="issue_attachments/"
    )

    original_name = models.CharField(
        max_length=255
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):

        return (
            f"{self.issue.title} - "
            f"{self.original_name}"
        )
