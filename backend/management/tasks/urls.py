from django.urls import path
from .views import ProjectTaskListCreateView,SubTaskListCreateView

urlpatterns = [
    path(
        "project/<uuid:project_id>/",
        ProjectTaskListCreateView.as_view()
    ),
    path(
    "subtasks/<uuid:task_id>/",
        SubTaskListCreateView.as_view()
    ),
]