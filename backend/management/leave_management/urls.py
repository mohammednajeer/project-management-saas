from django.urls import path

from .views import (
    LeaveRequestActionView,
    LeaveRequestListCreateView,
)

urlpatterns = [
    path("requests/", LeaveRequestListCreateView.as_view()),
    path("requests/<uuid:leave_id>/<str:action>/", LeaveRequestActionView.as_view()),
]

