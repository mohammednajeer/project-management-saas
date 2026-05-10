from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from .serializers import RegisterOrganizationSerializer
from rest_framework.permissions import IsAuthenticated


class RegisterOrganizationView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = RegisterOrganizationSerializer(data=request.data)

        if serializer.is_valid():

            organization = serializer.save()

            # FIX HERE
            user = organization.users.filter(role="admin").first()

            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)

            response = Response(
                {
                    "message": "Organization registered successfully",
                    "user": {
                        "email": user.email,
                        "name": user.name,
                        "role": user.role,
                        "organization": organization.name,
                    },
                },
                status=status.HTTP_201_CREATED,
            )

            response.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=False,
                samesite="Lax",
                path="/",
            )

            return response

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
    

class OrganizationTeamView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        users = User.objects.filter(
            organization=request.user.organization
        )

        data = [

            {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
            }

            for user in users
        ]

        return Response(data)