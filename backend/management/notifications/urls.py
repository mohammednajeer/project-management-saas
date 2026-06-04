from django.urls import path

from .views import (
    NotificationListView,
    NotificationReadView,
    NotificationMarkAllReadView,
)

urlpatterns = [

    path(
        "",
        NotificationListView.as_view()
    ),

    path(
        "mark-all-read/",
        NotificationMarkAllReadView.as_view()
    ),

    path(
        "<uuid:notification_id>/read/",
        NotificationReadView.as_view()
    ),
]