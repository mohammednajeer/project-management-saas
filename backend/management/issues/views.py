from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Issue
from .serializers import IssueSerializer
from projects.models import Project
from tasks.models import (
    Task,
    SubTask,
)
from accounts.models import User
from accounts.permissions import (IsManagerOrAdmin)
from notifications.models import Notification
from notifications.realtime import (
    send_realtime_notification
)
from activities.utils import create_activity


class IssueListCreateView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def get(self, request):

        issues = (
            Issue.objects.filter(
                project__organization=request.user.organization
            )
            .select_related(
                "raised_by",
                "assigned_to",
                "project",
                "task",
                "subtask",
            )
            .order_by("-created_at")
        )

        serializer = IssueSerializer(
            issues,
            many=True
        )

        return Response(serializer.data)

    def post(self, request):

        serializer = IssueSerializer(
            data=request.data
        )

        if not serializer.is_valid():

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        project_id = request.data.get("project")

        try:

            project = Project.objects.get(
                id=project_id,
                organization=request.user.organization
            )

        except Project.DoesNotExist:

            return Response(
                {
                    "message": "Project not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        task = None
        subtask = None

        task_id = request.data.get("task")
        subtask_id = request.data.get("subtask")

        if task_id:

            try:

                task = Task.objects.get(
                    id=task_id,
                    project=project
                )

            except Task.DoesNotExist:

                return Response(
                    {
                        "message": "Task not found"
                    },
                    status=status.HTTP_404_NOT_FOUND
                )

        if subtask_id:

            try:

                subtask = SubTask.objects.get(
                    id=subtask_id,
                    task__project=project,
                )

            except SubTask.DoesNotExist:

                return Response(
                    {
                        "message": "Subtask not found"
                    },
                    status=status.HTTP_404_NOT_FOUND
                )

            if task and subtask.task_id != task.id:
                return Response(
                    {
                        "message":
                        "Subtask does not belong to this task"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not task:
                task = subtask.task

        if request.user.role == "employee":
            if not subtask:
                return Response(
                    {
                        "message":
                        "Employees can raise issues only for assigned subtasks"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not subtask.assigned_to.filter(
                id=request.user.id
            ).exists():
                return Response(
                    {
                        "message":
                        "You can raise issues only for assigned subtasks"
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

        issue = Issue.objects.create(
            title=request.data.get("title"),
            description=request.data.get("description"),
            project=project,
            task=task,
            subtask=subtask,
            raised_by=request.user,
            priority=request.data.get(
                "priority",
                "medium"
            ),
        )
        create_activity(
            organization=request.user.organization,
            user=request.user,
            action="issue_create",
            message=f'Raised issue "{issue.title}"',
            project=issue.project,
            task=issue.task,
            subtask=issue.subtask,
        )
        managers = User.objects.filter(
            organization=project.organization,
            role__in=["admin", "manager"]
        )

        for manager in managers:

            notification = Notification.objects.create(
                user=manager,
                title="New Issue Raised",
                message=(
                    f"{request.user.name} "
                    f"raised issue: "
                    f"{issue.title}"
                )
            )

            send_realtime_notification(
                manager.id,
                {
                    "id": str(notification.id),
                    "title": notification.title,
                    "message": notification.message,
                    "created_at": str(
                        notification.created_at
                    ),
                    "is_read": notification.is_read,
                }
            )

        response_serializer = IssueSerializer(
            issue
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
    

class IssueUpdateView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsManagerOrAdmin,
    ]

    def patch(self, request, issue_id):

        try:

            issue = Issue.objects.get(
                id=issue_id,
                project__organization=request.user.organization
            )

        except Issue.DoesNotExist:

            return Response(
                {
                    "message": "Issue not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )
        old_status = issue.status
        old_priority = issue.priority
        status_value = request.data.get("status")

        priority_value = request.data.get(
            "priority"
        )

        assigned_to_id = request.data.get(
            "assigned_to"
        )

        if status_value:
            issue.status = status_value

        if priority_value:
            issue.priority = priority_value

        if assigned_to_id:

            try:

                assigned_user = User.objects.get(
                    id=assigned_to_id,
                    organization=request.user.organization
                )

                issue.assigned_to = assigned_user

            except User.DoesNotExist:

                return Response(
                    {
                        "message": "Assigned user not found"
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
        issue.save()
        if old_status != issue.status:

                create_activity(
                    organization=request.user.organization,
                    user=request.user,
                    action="issue_updated",
                    message=(
                        f'Updated issue "{issue.title}" '
                        f'status from {old_status} '
                        f'to {issue.status}'
                    ),
                    project=issue.project,
                    task=issue.task,
                    subtask=issue.subtask,
                )


        if old_priority != issue.priority:

                create_activity(
                    organization=request.user.organization,
                    user=request.user,
                    action="issue_updated",
                    message=(
                        f'Changed issue "{issue.title}" '
                        f'priority from {old_priority} '
                        f'to {issue.priority}'
                    ),
                    project=issue.project,
                    task=issue.task,
                    subtask=issue.subtask,
                )
        

        

        serializer = IssueSerializer(issue)

        return Response(serializer.data)
