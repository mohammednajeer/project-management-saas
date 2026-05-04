from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny
from accounts.models import User

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    permission_classes  = [AllowAny]

    def post(self, request):

        email = request.data.get("email")
        password = request.data.get("password")

        user = authenticate(
            email=email,
            password=password
        )

        if not user:
            return Response(
                {"message": "Invalid credentials"},
                status=status.HTTP_400_BAD_REQUEST
            )

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        response = Response(
            {
                "message": "Login successful",
                "user": {
                    "email": user.email,
                    "name": user.name,
                    "role": user.role,
                    "organization": user.organization.name,
                },
                "access": access_token,
                "refresh": str(refresh),
            }
        )

        # Store token in cookie
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,  # True in production
            samesite="Lax",
            path="/",
        )

        return response
    

class LogoutView(APIView):

    def post(self, request):

        response = Response(
            {"message": "Logged out"}
        )

        response.delete_cookie("access_token")

        return response
    


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response({
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "organization": user.organization.name
        })





   
from invitations.models import Invitation
from django.utils import timezone


class InviteRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):

        token = request.data.get("token")
        name = request.data.get("name")
        password = request.data.get("password")

        # 🔥 Validate token
        try:
            invitation = Invitation.objects.get(token=token)
        except Invitation.DoesNotExist:
            return Response(
                {"message": "Invalid invitation"},
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

        # 🔥 Create user
        user = User.objects.create_user(
            email=invitation.email,
            password=password,
            name=name,
            role=invitation.role,
            organization=invitation.organization
        )

        # 🔥 Mark invite as used
        invitation.is_used = True
        invitation.save()

        # 🔥 Auto login
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        response = Response({
            "message": "Account created via invite"
        })

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,
            samesite="Lax",
            path="/",
        )

        return response