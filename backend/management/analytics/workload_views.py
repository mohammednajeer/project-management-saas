from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .workload import (
    compute_member_workload,
    get_organization_team_workload,
    get_thresholds,
    get_workload_charts,
)


class TeamWorkloadView(APIView):
    """Organization team workload — full team for admin/manager, self for employee."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        if not organization:
            return Response(
                {"message": "Organization required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.role == "employee":
            member = compute_member_workload(
                request.user,
                organization=organization,
            )
            return Response(
                {
                    "thresholds": get_thresholds(),
                    "members": [member],
                    "scope": "self",
                }
            )

        return Response(
            {
                "thresholds": get_thresholds(),
                "members": get_organization_team_workload(organization),
                "scope": "organization",
            }
        )


class WorkloadChartsView(APIView):
    """Analytics charts for Reports and workload dashboards."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        if not organization:
            return Response(
                {"message": "Organization required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.role == "employee":
            member = compute_member_workload(
                request.user,
                organization=organization,
            )
            return Response(
                {
                    "thresholds": get_thresholds(),
                    "task_distribution": [
                        {"name": "Active", "value": member["active_tasks"]},
                        {"name": "Completed", "value": member["completed_tasks"]},
                        {"name": "Overdue", "value": member["overdue_tasks"]},
                        {"name": "Open Issues", "value": member["open_issues"]},
                    ],
                    "workload_distribution": [
                        {
                            "name": member["workload_label"],
                            "value": 1,
                            "status": member["workload_status"],
                        }
                    ],
                    "overloaded_employees": (
                        [member]
                        if member["workload_status"] == "overloaded"
                        else []
                    ),
                    "team_workload": [member],
                    "scope": "self",
                }
            )

        if request.user.role not in ("admin", "manager"):
            return Response(
                {"message": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN,
            )

        charts = get_workload_charts(organization)
        charts["scope"] = "organization"
        return Response(charts)
