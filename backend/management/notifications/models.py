import uuid
from django.db import models


class Notification(models.Model):

    TYPE_CHOICES = [
        ("task_assigned", "Task Assigned"),
        ("subtask_assigned", "Subtask Assigned"),
        ("comment_added", "Comment Added"),
        ("leave_requested", "Leave Requested"),
        ("leave_approved", "Leave Approved"),
        ("leave_rejected", "Leave Rejected"),
        ("company_event_created", "Company Event Created"),
        ("task_reminder", "Task Reminder"),
        ("task_overdue", "Task Overdue"),
        ("subtask_reminder", "Subtask Reminder"),
        ("subtask_overdue", "Subtask Overdue"),
        ("project_reminder", "Project Reminder"),
        ("project_overdue", "Project Overdue"),
        ("milestone_reminder", "Milestone Reminder"),
        ("milestone_completed", "Milestone Completed"),
        ("milestone_overdue", "Milestone Overdue"),
        ("welcome_organization_creator", "Welcome Organization Creator"),
        ("welcome_employee", "Welcome Employee"),
        ("daily_digest", "Daily Digest"),
        ("weekly_summary", "Weekly Summary"),
    ]

    CATEGORY_CHOICES = [
        ("task", "Task"),
        ("project", "Project"),
        ("issue", "Issue"),
        ("calendar", "Calendar"),
        ("leave", "Leave"),
        ("milestone", "Milestone"),
        ("system", "System"),
        ("chat", "Chat"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    title = models.CharField(
        max_length=255
    )

    message = models.TextField()

    type = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES
    )

    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default="system"
    )

    is_read = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):

        return (
            f"{self.user.name} - "
            f"{self.title}"
        )
