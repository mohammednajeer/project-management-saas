from django.urls import path

from .views import (
    CalendarEventDetailView,
    CalendarEventListCreateView,
    CalendarFeedView,
)

urlpatterns = [
    path("events/", CalendarEventListCreateView.as_view()),
    path("events/<uuid:event_id>/", CalendarEventDetailView.as_view()),
    path("feed/", CalendarFeedView.as_view()),
]

