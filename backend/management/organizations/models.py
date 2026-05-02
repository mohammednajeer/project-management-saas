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

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.name