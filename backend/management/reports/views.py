from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from issues.models import Issue
from projects.models import Project
from tasks.models import Task


class DashboardStatsView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        total_projects = Project.objects.count()

        total_tasks = Task.objects.count()

        completed_tasks = Task.objects.filter(
            status="completed"
        ).count()

        pending_tasks = Task.objects.exclude(
            status="completed"
        ).count()

        overdue_tasks = Task.objects.filter(
            due_date__lt=timezone.now(),
            status__in=[
                "todo",
                "in_progress",
            ],
        ).count()

        total_issues = Issue.objects.count()

        active_members = User.objects.count()

        completion_rate = 0

        if total_tasks > 0:

            completion_rate = round(
                (completed_tasks / total_tasks) * 100,
                2,
            )

        return Response(
            {
                "total_projects": total_projects,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "pending_tasks": pending_tasks,
                "overdue_tasks": overdue_tasks,
                "total_issues": total_issues,
                "active_members": active_members,
                "completion_rate": completion_rate,
            }
        )