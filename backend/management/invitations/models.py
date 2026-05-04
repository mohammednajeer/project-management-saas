import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta


class Invitation(models.Model):

    ROLE_CHOICES = [
        ("manager", "Manager"),
        ("employee", "Employee"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    email = models.EmailField()

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="invitations"
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="employee"
    )

    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )

    is_used = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=2)  # 2 days validity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} - {self.organization.name}"