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
                    id=subtask_id
                )

            except SubTask.DoesNotExist:

                return Response(
                    {
                        "message": "Subtask not found"
                    },
                    status=status.HTTP_404_NOT_FOUND
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

        serializer = IssueSerializer(issue)

        return Response(serializer.data)