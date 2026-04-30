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
            "company_code",
            "admin_name",
            "password"
        ]

        def create(self,validate_data):
            admin_name = validate_data.pop("admin_name")
            password  =validate_data.pop("password")

            organization = Organization.objects.create(
                **validate_data
            )

            User.objects.create_user(
                email = validate_data["email"],
                password = password,
                name = admin_name,
                role = "admin",
                organization  = organization
            )

            return organization
    