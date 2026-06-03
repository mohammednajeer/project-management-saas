import uuid

from django.db import models


class CalendarEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ("holiday", "Holiday"),
        ("company_event", "Company Event"),
        ("meeting", "Meeting"),
        ("deadline", "Deadline"),
        ("milestone", "Milestone"),
        ("announcement", "Announcement"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="calendar_events"
    )

    title = models.CharField(max_length=255)

    description = models.TextField(
        blank=True,
        default=""
    )

    notes = models.TextField(
        blank=True,
        default=""
    )

    event_type = models.CharField(
        max_length=30,
        choices=EVENT_TYPE_CHOICES
    )

    start_date = models.DateField()

    end_date = models.DateField()

    visibility = models.CharField(
        max_length=20,
        choices=[
            ("organization", "Organization"),
            ("private", "Private"),
        ],
        default="organization"
    )

    is_recurring = models.BooleanField(
        default=False
    )

    recurrence_pattern = models.CharField(
        max_length=30,
        choices=[
            ("none", "None"),
            ("daily", "Daily"),
            ("weekly", "Weekly"),
            ("biweekly", "Every Two Weeks"),
            ("monthly", "Monthly"),
            ("first_friday", "First Friday of Month"),
        ],
        default="none"
    )

    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="created_calendar_events"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["start_date", "title"]

    def __str__(self):
        return self.title


