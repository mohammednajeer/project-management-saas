from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Q
from .models import Issue, IssueAttachment
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

        issues = Issue.objects.filter(
            project__organization=request.user.organization
        )

        if request.user.role == "employee":
            issues = issues.filter(
                Q(raised_by=request.user) |
                Q(task__assigned_to=request.user) |
                Q(task__subtasks__assigned_to=request.user) |
                Q(subtask__assigned_to=request.user)
            ).distinct()

        issues = (
            issues
            .select_related(
                "raised_by",
                "assigned_to",
                "project",
                "task",
                "subtask",
            )
            .prefetch_related(
                "attachments",
                "attachments__uploaded_by",
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

        uploaded_files = (
            request.FILES.getlist("attachments") or
            request.FILES.getlist("attachment")
        )

        for uploaded_file in uploaded_files:
            IssueAttachment.objects.create(
                issue=issue,
                uploaded_by=request.user,
                file=uploaded_file,
                original_name=uploaded_file.name,
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
    ]

    def patch(self, request, issue_id):

        try:

            issue = (
                Issue.objects
                .select_related(
                    "project",
                    "project__project_lead",
                    "project__created_by",
                    "task",
                    "task__created_by",
                    "raised_by",
                )
                .prefetch_related(
                    "attachments",
                    "attachments__uploaded_by",
                )
                .get(
                    id=issue_id,
                    project__organization=request.user.organization
                )
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

        assigned_to_provided = "assigned_to" in request.data
        assigned_to_id = request.data.get("assigned_to")
        old_assigned_to = issue.assigned_to

        if request.user.role == "employee":
            if not issue.assigned_to or issue.assigned_to.id != request.user.id:
                return Response(
                    {
                        "message": "You are not assigned to this issue."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            requested_fields = set(request.data.keys())
            if requested_fields - {"status"}:
                return Response(
                    {
                        "message": "Employees are only allowed to update the status of assigned issues."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            if not status_value:
                return Response(
                    {
                        "message": "Status is required."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Valid transitions: open -> investigating, investigating -> resolved
            if old_status == "open":
                if status_value != "investigating":
                    return Response(
                        {
                            "message": "Employees can only transition issues from open to investigating."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif old_status == "investigating":
                if status_value != "resolved":
                    return Response(
                        {
                            "message": "Employees can only transition issues from investigating to resolved."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                return Response(
                    {
                        "message": f"Employees are not allowed to update issues with status '{old_status}'."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        if status_value:
            issue.status = status_value

        if priority_value:
            issue.priority = priority_value

        if assigned_to_provided and (
            assigned_to_id in [None, "", "null", "undefined"]
        ):
            issue.assigned_to = None

        elif assigned_to_id:

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

        if assigned_to_provided and old_assigned_to != issue.assigned_to:
            if issue.assigned_to:
                assignment_message = (
                    f'Assigned issue task "{issue.title}" '
                    f'to {issue.assigned_to.name}'
                )
            else:
                assignment_message = (
                    f'Unassigned issue task "{issue.title}"'
                )

            create_activity(
                organization=request.user.organization,
                user=request.user,
                action="issue_assigned",
                message=assignment_message,
                project=issue.project,
                task=issue.task,
                subtask=issue.subtask,
            )

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

                # Send status transition notifications
                recipients = set()
                if issue.status == "investigating":
                    if issue.raised_by and issue.raised_by != request.user:
                        recipients.add(issue.raised_by)
                    
                    for r_user in recipients:
                        Notification.objects.create(
                            user=r_user,
                            title="Issue Investigating",
                            message=f"Issue '{issue.title}' is now being investigated."
                        )

                elif issue.status == "resolved":
                    if issue.raised_by and issue.raised_by != request.user:
                        recipients.add(issue.raised_by)
                    
                    if issue.project.project_lead and issue.project.project_lead != request.user:
                        recipients.add(issue.project.project_lead)
                    
                    assigned_manager = None
                    if issue.task and issue.task.created_by and issue.task.created_by.role in ["manager", "admin"]:
                        assigned_manager = issue.task.created_by
                    elif issue.project.created_by and issue.project.created_by.role in ["manager", "admin"]:
                        assigned_manager = issue.project.created_by
                    
                    if assigned_manager and assigned_manager != request.user:
                        recipients.add(assigned_manager)
                    
                    resolver_name = request.user.name or request.user.email
                    for r_user in recipients:
                        Notification.objects.create(
                            user=r_user,
                            title="Issue Resolved",
                            message=f"Issue '{issue.title}' has been resolved by {resolver_name}."
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
