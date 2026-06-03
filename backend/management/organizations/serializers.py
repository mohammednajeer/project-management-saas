from rest_framework import serializers
from .models import Organization
from accounts.models import User


class OrganizationProfileSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="name")
    employee_count = serializers.SerializerMethodField()
    manager_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "company_name",
            "logo",
            "industry",
            "website",
            "phone",
            "address",
            "city",
            "state",
            "country",
            "timezone",
            "working_days",
            "working_hours_start",
            "working_hours_end",
            "description",
            "employee_count",
            "manager_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "employee_count",
            "manager_count",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        start = attrs.get(
            "working_hours_start",
            getattr(self.instance, "working_hours_start", None)
        )
        end = attrs.get(
            "working_hours_end",
            getattr(self.instance, "working_hours_end", None)
        )

        if start and end and start >= end:
            raise serializers.ValidationError({
                "working_hours_end":
                    "Working hours end must be after start time."
            })

        return attrs

    def get_employee_count(self, obj):
        return obj.users.filter(role="employee").count()

    def get_manager_count(self, obj):
        return obj.users.filter(role="manager").count()


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
    
    def create(self, validated_data):

        admin_name = validated_data.pop("admin_name")
        password = validated_data.pop("password")

        
        organization = Organization.objects.create(
            **validated_data
        )

        
        User.objects.create_user(
            email=validated_data["email"],
            password=password,
            name=admin_name,
            role="admin",
            organization=organization
        )

        return organization
