from django.urls import path

from .views import (
    WorkspaceTasksView,
    WorkspaceSubTasksView,
)

urlpatterns = [
    path( "tasks/", WorkspaceTasksView.as_view()),
    path("subtasks/",WorkspaceSubTasksView.as_view()),
]