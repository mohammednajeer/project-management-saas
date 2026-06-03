from django.urls import path

from .views import (
    LeaveRequestActionView,
    LeaveRequestListCreateView,
    LeaveBalanceListUpdateView,
)

urlpatterns = [
    path("requests/", LeaveRequestListCreateView.as_view()),
    path("requests/<uuid:leave_id>/<str:action>/", LeaveRequestActionView.as_view()),
    path("balances/", LeaveBalanceListUpdateView.as_view()),
    path("balances/<uuid:balance_id>/", LeaveBalanceListUpdateView.as_view()),
]


