from datetime import timedelta

from django.db.models.functions import TruncDate
from django.db.models import Count
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsManagerOrAdmin
from accounts.models import User

from projects.models import Project
from tasks.models import Task


class DashboardOverviewView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsManagerOrAdmin,
    ]

    def get(self, request):

        organization = request.user.organization

        today = timezone.localdate()

        total_projects = Project.objects.filter(
            organization=organization
        ).count()

        total_tasks = Task.objects.filter(
            project__organization=organization
        ).count()

        pending_tasks = Task.objects.filter(
            project__organization=organization
        ).exclude(
            status="done"
        ).count()

        completed_tasks = Task.objects.filter(
            project__organization=organization,
            status="done"
        ).count()

        overdue_tasks = Task.objects.filter(
            project__organization=organization,
            due_date__lt=today
        ).exclude(
            status="done"
        ).count()

        team_members = User.objects.filter(
            organization=organization
        ).count()

        recent_tasks = Task.objects.filter(
            project__organization=organization
        ).select_related(
            "project"
        ).order_by(
            "-created_at"
        )[:5]

        recent_tasks_data = [
            {
                "id": str(task.id),
                "title": task.title,
                "project": task.project.name,
                "priority": task.priority,
                "status": task.status,
                "due_date": task.due_date,
            }
            for task in recent_tasks
        ]

        start_date = today - timedelta(days=6)

        activity_queryset = Task.objects.filter(
            project__organization=organization,
            created_at__date__gte=start_date
        ).annotate(
            day=TruncDate("created_at")
        ).values(
            "day"
        ).annotate(
            tasks=Count("id")
        ).order_by("day")

        activity_map = {
            item["day"]: item["tasks"]
            for item in activity_queryset
        }

        weekly_task_activity = []

        for index in range(7):

            current_day = start_date + timedelta(days=index)

            weekly_task_activity.append({
                "day": current_day.strftime("%a"),
                "tasks": activity_map.get(current_day, 0),
            })

        return Response({
            "total_projects": total_projects,
            "total_tasks": total_tasks,
            "pending_tasks": pending_tasks,
            "completed_tasks": completed_tasks,
            "overdue_tasks": overdue_tasks,
            "team_members": team_members,
            "recent_tasks": recent_tasks_data,
            "weekly_task_activity": weekly_task_activity,
        })