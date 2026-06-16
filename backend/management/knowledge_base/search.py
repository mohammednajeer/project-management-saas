from pgvector.django import CosineDistance

from .models import Document
from .embeddings import get_embedding


def search_documents(query, organization , threshold=0.50):

    query_embedding = get_embedding(query)

    return (
        Document.objects
        .filter(
            organization=organization
        )
        .annotate(
            distance=CosineDistance(
                "embedding",
                query_embedding
            )
        )
        .filter(distance__lte=threshold)
        .order_by("distance")[:5]
    )