from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny
from accounts.models import User
from accounts.auth_cookies import (
    ACCESS_COOKIE_MAX_AGE,
    AUTH_COOKIE_SAMESITE,
    AUTH_COOKIE_SECURE,
    set_auth_cookies,
)
from .serializers import UserSerializer, LoginSerializer


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
                "user": UserSerializer(user).data,
                "access": access_token,
                "refresh": str(refresh),
            }
        )

        set_auth_cookies(response, refresh)

        return response
     

@method_decorator(csrf_exempt, name='dispatch')
class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response(
                {"message": "Refresh token missing"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(refresh_token)
        except TokenError:
            response = Response(
                {"message": "Refresh token invalid or expired"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            response.delete_cookie("access_token")
            response.delete_cookie("refresh_token")
            return response

        access_token = str(refresh.access_token)

        response = Response(
            {
                "message": "Access token refreshed",
                "access": access_token,
            }
        )

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=AUTH_COOKIE_SECURE,
            samesite=AUTH_COOKIE_SAMESITE,
            path="/",
            max_age=ACCESS_COOKIE_MAX_AGE,
        )

        return response


class LogoutView(APIView):

    def post(self, request):

        response = Response(
            {"message": "Logged out"}
        )

        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")

        return response
    


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # return Response({
        #     "email": user.email,
        #     "name": user.name,
        #     "role": user.role,
        #     "organization": user.organization.name
        # })
        serializer = UserSerializer(user)

        return Response(
            serializer.data
        )





   
from invitations.models import Invitation
from django.utils import timezone


class InviteRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):

        token = request.data.get("token")
        name = request.data.get("name")
        password = request.data.get("password")

        
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

        
        user = User.objects.create_user(
            email=invitation.email,
            password=password,
            name=name,
            role=invitation.role,
            organization=invitation.organization
        )

        
        invitation.is_used = True
        invitation.save()

        
        refresh = RefreshToken.for_user(user)
        response = Response({
            "message": "Account created via invite"
        })

        set_auth_cookies(response, refresh)

        return response


class ProfileUpdateView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def patch(self, request):

        user = request.user

        fields = [
            "name",
            "bio",
            "designation",
            "department",
            "phone_number",
            "work_status",
        ]

        for field in fields:

            value = request.data.get(field)

            if value is not None:

                setattr(
                    user,
                    field,
                    value
                )
                

        profile_picture = request.FILES.get(
            "profile_picture"
        )

        if profile_picture:
            
            if user.profile_picture:

                user.profile_picture.delete(
                    save=False
                )

            user.profile_picture = (
                profile_picture
            )

        user.save()

        serializer = UserSerializer(user)

        return Response(serializer.data)
