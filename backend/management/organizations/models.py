import uuid
from django.db import models
import random
import string


def generate_company_code():
    prefix = ''.join(random.choices(string.ascii_uppercase, k=3))
    number = random.randint(1000, 9999)
    return f"{prefix}-{number}"

class Organization(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    name = models.CharField(
        max_length=255
    )

    company_code = models.CharField(
        max_length=10,
        unique=True,
        default=generate_company_code,
        editable=False,
    )

    email = models.EmailField()

    phone = models.CharField(
        max_length=20
    )

    logo = models.ImageField(
        upload_to="organization_logos/",
        null=True,
        blank=True
    )

    industry = models.CharField(
        max_length=255,
        blank=True,
        default=""
    )

    website = models.URLField(
        blank=True,
        default=""
    )

    address = models.TextField(
        blank=True,
        default=""
    )

    city = models.CharField(
        max_length=120,
        blank=True,
        default=""
    )

    state = models.CharField(
        max_length=120,
        blank=True,
        default=""
    )

    country = models.CharField(
        max_length=120,
        blank=True,
        default=""
    )

    timezone = models.CharField(
        max_length=80,
        blank=True,
        default="UTC"
    )

    working_days = models.CharField(
        max_length=120,
        blank=True,
        default="Monday-Friday"
    )

    working_hours_start = models.TimeField(
        null=True,
        blank=True
    )

    working_hours_end = models.TimeField(
        null=True,
        blank=True
    )

    description = models.TextField(
        blank=True,
        default=""
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True
    )

    subscription_tier = models.CharField(
        max_length=20,
        choices=[("starter", "Starter"), ("pro", "Pro"), ("enterprise", "Enterprise")],
        default="pro"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.name
