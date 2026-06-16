from django.db import models
from pgvector.django import VectorField
from organizations.models import Organization

class Document(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="documents"
    )

    source_type = models.CharField(
        max_length=50,
        default="manual"
    )

    source_id = models.CharField(
        max_length=100,
        default="0"
    )

    title = models.CharField(
        max_length=255
    )

    content = models.TextField()

    embedding = VectorField(
        dimensions=384
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )