from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Notification
from .realtime import send_realtime_notification


@receiver(post_save, sender=Notification)
def send_notification_on_create(sender, instance, created, **kwargs):
    if not created:
        return

    send_realtime_notification(
        instance.user.id,
        {
            "id": str(instance.id),
            "title": instance.title,
            "message": instance.message,
            "type": instance.type,
            "created_at": instance.created_at.isoformat(),
            "is_read": instance.is_read,
        },
    )
