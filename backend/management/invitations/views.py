from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from .serializers import CreateInvitationSerializer

from django.core.mail import send_mail

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





from django.utils import timezone
from .models import Invitation


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
 