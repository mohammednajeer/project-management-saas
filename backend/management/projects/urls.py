from django.urls import path
from .views import (
    ProjectDetailView,
    ProjectListCreateView,
    ProjectMembersView,
    ProjectMilestoneDetailView,
    ProjectMilestoneListCreateView,
    ProjectTeamWorkloadView,
)

urlpatterns = [
    path("", ProjectListCreateView.as_view()),
    path("<uuid:project_id>/", ProjectDetailView.as_view()),
    path("<uuid:project_id>/members/", ProjectMembersView.as_view()),
    path(
        "<uuid:project_id>/team-workload/",
        ProjectTeamWorkloadView.as_view(),
    ),
    path(
        "<uuid:project_id>/milestones/",
        ProjectMilestoneListCreateView.as_view(),
    ),
    path(
        "<uuid:project_id>/milestones/<uuid:milestone_id>/",
        ProjectMilestoneDetailView.as_view(),
    ),
]
