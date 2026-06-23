import csv
from io import TextIOWrapper

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from activities.models import Activity
from activities.serializers import ActivitySerializer
from issues.models import Issue
from permissions.classes import IsAdmin, IsAdminOrManager
from projects.models import Project
from tasks.models import Task
from organizations.serializers import OrganizationProfileSerializer
from leave_management.models import LeaveRequest

from .models import Invitation
from .serializers import CreateInvitationSerializer
from .tasks import send_invitation_email


class CreateInvitationView(APIView):
    permission_classes = [IsAdminOrManager]

    def post(self, request):
        serializer = CreateInvitationSerializer(
            data=request.data,
            context={"request": request}
        )

        if serializer.is_valid():
            invitation = serializer.save()
            company_name = request.user.organization.name

            invite_link = f"https://projectflowai.vercel.app/signup?token={invitation.token}"

            send_invitation_email.delay(
                subject=f"You're invited to join {company_name} on ProjectFlow",
                message=f"""
                You have been invited to join {company_name} on ProjectFlow.

                Click the link below to join:
                {invite_link}

                This link will expire in 2 days.
                """,
                recipient=invitation.email,
            )

            return Response({
                "message": "Invitation sent successfully",
                "token": str(invitation.token)
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ValidateInvitationView(APIView):

    def get(self, request):
        token = request.query_params.get("token")

        try:
            invitation = Invitation.objects.get(token=token)
        except Invitation.DoesNotExist:
            return Response(
                {"message": "Invalid token"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if invitation.is_used:
            return Response(
                {"message": "Invite already used"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if invitation.expires_at < timezone.now():
            return Response(
                {"message": "Invite expired"},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            "valid": True,
            "email": invitation.email,
            "role": invitation.role,
            "company": OrganizationProfileSerializer(
                invitation.organization
            ).data,
        })


class BulkInviteView(APIView):
    permission_classes = [IsAdminOrManager]

    def post(self, request):
        file = request.FILES.get("file")

        if not file:
            return Response(
                {"message": "CSV file is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        decoded_file = TextIOWrapper(file.file, encoding="utf-8")
        reader = csv.DictReader(decoded_file)

        success_count = 0
        errors = []
        invite_links = []

        for row in reader:
            email = row.get("email")
            role = row.get("role", "employee")

            if not email:
                errors.append(f"Row {reader.line_num}: Missing email")
                continue

            if role not in ["admin", "employee", "manager"]:
                errors.append(f"Row {reader.line_num}: Invalid role")
                continue

            if request.user.role == "manager" and role != "employee":
                return Response(
                    {
                        "message":
                            "Managers can invite employees only."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            invitation = Invitation.objects.create(
                email=email,
                role=role,
                organization=request.user.organization
            )

            invite_link = f"https://projectflowai.vercel.app/signup?token={invitation.token}"
            company_name = request.user.organization.name
            invite_links.append({
                "email": email,
                "link": invite_link
            })

            try:
                send_invitation_email.delay(
                    subject=f"You're invited to join {company_name} on ProjectFlow",
                    message=f"""
                    You have been invited to join {company_name} on ProjectFlow.

                    Join using this link:
                    {invite_link}
                    """,
                    recipient=email,
                )

                success_count += 1

            except Exception as e:
                errors.append(f"{email}: {str(e)}")

        return Response({
            "message": "Bulk invite processed",
            "success": success_count,
            "errors": errors,
            "invite_links": invite_links,
        })


class TeamListView(APIView):
    permission_classes = [IsAdminOrManager]

    def get(self, request):
        org = request.user.organization

        users = User.objects.filter(
            organization=org
        ).exclude(
            role="platform_admin"
        ).order_by(
            "name",
            "email"
        )

        user_data = [
            {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "status": "active",
                "created_at": user.created_at,
                "joined_at": user.joined_at,
                "profile_picture": (
                    user.profile_picture.url
                    if user.profile_picture
                    else None
                ),
            }
            for user in users
        ]

        invites = Invitation.objects.filter(
            organization=org,
            is_used=False
        ).order_by(
            "-created_at"
        )

        invite_data = [
            {
                "id": str(inv.id),
                "name": None,
                "email": inv.email,
                "role": inv.role,
                "status": "invited",
                "created_at": inv.created_at,
                "joined_at": None,
                "profile_picture": None,
            }
            for inv in invites
        ]

        return Response(user_data + invite_data)


class TeamMemberDetailView(APIView):
    permission_classes = [IsAdminOrManager]

    def get(self, request, user_id):
        organization = request.user.organization

        try:
            member = User.objects.get(
                id=user_id,
                organization=organization
            )
        except User.DoesNotExist:
            return Response(
                {"message": "Member not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        today = timezone.localdate()

        assigned_tasks = Task.objects.filter(
            project__organization=organization,
            assigned_to=member
        ).distinct()

        active_tasks = assigned_tasks.exclude(
            status="done"
        ).count()

        completed_tasks = assigned_tasks.filter(
            status="done"
        ).count()

        overdue_tasks = assigned_tasks.filter(
            due_date__lt=today
        ).exclude(
            status="done"
        ).count()

        issues_assigned = Issue.objects.filter(
            project__organization=organization,
            assigned_to=member
        ).count()

        projects_involved = Project.objects.filter(
            organization=organization
        ).filter(
            Q(members=member) |
            Q(created_by=member) |
            Q(tasks__assigned_to=member) |
            Q(tasks__subtasks__assigned_to=member) |
            Q(issues__assigned_to=member) |
            Q(issues__raised_by=member)
        ).distinct().count()

        leave_requests_taken = LeaveRequest.objects.filter(
            organization=organization,
            employee=member
        ).count()

        approved_leaves = LeaveRequest.objects.filter(
            organization=organization,
            employee=member,
            status="approved"
        ).count()

        upcoming_leave = LeaveRequest.objects.filter(
            organization=organization,
            employee=member,
            status="approved",
            end_date__gte=today
        ).order_by("start_date").first()

        activities = Activity.objects.filter(
            organization=organization,
            user=member
        ).select_related(
            "user",
            "project",
            "task",
            "subtask"
        )[:10]

        serializer = ActivitySerializer(
            activities,
            many=True
        )

        return Response({
            "id": str(member.id),
            "name": member.name,
            "email": member.email,
            "role": member.role,
            "profile_picture": (
                member.profile_picture.url
                if member.profile_picture
                else None
            ),
            "joined_at": member.joined_at,
            "active_tasks": active_tasks,
            "completed_tasks": completed_tasks,
            "overdue_tasks": overdue_tasks,
            "issues_assigned": issues_assigned,
            "projects_involved": projects_involved,
            "leave_requests_taken": leave_requests_taken,
            "approved_leaves": approved_leaves,
            "upcoming_leave": (
                {
                    "id": str(upcoming_leave.id),
                    "leave_type": upcoming_leave.leave_type,
                    "leave_type_label": upcoming_leave.get_leave_type_display(),
                    "start_date": upcoming_leave.start_date,
                    "end_date": upcoming_leave.end_date,
                }
                if upcoming_leave
                else None
            ),
            "recent_activity": serializer.data,
        })


class ResendInvitationView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, invitation_id):
        try:
            invitation = Invitation.objects.get(
                id=invitation_id,
                organization=request.user.organization,
                is_used=False,
            )
        except Invitation.DoesNotExist:
            return Response(
                {"message": "Invitation not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        invite_link = (
            f"https://projectflowai.vercel.app/signup?"
            f"token={invitation.token}"
        )

        send_invitation_email.delay(
            subject=f"Reminder: Join {request.user.organization.name} on ProjectFlow",
            message=f"""
            You were invited to join {request.user.organization.name} on ProjectFlow.

            Join here:
            {invite_link}
            """,
            recipient=invitation.email,
        )

        return Response({
            "message": "Invitation resent successfully"
        })


class CancelInvitationView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, invitation_id):
        try:
            invitation = Invitation.objects.get(
                id=invitation_id,
                organization=request.user.organization,
                is_used=False,
            )
        except Invitation.DoesNotExist:
            return Response(
                {"message": "Invitation not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        invitation.delete()

        return Response({
            "message": "Invitation cancelled"
        })


class RemoveMemberView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, user_id):
        try:
            member = User.objects.get(
                id=user_id,
                organization=request.user.organization
            )
        except User.DoesNotExist:
            return Response(
                {"message": "Member not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if member.id == request.user.id:
            return Response(
                {"message": "You cannot remove yourself"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if member.role == "admin":
            return Response(
                {"message": "Cannot remove another admin"},
                status=status.HTTP_400_BAD_REQUEST
            )

        member.delete()

        return Response({
            "message": "Member removed successfully"
        })


class ChangeRoleView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, user_id):
        role = request.data.get("role")

        if role not in ["manager", "employee"]:
            return Response(
                {"message": "Invalid role"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            member = User.objects.get(
                id=user_id,
                organization=request.user.organization
            )
        except User.DoesNotExist:
            return Response(
                {"message": "Member not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if member.id == request.user.id:
            return Response(
                {"message": "You cannot change your own role"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if member.role == "admin":
            return Response(
                {"message": "Cannot change admin role"},
                status=status.HTTP_400_BAD_REQUEST
            )

        member.role = role
        member.save()

        return Response({
            "message": "Role updated successfully"
        })
