from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsManagerOrAdmin
from analytics.workload import get_workload_charts
from issues.models import Issue
from projects.models import Project
from tasks.models import Task


class DashboardStatsView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        today = timezone.localdate()

        if not organization:
            return Response({"detail": "Organization required"}, status=400)

        if request.user.role == "employee":
            charts = get_workload_charts(organization)
            member = charts["team_workload"][0] if charts["team_workload"] else {}
            return Response(
                {
                    "scope": "self",
                    "total_projects": Project.objects.filter(
                        members=request.user
                    ).count(),
                    "total_tasks": member.get("active_tasks", 0)
                    + member.get("completed_tasks", 0),
                    "completed_tasks": member.get("completed_tasks", 0),
                    "pending_tasks": member.get("active_tasks", 0),
                    "overdue_tasks": member.get("overdue_tasks", 0),
                    "total_issues": member.get("open_issues", 0),
                    "active_members": 1,
                    "completion_rate": (
                        round(
                            member["completed_tasks"]
                            / (
                                member["active_tasks"]
                                + member["completed_tasks"]
                            )
                            * 100,
                            2,
                        )
                        if (member.get("active_tasks", 0) + member.get("completed_tasks", 0))
                        else 0
                    ),
                    "task_distribution": charts["task_distribution"],
                    "workload_distribution": charts["workload_distribution"],
                    "overloaded_employees": charts["overloaded_employees"],
                    "workload_thresholds": charts["thresholds"],
                }
            )

        project_filter = {"organization": organization}
        task_filter = {"project__organization": organization}
        issue_filter = {"project__organization": organization}

        total_projects = Project.objects.filter(**project_filter).count()
        total_tasks = Task.objects.filter(**task_filter).count()
        completed_tasks = Task.objects.filter(**task_filter, status="done").count()
        pending_tasks = Task.objects.filter(**task_filter).exclude(status="done").count()
        overdue_tasks = (
            Task.objects.filter(**task_filter, due_date__lt=today)
            .exclude(status="done")
            .count()
        )
        total_issues = Issue.objects.filter(**issue_filter).count()
        active_members = User.objects.filter(organization=organization).count()

        completion_rate = 0
        if total_tasks > 0:
            completion_rate = round((completed_tasks / total_tasks) * 100, 2)

        start_date = today - timedelta(days=6)
        activity_queryset = (
            Task.objects.filter(**task_filter, created_at__date__gte=start_date)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(tasks=Count("id"))
            .order_by("day")
        )
        activity_map = {item["day"]: item["tasks"] for item in activity_queryset}
        weekly_activity = [
            {
                "day": (start_date + timedelta(days=index)).strftime("%a"),
                "completed": activity_map.get(start_date + timedelta(days=index), 0),
                "pending": 0,
            }
            for index in range(7)
        ]

        project_breakdown = [
            {
                "id": project.id,
                "project": project.name,
                "tasks": project.tasks.count(),
                "completed": project.tasks.filter(status="done").count(),
            }
            for project in Project.objects.filter(**project_filter).order_by("name")[:12]
        ]

        charts = get_workload_charts(organization)

        return Response(
            {
                "scope": "organization",
                "total_projects": total_projects,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "pending_tasks": pending_tasks,
                "overdue_tasks": overdue_tasks,
                "total_issues": total_issues,
                "active_members": active_members,
                "completion_rate": completion_rate,
                "weekly_activity": weekly_activity,
                "project_breakdown": project_breakdown,
                "task_distribution": charts["task_distribution"],
                "workload_distribution": charts["workload_distribution"],
                "overloaded_employees": charts["overloaded_employees"],
                "team_workload": charts["team_workload"],
                "workload_thresholds": charts["thresholds"],
            }
        )
