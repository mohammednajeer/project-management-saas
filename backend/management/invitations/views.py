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

        for row in reader:
            email = row.get("email")
            role = row.get("role", "employee")

            if not email:
                errors.append(f"Missing email in row")
                continue

            invitation = Invitation.objects.create(
                email=email,
                role=role,
                organization=request.user.organization
            )

            invite_link = f"http://localhost:5173/signup?token={invitation.token}"

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
            "errors": errors
        })
        
