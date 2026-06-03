from django.db import models

# Create your models here.
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
