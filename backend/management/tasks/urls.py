from django.urls import path
from .views import (
    ProjectTaskListCreateView,
    SubTaskListCreateView,
    SubTaskUpdateView,
    TaskUpdateView,
    TaskDetailView,
)
urlpatterns = [
    path("project/<uuid:project_id>/",ProjectTaskListCreateView.as_view()),
    path("subtasks/<uuid:task_id>/",SubTaskListCreateView.as_view()),
    path("subtask/<uuid:subtask_id>/",SubTaskUpdateView.as_view(),),
    path("task/<uuid:task_id>/",TaskUpdateView.as_view()),
    path("task-detail/<uuid:task_id>/", TaskDetailView.as_view()),

]
