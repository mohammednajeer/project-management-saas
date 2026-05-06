from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from .serializers import CreateInvitationSerializer
import csv
from io import TextIOWrapper
from django.core.mail import send_mail
from django.core.mail import send_mail
from django.utils import timezone
from .models import Invitation
from accounts.models import User
from invitations.models import Invitation



class CreateInvitationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        if request.user.role != "admin":
            return Response(
                {"message": "Only admin can invite users"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CreateInvitationSerializer(
            data=request.data,
            context={"request": request}
        )

        if serializer.is_valid():
            invitation = serializer.save()

            # 🔥 generate link
            invite_link = f"http://localhost:5173/signup?token={invitation.token}"

            # 🔥 SEND EMAIL
            send_mail(
                subject="You're invited to join ProjectFlow",
                message=f"""
                            You have been invited to join a workspace.

                            Click the link below to join:
                            {invite_link}

                            This link will expire in 2 days.
                            """,
                from_email="mohammednajeer785@gmail.com",
                recipient_list=[invitation.email],
                fail_silently=False,
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

        # check used
        if invitation.is_used:
            return Response(
                {"message": "Invite already used"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # check expired
        if invitation.expires_at < timezone.now():
            return Response(
                {"message": "Invite expired"},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            "valid": True,
            "email": invitation.email,
            "role": invitation.role
        })
 
 

class BulkInviteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        if request.user.role != "admin":
            return Response(
                {"message": "Only admin can invite users"},
                status=status.HTTP_403_FORBIDDEN
            )

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
            if role not in ["employee", "manager"]:
                errors.append(
                    f"Row {reader.line_num}: Invalid role"
                )
                continue
            invitation = Invitation.objects.create(
                email=email,
                role=role,
                organization=request.user.organization
            )
            invite_links.append({
                "email": email,
                "link": invite_link
            })

            invite_link = f"http://localhost:5173/signup?token={invitation.token}"
            print(f"\nINVITE URL FOR {email}")
            print(invite_link)
            print("--------------------------------")

            try:
                send_mail(
                    subject="You're invited to ProjectFlow",
                    message=f"Join using this link:\n{invite_link}",
                    from_email="your_email@gmail.com",
                    recipient_list=[email],
                    fail_silently=False,
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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = request.user.organization

        # ✅ ACTIVE USERS
        users = User.objects.filter(organization=org)

        user_data = [
            {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "status": "active",
                "joined_at": user.created_at,
            }
            for user in users
        ]

        # ✅ INVITED USERS
        invites = Invitation.objects.filter(
            organization=org,
            is_used=False
        )

        invite_data = [
            {
                "id": str(inv.id),
                "name": None,
                "email": inv.email,
                "role": inv.role,
                "status": "invited",
                "joined_at": None,
            }
            for inv in invites
        ]

        return Response(user_data + invite_data)
    

class ResendInvitationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, invitation_id):

        if request.user.role != "admin":
            return Response(
                {"message": "Only admin allowed"},
                status=status.HTTP_403_FORBIDDEN
            )

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
            f"http://localhost:5173/signup?"
            f"token={invitation.token}"
        )

        send_mail(
            subject="Reminder: Join ProjectFlow",
            message=f"""
            You were invited to join ProjectFlow.

            Join here:
            {invite_link}
            """,
            from_email="your_email@gmail.com",
            recipient_list=[invitation.email],
            fail_silently=False,
        )

        print("\nRESENT INVITE")
        print(invite_link)

        return Response({
            "message": "Invitation resent successfully"
        })
    

class CancelInvitationView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, invitation_id):

        if request.user.role != "admin":
            return Response(
                {"message": "Only admin allowed"},
                status=status.HTTP_403_FORBIDDEN
            )

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