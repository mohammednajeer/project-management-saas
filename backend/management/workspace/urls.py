from django.urls import path

from .views import (
    WorkspaceDashboardView,
    WorkspaceTasksView,
    WorkspaceSubTasksView,
    WorkspaceSubTaskStatusUpdateView,
)

urlpatterns = [
    path("dashboard/", WorkspaceDashboardView.as_view()),
    path( "tasks/", WorkspaceTasksView.as_view()),
    path("subtasks/",WorkspaceSubTasksView.as_view()),
    path(
        "subtasks/<uuid:subtask_id>/",
        WorkspaceSubTaskStatusUpdateView.as_view()
    ),
]
