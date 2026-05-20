from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db import OperationalError, ProgrammingError
from django.db.models import Q
from django.db.models import Count
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




class ActivityFeedView(APIView):

    permission_classes = [IsAuthenticated, IsEmployee]

    def get(self, request):

        limit = request.query_params.get("limit")

        activities = (
            Activity.objects
            .filter(
                organization=request.user.organization
            )
            .filter(
                Q(user=request.user) |
                Q(task__assigned_to=request.user) |
                Q(task__subtasks__assigned_to=request.user) |
                Q(subtask__assigned_to=request.user)
            )
            .select_related(
                "user",
                "project",
                "task",
                "subtask",
            )
            .distinct()
            .order_by("-created_at")
        )

        if limit:
            try:
                limit = min(max(int(limit), 1), 100)
            except (TypeError, ValueError):
                limit = 100
        else:
            limit = 100

        activities = activities[:limit]

        serializer = ActivitySerializer(
            activities,
            many=True,
        )

        return Response(serializer.data)
    
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
                    "project__organization",
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

        today = timezone.localdate()

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
            "description": task.project.description,
            "status": task.project.status,
            "priority": task.project.priority,
            "due_date": task.project.due_date,
            "organization": (
                task.project.organization.name
                if task.project.organization
                else None
            ),
            "progress": task_data.get("progress", 0),
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

        task_members = (
            User.objects
            .filter(
                Q(assigned_tasks=task) |
                Q(assigned_subtasks__task=task)
            )
            .distinct()
            .annotate(
                assigned_subtasks_count=Count(
                    "assigned_subtasks",
                    filter=Q(assigned_subtasks__task=task),
                    distinct=True,
                )
            )
        )

        team_data = [
            {
                "id": str(member.id),
                "name": member.name,
                "email": member.email,
                "role": member.role,
                "designation": member.designation,
                "department": member.department,
                "work_status": member.work_status,
                "assigned_subtasks_count":
                    member.assigned_subtasks_count,
            }
            for member in task_members
        ]

        issue_data = []

        for issue in issues:
            attachments = []

            try:
                attachments = [
                    {
                        "id": str(attachment.id),
                        "file": attachment.file.url,
                        "original_name": attachment.original_name,
                        "uploaded_at": attachment.uploaded_at,
                        "uploaded_by_data": {
                            "id": str(attachment.uploaded_by.id),
                            "name": attachment.uploaded_by.name,
                            "email": attachment.uploaded_by.email,
                            "role": attachment.uploaded_by.role,
                        },
                        "file_size": attachment.file.size,
                    }
                    for attachment in issue.attachments.select_related(
                        "uploaded_by"
                    ).all()
                ]

            except (AttributeError, OperationalError, ProgrammingError):
                attachments = []

            issue_data.append(
                {
                    "id": str(issue.id),
                    "title": issue.title,
                    "description": issue.description,
                    "project": str(issue.project_id),
                    "project_data": {
                        "id": str(issue.project.id),
                        "name": issue.project.name,
                    },
                    "task": (
                        str(issue.task_id)
                        if issue.task_id
                        else None
                    ),
                    "task_data": (
                        {
                            "id": str(issue.task.id),
                            "title": issue.task.title,
                        }
                        if issue.task
                        else None
                    ),
                    "subtask": (
                        str(issue.subtask_id)
                        if issue.subtask_id
                        else None
                    ),
                    "subtask_data": (
                        {
                            "id": str(issue.subtask.id),
                            "title": issue.subtask.title,
                        }
                        if issue.subtask
                        else None
                    ),
                    "raised_by": str(issue.raised_by_id),
                    "raised_by_data": {
                        "id": str(issue.raised_by.id),
                        "name": issue.raised_by.name,
                        "email": issue.raised_by.email,
                        "role": issue.raised_by.role,
                    },
                    "assigned_to": (
                        str(issue.assigned_to_id)
                        if issue.assigned_to_id
                        else None
                    ),
                    "assigned_to_data": (
                        {
                            "id": str(issue.assigned_to.id),
                            "name": issue.assigned_to.name,
                            "email": issue.assigned_to.email,
                            "role": issue.assigned_to.role,
                        }
                        if issue.assigned_to
                        else None
                    ),
                    "status": issue.status,
                    "priority": issue.priority,
                    "attachments": attachments,
                    "created_at": issue.created_at,
                    "updated_at": issue.updated_at,
                }
            )

        insights = {
            "total_subtasks": subtasks.count(),
            "completed_subtasks": subtasks.filter(
                status="done"
            ).count(),
            "review_subtasks": subtasks.filter(
                status="review"
            ).count(),
            "overdue_subtasks": subtasks.filter(
                due_date__lt=today
            ).exclude(
                status="done"
            ).count(),
            "completion_rate": task_data.get("progress", 0),
            "blockers_count": issues.exclude(
                status__in=["resolved", "closed"]
            ).count(),
        }

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
                "issues": issue_data,
                "team": team_data,
                "insights": insights,
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
