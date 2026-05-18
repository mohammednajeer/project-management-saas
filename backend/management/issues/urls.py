from django.urls import path

from .views import (
    IssueListCreateView,
    IssueUpdateView,
)

urlpatterns = [

    path("", IssueListCreateView.as_view()),
    path("<uuid:issue_id>/",IssueUpdateView.as_view()),
]