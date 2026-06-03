from datetime import timedelta

from django.db.models.functions import TruncDate
from django.db.models import Count
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsManagerOrAdmin
from accounts.models import User
from invitations.models import Invitation
from leave_management.models import LeaveRequest
from company_calendar.models import CalendarEvent

from projects.models import Project
from tasks.models import Task
from organizations.serializers import OrganizationProfileSerializer


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
