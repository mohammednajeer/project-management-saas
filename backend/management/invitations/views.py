from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from .serializers import CreateInvitationSerializer


class CreateInvitationView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        # 🔥 check admin
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

            return Response({
                "message": "Invitation created",
                "token": str(invitation.token),   # 🔥 for testing
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
 