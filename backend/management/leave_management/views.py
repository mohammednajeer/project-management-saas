from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from notifications.models import Notification

from .models import LeaveRequest, LeaveBalance
from .serializers import LeaveRequestSerializer, LeaveBalanceSerializer


def notify_user(user, title, message, notification_type):
    Notification.objects.create(
        user=user,
        title=title,
        message=message,
        type=notification_type
    )


def ensure_balances_exist_for_organization(organization):
    users = User.objects.filter(organization=organization).exclude(role="platform_admin")
    leave_types = ["annual", "sick", "casual", "personal"]
    for u in users:
        for lt in leave_types:
            LeaveBalance.objects.get_or_create(
                employee=u,
                leave_type=lt,
                defaults={
                    "organization": organization,
                    "allocated_days": 20 if lt == "annual" else 10
                }
            )


def ensure_balances_exist_for_user(user):
    leave_types = ["annual", "sick", "casual", "personal"]
    for lt in leave_types:
        LeaveBalance.objects.get_or_create(
            employee=user,
            leave_type=lt,
            defaults={
                "organization": user.organization,
                "allocated_days": 20 if lt == "annual" else 10
            }
        )


class LeaveRequestListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self, request):
        queryset = LeaveRequest.objects.filter(
            organization=request.user.organization
        ).select_related(
            "employee",
            "approved_by",
            "organization"
        )

        if (
            request.user.role == "employee" or
            request.query_params.get("my_requests") == "true"
        ):
            queryset = queryset.filter(employee=request.user)

        status_value = request.query_params.get("status")
        employee_id = request.query_params.get("employee")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if status_value:
            queryset = queryset.filter(status=status_value)

        if (
            employee_id and
            request.user.role in ["admin", "manager"]
        ):
            queryset = queryset.filter(employee_id=employee_id)

        if start_date:
            queryset = queryset.filter(end_date__gte=start_date)

        if end_date:
            queryset = queryset.filter(start_date__lte=end_date)

        return queryset

    def get(self, request):
        serializer = LeaveRequestSerializer(
            self.get_queryset(request),
            many=True,
            context={"request": request}
        )

        return Response(serializer.data)

    def post(self, request):
        serializer = LeaveRequestSerializer(
            data=request.data,
            context={"request": request}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        leave_request = serializer.save(
            employee=request.user,
            organization=request.user.organization
        )

        reviewers = User.objects.filter(
            organization=request.user.organization,
            role__in=["admin", "manager"]
        ).filter(
            ~Q(id=request.user.id)
        )

        for reviewer in reviewers:
            notify_user(
                reviewer,
                "Leave Request Submitted",
                (
                    f"{request.user.name} requested "
                    f"{leave_request.get_leave_type_display()} "
                    f"from {leave_request.start_date} "
                    f"to {leave_request.end_date}."
                ),
                "leave_requested"
            )

        return Response(
            LeaveRequestSerializer(leave_request, context={"request": request}).data,
            status=status.HTTP_201_CREATED
        )


class LeaveRequestActionView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, leave_id, action):
        try:
            leave_request = LeaveRequest.objects.select_related(
                "employee",
                "organization",
                "approved_by"
            ).get(
                id=leave_id,
                organization=request.user.organization
            )
        except LeaveRequest.DoesNotExist:
            return Response(
                {"message": "Leave request not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if action == "cancel":
            return self.cancel(request, leave_request)

        if action in ["approve", "reject"]:
            if request.user.role not in ["admin", "manager"]:
                return Response(
                    {"message": "Only admins and managers can review leave requests"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Prevent approving own leave request
            if leave_request.employee_id == request.user.id:
                return Response(
                    {"message": "You cannot approve or reject your own leave request"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Manager can only approve employee leave requests
            if request.user.role == "manager" and leave_request.employee.role in ["manager", "admin"]:
                return Response(
                    {"message": "Managers can only approve employee leave requests"},
                    status=status.HTTP_403_FORBIDDEN
                )

            if action == "approve":
                return self.approve(request, leave_request)

            return self.reject(request, leave_request)

        return Response(
            {"message": "Invalid leave action"},
            status=status.HTTP_400_BAD_REQUEST
        )

    def cancel(self, request, leave_request):
        if leave_request.employee_id != request.user.id:
            return Response(
                {"message": "You can cancel only your own leave request"},
                status=status.HTTP_403_FORBIDDEN
            )

        if leave_request.status != "pending":
            return Response(
                {"message": "Only pending leave requests can be cancelled"},
                status=status.HTTP_400_BAD_REQUEST
            )

        leave_request.status = "cancelled"
        leave_request.save(update_fields=["status"])

        return Response(LeaveRequestSerializer(leave_request, context={"request": request}).data)

    def approve(self, request, leave_request):
        if leave_request.status != "pending":
            return Response(
                {"message": "Only pending leave requests can be approved"},
                status=status.HTTP_400_BAD_REQUEST
            )

        leave_request.status = "approved"
        leave_request.approved_by = request.user
        leave_request.approved_at = timezone.now()
        leave_request.rejection_reason = ""
        leave_request.save(
            update_fields=[
                "status",
                "approved_by",
                "approved_at",
                "rejection_reason",
            ]
        )

        notify_user(
            leave_request.employee,
            "Leave Approved",
            (
                f"Your {leave_request.get_leave_type_display()} "
                f"from {leave_request.start_date} "
                f"to {leave_request.end_date} was approved."
            ),
            "leave_approved"
        )

        return Response(LeaveRequestSerializer(leave_request, context={"request": request}).data)

    def reject(self, request, leave_request):
        if leave_request.status != "pending":
            return Response(
                {"message": "Only pending leave requests can be rejected"},
                status=status.HTTP_400_BAD_REQUEST
            )

        rejection_reason = request.data.get("rejection_reason", "")

        leave_request.status = "rejected"
        leave_request.approved_by = request.user
        leave_request.approved_at = timezone.now()
        leave_request.rejection_reason = rejection_reason
        leave_request.save(
            update_fields=[
                "status",
                "approved_by",
                "approved_at",
                "rejection_reason",
            ]
        )

        notify_user(
            leave_request.employee,
            "Leave Rejected",
            (
                f"Your {leave_request.get_leave_type_display()} "
                f"from {leave_request.start_date} "
                f"to {leave_request.end_date} was rejected."
            ),
            "leave_rejected"
        )

        return Response(LeaveRequestSerializer(leave_request, context={"request": request}).data)


class LeaveBalanceListUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role in ["admin", "manager"]:
            ensure_balances_exist_for_organization(request.user.organization)
            balances = LeaveBalance.objects.filter(
                organization=request.user.organization
            ).select_related("employee")
        else:
            ensure_balances_exist_for_user(request.user)
            balances = LeaveBalance.objects.filter(
                employee=request.user
            ).select_related("employee")

        # Prefetch used days to optimize performance and prevent N+1 queries
        balances = LeaveBalance.prefetch_used_days(balances)

        serializer = LeaveBalanceSerializer(balances, many=True)
        return Response(serializer.data)

    def patch(self, request, balance_id):
        if request.user.role != "admin":
            return Response(
                {"message": "Only admins can configure leave allocations"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            balance = LeaveBalance.objects.get(
                id=balance_id,
                organization=request.user.organization
            )
        except LeaveBalance.DoesNotExist:
            return Response(
                {"message": "Leave balance record not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        allocated_days = request.data.get("allocated_days")
        if allocated_days is None:
            return Response(
                {"message": "allocated_days is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            allocated_days = int(allocated_days)
            if allocated_days < 0:
                raise ValueError()
        except ValueError:
            return Response(
                {"message": "allocated_days must be a non-negative integer"},
                status=status.HTTP_400_BAD_REQUEST
            )

        balance.allocated_days = allocated_days
        balance.save(update_fields=["allocated_days"])

        return Response(LeaveBalanceSerializer(balance).data)


