from rest_framework import serializers
from .models import User
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from organizations.serializers import OrganizationProfileSerializer

class UserSerializer(serializers.ModelSerializer):
    company_information = serializers.SerializerMethodField()

    class Meta:
        model = User

        fields = [
            "id",
            "email",
            "name",
            "role",
            "organization",
            "profile_picture",
            "bio",
            "designation",
            "department",
            "phone_number",
            "work_status",
            "joined_at",
            "company_information",
            "is_email_verified",
        ]

    def get_company_information(self, obj):
        if not obj.organization:
            return None

        return OrganizationProfileSerializer(obj.organization).data

class LoginSerializer(serializers.Serializer):

    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):

        email = data.get("email")
        password = data.get("password")

        user = authenticate(
            email=email,
            password=password
        )

        if not user:
            raise serializers.ValidationError(
                "Invalid email or password"
            )

        refresh = RefreshToken.for_user(user)

        return {
            "user": {
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "organization": user.organization.name,
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
    
