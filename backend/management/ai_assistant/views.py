from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from projects.models import Project

from .services.project_summary import generate_project_summary
from .services.risk_detection import detect_project_risks
from .services.task_breakdown import generate_task_breakdown
from .services.weekly_summary import generate_weekly_summary
from .services.workload_insights import generate_workload_insights


MANAGER_ROLES = ("admin", "manager")


def _organization_required(user):
    return user.organization is not None


def _is_manager(user):
    return user.role in MANAGER_ROLES


def _permission_denied(message="Permission denied"):
    return Response(
        {"message": message},
        status=status.HTTP_403_FORBIDDEN,
    )


def _organization_error():
    return Response(
        {"message": "Organization required"},
        status=status.HTTP_400_BAD_REQUEST,
    )


class ProjectSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        if not _organization_required(request.user):
            return _organization_error()
        if not _is_manager(request.user):
            return _permission_denied(
                "Only admins and managers can access project summaries."
            )

        try:
            project = (
                Project.objects.filter(
                    id=project_id,
                    organization=request.user.organization,
                )
                .select_related("project_lead")
                .prefetch_related("tasks__assigned_to", "issues", "milestones")
                .get()
            )
        except Project.DoesNotExist:
            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(generate_project_summary(project))


class RiskDetectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _organization_required(request.user):
            return _organization_error()
        if not _is_manager(request.user):
            return _permission_denied(
                "Only admins and managers can access organization risk detection."
            )

        return Response(detect_project_risks(request.user.organization))


class TaskBreakdownView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        title = (request.data.get("title") or "").strip()
        description = (request.data.get("description") or "").strip()

        if not title:
            return Response(
                {"title": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(generate_task_breakdown(title, description))


class WeeklySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _organization_required(request.user):
            return _organization_error()
        if not _is_manager(request.user):
            return _permission_denied(
                "Only admins and managers can access weekly summaries."
            )

        start_date = None
        end_date = None
        if request.query_params.get("start_date"):
            start_date = parse_date(request.query_params["start_date"])
            if not start_date:
                return Response(
                    {"start_date": ["Use YYYY-MM-DD format."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if request.query_params.get("end_date"):
            end_date = parse_date(request.query_params["end_date"])
            if not end_date:
                return Response(
                    {"end_date": ["Use YYYY-MM-DD format."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if (start_date and not end_date) or (end_date and not start_date):
            return Response(
                {"message": "Provide both start_date and end_date."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if start_date and end_date and start_date > end_date:
            return Response(
                {"message": "start_date must be before or equal to end_date."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            generate_weekly_summary(
                request.user.organization,
                start_date=start_date,
                end_date=end_date,
            )
        )


class WorkloadInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _organization_required(request.user):
            return _organization_error()

        user = request.user if request.user.role == "employee" else None
        if request.user.role not in ("admin", "manager", "employee"):
            return _permission_denied()

        return Response(
            generate_workload_insights(
                request.user.organization,
                user=user,
            )
        )
