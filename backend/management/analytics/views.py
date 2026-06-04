from datetime import timedelta
from django.db.models.functions import TruncDate
from django.db.models import Count
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.models import User
from invitations.models import Invitation
from leave_management.models import LeaveRequest, LeaveBalance
from company_calendar.models import CalendarEvent

from projects.health import HEALTH_LABELS, refresh_project_health
from projects.models import Project, ProjectMilestone
from projects.serializers import serialize_user_brief
from tasks.models import Task
from organizations.serializers import OrganizationProfileSerializer

from .workload import (
    compute_member_workload,
    get_organization_team_workload,
    get_thresholds,
)


class DashboardOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        today = timezone.localdate()

        if request.user.role == "employee":
            from leave_management.views import ensure_balances_exist_for_user
            ensure_balances_exist_for_user(request.user)

            balances = LeaveBalance.objects.filter(
                employee=request.user
            ).select_related("employee")

            my_upcoming_leaves = LeaveRequest.objects.filter(
                employee=request.user,
                status="approved",
                end_date__gte=today
            ).order_by("start_date")[:5]

            next_holiday = CalendarEvent.objects.filter(
                organization=organization,
                event_type="holiday",
                end_date__gte=today
            ).order_by("start_date").first()

            upcoming_company_events = CalendarEvent.objects.filter(
                organization=organization,
                event_type="company_event",
                end_date__gte=today
            ).order_by("start_date")[:5]

            from leave_management.serializers import LeaveBalanceSerializer

            my_workload = compute_member_workload(
                request.user,
                organization=organization,
            )
            return Response({
                "company": OrganizationProfileSerializer(organization).data,
                "role": "employee",
                "my_workload": my_workload,
                "workload_thresholds": get_thresholds(),
                "my_leave_balances": LeaveBalanceSerializer(balances, many=True).data,
                "my_upcoming_leave": [
                    {
                        "id": str(leave.id),
                        "leave_type_label": leave.get_leave_type_display(),
                        "start_date": leave.start_date,
                        "end_date": leave.end_date,
                        "status": leave.status,
                    }
                    for leave in my_upcoming_leaves
                ],
                "next_holiday": {
                    "id": str(next_holiday.id),
                    "title": next_holiday.title,
                    "start_date": next_holiday.start_date,
                    "end_date": next_holiday.end_date,
                } if next_holiday else None,
                "upcoming_company_events": [
                    {
                        "id": str(event.id),
                        "title": event.title,
                        "start_date": event.start_date,
                        "end_date": event.end_date,
                    }
                    for event in upcoming_company_events
                ]
            })

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

        managers = User.objects.filter(
            organization=organization,
            role="manager"
        ).count()

        employees = User.objects.filter(
            organization=organization,
            role="employee"
        ).count()

        pending_invitations = Invitation.objects.filter(
            organization=organization,
            is_used=False
        ).count()

        pending_leave_requests = LeaveRequest.objects.filter(
            organization=organization,
            status="pending"
        ).count()

        upcoming_holidays = CalendarEvent.objects.filter(
            organization=organization,
            event_type="holiday",
            end_date__gte=today
        ).order_by("start_date")[:5]

        upcoming_company_events = CalendarEvent.objects.filter(
            organization=organization,
            event_type="company_event",
            end_date__gte=today
        ).order_by("start_date")[:5]

        people_currently_on_leave = LeaveRequest.objects.filter(
            organization=organization,
            status="approved",
            start_date__lte=today,
            end_date__gte=today
        ).select_related("employee").order_by("end_date")[:8]

        task_deadlines = Task.objects.filter(
            project__organization=organization,
            due_date__gte=today
        ).exclude(
            status="done"
        ).select_related("project").order_by("due_date")[:5]

        calendar_deadlines = CalendarEvent.objects.filter(
            organization=organization,
            event_type__in=["deadline", "milestone"],
            end_date__gte=today
        ).order_by("start_date")[:5]

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

        team_workload_members = get_organization_team_workload(organization)

        team_workload = [
            {
                "id": row["id"],
                "name": row["name"],
                "tasks": row["assigned_tasks"],
                "active_tasks": row["active_tasks"],
                "completed_tasks": row["completed_tasks"],
                "overdue_tasks": row["overdue_tasks"],
                "open_issues": row["open_issues"],
                "workload_status": row["workload_status"],
                "workload_label": row["workload_label"],
            }
            for row in team_workload_members
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

        org_projects = Project.objects.filter(
            organization=organization
        ).select_related("project_lead").prefetch_related("milestones")

        for project in org_projects:
            refresh_project_health(project)

        projects_at_risk = [
            {
                "id": str(project.id),
                "name": project.name,
                "health": project.health,
                "health_label": HEALTH_LABELS.get(project.health, "Healthy"),
                "project_lead": serialize_user_brief(project.project_lead),
                "due_date": project.due_date,
            }
            for project in org_projects.filter(health="at_risk").order_by("due_date", "name")[:8]
        ]

        milestone_base = ProjectMilestone.objects.filter(
            project__organization=organization
        ).select_related("project")

        upcoming_milestones = [
            {
                "id": str(milestone.id),
                "title": milestone.title,
                "target_date": milestone.target_date,
                "status": milestone.status,
                "project_id": str(milestone.project_id),
                "project_name": milestone.project.name,
            }
            for milestone in milestone_base.filter(
                target_date__gte=today
            ).exclude(
                status="completed"
            ).order_by("target_date")[:8]
        ]

        completed_milestones = [
            {
                "id": str(milestone.id),
                "title": milestone.title,
                "target_date": milestone.target_date,
                "status": milestone.status,
                "project_id": str(milestone.project_id),
                "project_name": milestone.project.name,
            }
            for milestone in milestone_base.filter(
                status="completed"
            ).order_by("-target_date")[:8]
        ]

        project_summaries = [
            {
                "id": str(project.id),
                "name": project.name,
                "health": project.health,
                "health_label": HEALTH_LABELS.get(project.health, "Healthy"),
                "status": project.status,
                "project_lead": serialize_user_brief(project.project_lead),
                "due_date": project.due_date,
                "milestone_progress": (
                    round(
                        project.milestones.filter(status="completed").count()
                        / project.milestones.count()
                        * 100
                    )
                    if project.milestones.count()
                    else 100
                ),
            }
            for project in org_projects.order_by("-created_at")[:6]
        ]

        return Response({
            "company": OrganizationProfileSerializer(organization).data,
            "total_projects": total_projects,
            "total_tasks": total_tasks,
            "pending_tasks": pending_tasks,
            "completed_tasks": completed_tasks,
            "overdue_tasks": overdue_tasks,
            "team_members": team_members,
            "managers": managers,
            "employees": employees,
            "pending_invitations": pending_invitations,
            "pending_leave_requests": pending_leave_requests,
            "recent_tasks": recent_tasks_data,
            "weekly_task_activity": weekly_task_activity,
            "task_status_distribution": task_status_distribution,
            "team_workload": team_workload,
            "team_workload_members": team_workload_members,
            "workload_thresholds": get_thresholds(),
            "upcoming_holidays": [
                {
                    "id": str(event.id),
                    "title": event.title,
                    "start_date": event.start_date,
                    "end_date": event.end_date,
                }
                for event in upcoming_holidays
            ],
            "upcoming_company_events": [
                {
                    "id": str(event.id),
                    "title": event.title,
                    "start_date": event.start_date,
                    "end_date": event.end_date,
                }
                for event in upcoming_company_events
            ],
            "people_currently_on_leave": [
                {
                    "id": str(leave.id),
                    "employee": {
                        "id": str(leave.employee.id),
                        "name": leave.employee.name,
                        "email": leave.employee.email,
                    },
                    "leave_type": leave.leave_type,
                    "leave_type_label": leave.get_leave_type_display(),
                    "start_date": leave.start_date,
                    "end_date": leave.end_date,
                }
                for leave in people_currently_on_leave
            ],
            "projects_at_risk": projects_at_risk,
            "upcoming_milestones": upcoming_milestones,
            "completed_milestones": completed_milestones,
            "project_summaries": project_summaries,
            "upcoming_deadlines": [
                {
                    "id": str(task.id),
                    "title": task.title,
                    "source": "task",
                    "project": task.project.name,
                    "date": task.due_date,
                }
                for task in task_deadlines
            ] + [
                {
                    "id": str(event.id),
                    "title": event.title,
                    "source": event.event_type,
                    "project": None,
                    "date": event.start_date,
                }
                for event in calendar_deadlines
            ],
        })
