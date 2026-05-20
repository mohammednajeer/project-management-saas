from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Q
from django.utils import timezone

from accounts.models import User
from accounts.permissions import IsEmployee
from notifications.models import Notification
from tasks.models import (
    Task,
    SubTask,
    TaskComment,
)
from tasks.serializers import (
    TaskSerializer,
    SubTaskSerializer,
    TaskAttachmentSerializer,
    SubTaskAttachmentSerializer,
    TaskCommentSerializer,
)
from activities.models import Activity
from activities.serializers import ActivitySerializer
from issues.models import Issue
from issues.serializers import IssueSerializer


ALLOWED_SUBTASK_STATUSES = [
    "todo",
    "in_progress",
    "review",
    "done",
]


def create_subtask_status_notifications(
    subtask,
    employee,
):
    task = subtask.task

    recipients = set()

    if task.created_by != employee:
        recipients.add(task.created_by)

    managers = User.objects.filter(
        organization=employee.organization,
        role__in=[
            "admin",
            "manager",
        ],
    ).exclude(id=employee.id)

    recipients.update(managers)

    message = (
        f"{employee.name} changed subtask "
        f"{subtask.title} status to "
        f"{subtask.status}"
    )

    for user in recipients:
        Notification.objects.create(
            user=user,
            title="Subtask status updated",
            message=message,
            type="comment_added",
        )


class WorkspaceTasksView(APIView):

    permission_classes = [IsAuthenticated, IsEmployee]

    def get(self, request):

        tasks = Task.objects.filter(
            assigned_to=request.user
        ).distinct()

        serializer = TaskSerializer(
            tasks,
            many=True
        )

        return Response(serializer.data)


class WorkspaceSubTasksView(APIView):

    permission_classes = [IsAuthenticated, IsEmployee]

    def get(self, request):

        subtasks = SubTask.objects.filter(
            assigned_to=request.user
        ).distinct()

        serializer = SubTaskSerializer(
            subtasks,
            many=True
        )

        return Response(serializer.data)


class WorkspaceDashboardView(APIView):

    permission_classes = [IsAuthenticated, IsEmployee]

    def get(self, request):

        today = timezone.localdate()
        next_week = today + timezone.timedelta(days=7)

        assigned_tasks = Task.objects.filter(
            assigned_to=request.user
        ).distinct()

        assigned_subtasks = SubTask.objects.filter(
            assigned_to=request.user
        ).select_related(
            "task",
            "task__project",
        ).distinct()

        assigned_tasks_count = assigned_tasks.count()
        assigned_subtasks_count = assigned_subtasks.count()

        completed_subtasks_count = assigned_subtasks.filter(
            status="done"
        ).count()

        pending_subtasks_count = assigned_subtasks.exclude(
            status="done"
        ).count()

        review_subtasks_count = assigned_subtasks.filter(
            status="review"
        ).count()

        overdue_subtasks_count = assigned_subtasks.filter(
            due_date__lt=today
        ).exclude(
            status="done"
        ).count()

        high_priority_subtasks_count = assigned_subtasks.filter(
            Q(priority="high") |
            Q(priority="critical")
        ).count()

        critical_subtasks_count = assigned_subtasks.filter(
            priority="critical"
        ).count()

        completion_rate = 0

        if assigned_subtasks_count:
            completion_rate = round(
                (
                    completed_subtasks_count /
                    assigned_subtasks_count
                ) * 100
            )

        recent_subtasks = assigned_subtasks.order_by(
            "-created_at"
        )[:5]

        upcoming_deadlines = assigned_subtasks.filter(
            due_date__gte=today,
            due_date__lte=next_week,
        ).exclude(
            status="done"
        ).order_by(
            "due_date",
            "-created_at",
        )[:5]

        return Response(
            {
                "assigned_tasks":
                    assigned_tasks_count,
                "assigned_subtasks":
                    assigned_subtasks_count,
                "completed_subtasks":
                    completed_subtasks_count,
                "pending_subtasks":
                    pending_subtasks_count,
                "review_subtasks":
                    review_subtasks_count,
                "overdue_subtasks":
                    overdue_subtasks_count,
                "completion_rate":
                    completion_rate,
                "high_priority_subtasks":
                    high_priority_subtasks_count,
                "critical_subtasks":
                    critical_subtasks_count,
                "recent_subtasks":
                    SubTaskSerializer(
                        recent_subtasks,
                        many=True
                    ).data,
                "upcoming_deadlines":
                    SubTaskSerializer(
                        upcoming_deadlines,
                        many=True
                    ).data,
            }
        )
from activities.utils import create_activity

class WorkspaceSubTaskStatusUpdateView(APIView):

    permission_classes = [IsAuthenticated, IsEmployee]

    def patch(self, request, subtask_id):

        requested_fields = set(request.data.keys())

        if requested_fields - {"status"}:
            return Response(
                {
                    "message":
                    "Only status can be updated"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        new_status = request.data.get("status")

        if new_status not in ALLOWED_SUBTASK_STATUSES:
            return Response(
                {
                    "message":
                    "Invalid status"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            subtask = SubTask.objects.select_related(
                "task",
                "task__created_by",
                "task__project",
            ).get(
                id=subtask_id,
                task__project__organization=
                    request.user.organization,
            )

        except SubTask.DoesNotExist:
            return Response(
                {
                    "message":
                    "Subtask not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if not subtask.assigned_to.filter(
            id=request.user.id
        ).exists():
            return Response(
                {
                    "message":
                    "You are not allowed to update this subtask"
                },
                status=status.HTTP_403_FORBIDDEN
            )

        if subtask.status != new_status:
            subtask.status = new_status
            subtask.save(
                update_fields=["status"]
            )
            create_subtask_status_notifications(
                subtask,
                request.user,
            )
            create_activity(
                organization=request.user.organization,
                user=request.user,
                action="subtask_updated",
                message=(
                    f"{request.user.name} "
                    f"changed subtask "
                    f"'{subtask.title}' "
                    f"status to "
                    f"'{new_status}'"
                ),
                project=subtask.task.project,
                task=subtask.task,
                subtask=subtask,
            )


        serializer = SubTaskSerializer(subtask)

        return Response(serializer.data)




from activities.models import Activity


class ActivityFeedView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        activities = (
            Activity.objects
            .filter(user=request.user)
            .order_by("-created_at")[:10]
        )

        data = []

        for activity in activities:

            data.append({
                "id": str(activity.id),
                "message": activity.message,
                "type": activity.action,
                "created_at": activity.created_at,
            })

        return Response(data)
    
class MyTasksView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        subtasks = (
            SubTask.objects
            .filter(
                assigned_to=request.user
            )
            .select_related(
                "task",
                "task__project"
            )
            .order_by("due_date")
        )

        data = []

        for subtask in subtasks:

            data.append({

                "id": str(subtask.id),

                "title": subtask.title,

                "status": subtask.status,

                "priority": subtask.priority,

                "due_date": subtask.due_date,

                "task": {
                    "id": str(subtask.task.id),
                    "title": subtask.task.title,
                },

                "project": {
                    "id": str(
                        subtask.task.project.id
                    ),
                    "title": (
                        subtask.task.project.name
                    ),
                },
            })

        return Response(data)


class EmployeeTaskWorkspaceView(APIView):

    permission_classes = [IsAuthenticated, IsEmployee]

    def get(self, request, task_id):

        try:
            task = (
                Task.objects
                .select_related(
                    "project",
                    "created_by",
                )
                .prefetch_related(
                    "assigned_to",
                    "subtasks",
                    "subtasks__assigned_to",
                    "subtasks__attachments",
                    "subtasks__comments",
                    "attachments",
                    "comments",
                )
                .filter(
                    id=task_id,
                    project__organization=request.user.organization,
                    subtasks__assigned_to=request.user,
                )
                .distinct()
                .get()
            )

        except Task.DoesNotExist:
            return Response(
                {
                    "message":
                    "Task workspace not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        subtasks = (
            task.subtasks
            .all()
            .prefetch_related(
                "assigned_to",
                "attachments",
                "comments",
            )
            .order_by(
                "due_date",
                "created_at",
            )
        )

        editable_subtask_ids = [
            str(subtask.id)
            for subtask in subtasks
            if subtask.assigned_to.filter(
                id=request.user.id
            ).exists()
        ]

        subtask_data = []

        for subtask in subtasks:
            data = SubTaskSerializer(subtask).data
            data["is_assigned_to_me"] = (
                str(subtask.id) in editable_subtask_ids
            )
            data["comments_count"] = subtask.comments.count()
            data["attachments_count"] = subtask.attachments.count()
            data["attachments"] = SubTaskAttachmentSerializer(
                subtask.attachments.select_related(
                    "uploaded_by"
                ).order_by("-uploaded_at"),
                many=True,
            ).data
            subtask_data.append(data)

        task_data = TaskSerializer(task).data
        task_data["project_data"] = {
            "id": str(task.project.id),
            "name": task.project.name,
            "status": task.project.status,
            "priority": task.project.priority,
            "due_date": task.project.due_date,
        }
        task_data["created_by_data"] = {
            "id": str(task.created_by.id),
            "name": task.created_by.name,
            "email": task.created_by.email,
            "role": task.created_by.role,
        }
        task_data["comments_count"] = task.comments.count()
        task_data["attachments_count"] = task.attachments.count()

        comments = (
            TaskComment.objects
            .filter(task=task)
            .select_related(
                "user",
                "subtask",
            )
            .order_by("-created_at")
        )

        activities = (
            Activity.objects
            .filter(task=task)
            .select_related(
                "user",
                "project",
                "task",
                "subtask",
            )
            .order_by("-created_at")[:50]
        )

        issues = (
            Issue.objects
            .filter(task=task)
            .select_related(
                "raised_by",
                "assigned_to",
                "project",
                "task",
                "subtask",
            )
            .order_by("-created_at")
        )

        return Response(
            {
                "task": task_data,
                "subtasks": subtask_data,
                "comments": TaskCommentSerializer(
                    comments,
                    many=True,
                ).data,
                "attachments": TaskAttachmentSerializer(
                    task.attachments.select_related(
                        "uploaded_by"
                    ).order_by("-uploaded_at"),
                    many=True,
                ).data,
                "activities": ActivitySerializer(
                    activities,
                    many=True,
                ).data,
                "issues": IssueSerializer(
                    issues,
                    many=True,
                ).data,
                "permissions": {
                    "can_edit_task": False,
                    "can_comment": True,
                    "can_raise_issue": True,
                    "can_upload_task_attachment": False,
                    "editable_subtasks": editable_subtask_ids,
                    "readonly_subtasks": [
                        str(subtask.id)
                        for subtask in subtasks
                        if str(subtask.id)
                        not in editable_subtask_ids
                    ],
                },
            }
        )
