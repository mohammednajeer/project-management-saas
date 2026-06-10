import uuid

from django.db import models


class Activity(models.Model):

    ACTION_CHOICES = [

        ("task_created", "Task Created"),

        ("task_updated", "Task Updated"),

        ("task_deleted", "Task Deleted"),

        ("subtask_created", "Subtask Created"),

        ("subtask_updated", "Subtask Updated"),

        ("subtask_completed", "Subtask Completed"),

        ("comment_added", "Comment Added"),

        ("member_added", "Member Added"),

        ("project_created", "Project Created"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True
    )

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True
    )

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True
    )

    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True
    )

    subtask = models.ForeignKey(
        "tasks.SubTask",
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True
    )

    action = models.CharField(
        max_length=100,
        choices=ACTION_CHOICES
    )

    message = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:

        ordering = ["-created_at"]

    def __str__(self):

        name = self.user.name if self.user else "System"
        return (
            f"{name} - "
            f"{self.action}"
        )