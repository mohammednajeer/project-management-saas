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
        ).prefetch_related(
            "assigned_to"
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
                "assigned_users": [
                    {
                        "id": str(user.id),
                        "name": user.name,
                        "email": user.email,
                    }
                    for user in task.assigned_to.all()
                ],
            }
            for task in recent_tasks
        ]

        status_queryset = Task.objects.filter(
            project__organization=organization
        ).values(
            "status"
        ).annotate(
            count=Count("id")
        )

        task_status_distribution = [
            {
                "status": item["status"],
                "count": item["count"],
            }
            for item in status_queryset
        ]

        assigned_queryset = Task.objects.filter(
            project__organization=organization,
            assigned_to__isnull=False
        ).values(
            "assigned_to__name"
        ).annotate(
            count=Count("id")
        ).order_by(
            "assigned_to__name"
        )

        unassigned_count = Task.objects.filter(
            project__organization=organization,
            assigned_to__isnull=True
        ).count()

        team_workload = [
            {
                "name": item["assigned_to__name"] or "Unassigned",
                "tasks": item["count"],
            }
            for item in assigned_queryset
        ]

        if unassigned_count:
            team_workload.append({
                "name": "Unassigned",
                "tasks": unassigned_count,
            })

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
            "task_status_distribution": task_status_distribution,
            "team_workload": team_workload,
        })
