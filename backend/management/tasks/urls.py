from django.urls import path
from .views import (
    ProjectTaskListCreateView,
    SubTaskListCreateView,
    SubTaskUpdateView,
    TaskUpdateView,
    TaskDetailView,
    TaskCommentListCreateView,
    TaskAttachmentUploadView,
    TaskAttachmentListView,
    TaskAttachmentDeleteView,
    SubTaskAttachmentUploadView,
    SubTaskAttachmentListView,
    SubTaskAttachmentDeleteView,
)
urlpatterns = [
    path("project/<uuid:project_id>/",ProjectTaskListCreateView.as_view()),
    path("subtasks/<uuid:task_id>/",SubTaskListCreateView.as_view()),
    path("subtask/<uuid:subtask_id>/",SubTaskUpdateView.as_view(),),
    path("task/<uuid:task_id>/",TaskUpdateView.as_view()),
    path("task-detail/<uuid:task_id>/", TaskDetailView.as_view()),
    path("comments/<uuid:task_id>/",TaskCommentListCreateView.as_view(),),
    path( "<uuid:task_id>/attachments/", TaskAttachmentListView.as_view(),),
    path( "<uuid:task_id>/attachments/upload/",TaskAttachmentUploadView.as_view(),),
    path(
    "attachments/<uuid:attachment_id>/delete/",
        TaskAttachmentDeleteView.as_view(),
    ),

    path(
        "subtasks/<uuid:subtask_id>/attachments/",
        SubTaskAttachmentListView.as_view(),
    ),

    path(
        "subtasks/<uuid:subtask_id>/attachments/upload/",
        SubTaskAttachmentUploadView.as_view(),
    ),

    path(
        "subtasks/attachments/<uuid:attachment_id>/delete/",
        SubTaskAttachmentDeleteView.as_view(),
    ),
]
