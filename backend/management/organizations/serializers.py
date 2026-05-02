from rest_framework import serializers
from .models import Organization
from accounts.models import User


class RegisterOrganizationSerializer(serializers.ModelSerializer):

    admin_name = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Organization
        fields = [
            "name",
            "email",
            "phone",
            # "company_code",
            "admin_name",
            "password"
        ]
        def validate_email(self, value):

            if User.objects.filter(email=value).exists():
                raise serializers.ValidationError(
                    "User with this email already exists."
                )

            return value
    # IMPORTANT: This must be aligned with Meta, not inside it
    def create(self, validated_data):

        admin_name = validated_data.pop("admin_name")
        password = validated_data.pop("password")

        # Create organization
        organization = Organization.objects.create(
            **validated_data
        )

        # Create admin user
        User.objects.create_user(
            email=validated_data["email"],
            password=password,
            name=admin_name,
            role="admin",
            organization=organization
        )

        return organization