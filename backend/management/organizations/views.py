from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from accounts.auth_cookies import set_auth_cookies
from accounts.permissions import IsManagerOrAdmin
from permissions.classes import IsAdmin
from .serializers import (
    OrganizationProfileSerializer,
    RegisterOrganizationSerializer,
)
from rest_framework.permissions import IsAuthenticated
from projects.permissions import IsAuthenticatedOrgMember

class RegisterOrganizationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterOrganizationSerializer(data=request.data)

        if serializer.is_valid():
            organization = serializer.save()
            user = organization.users.filter(role="admin").first()

            # Generate and cache OTP
            from django.core.cache import cache
            from accounts.emails import generate_otp, send_otp_email
            otp = generate_otp()
            cache.set(f"email_otp_{user.email}", otp, timeout=600)
            send_otp_email(user.email, otp, subject_type="verification", user_name=user.name)

            refresh = RefreshToken.for_user(user)

            res_data = {
                "message": "Organization registered successfully",
                "user": {
                    "email": user.email,
                    "name": user.name,
                    "role": user.role,
                    "organization": organization.name,
                },
            }

            response = Response(
                res_data,
                status=status.HTTP_201_CREATED,
            )

            set_auth_cookies(response, refresh)
            return response

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

class OrganizationTeamView(APIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedOrgMember]

    def get(self, request):
        users = User.objects.filter(
            organization=request.user.organization
        ).exclude(role="platform_admin")

        data = [
            {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
            }
            for user in users
        ]

        return Response(data)

class OrganizationProfileView(APIView):
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get(self, request):
        serializer = OrganizationProfileSerializer(
            request.user.organization
        )
        return Response(serializer.data)

    def patch(self, request):
        admin_permission = IsAdmin()

        if not admin_permission.has_permission(request, self):
            return Response(
                {
                    "message":
                        "Only admins can update company profile"
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # Pre-process request data to support deleting the logo
        data = request.data.copy() if hasattr(request.data, "copy") else request.data
        if "logo" in data and (data["logo"] == "" or data["logo"] == "null" or data["logo"] is None):
            data["logo"] = None
            org = request.user.organization
            if org.logo:
                org.logo.delete(save=False)

        serializer = OrganizationProfileSerializer(
            request.user.organization,
            data=data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
