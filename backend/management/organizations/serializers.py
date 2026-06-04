from rest_framework import serializers
from .models import Organization
from accounts.models import User


class OrganizationProfileSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="name")
    employee_count = serializers.SerializerMethodField()
    manager_count = serializers.SerializerMethodField()
    total_members = serializers.SerializerMethodField()
    active_projects = serializers.SerializerMethodField()
    active_tasks = serializers.SerializerMethodField()
    pending_leave_requests = serializers.SerializerMethodField()
    holiday_count = serializers.SerializerMethodField()
    upcoming_events_count = serializers.SerializerMethodField()
    approved_leave_count = serializers.SerializerMethodField()
    employees_on_leave_today = serializers.SerializerMethodField()

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
            "total_members",
            "active_projects",
            "active_tasks",
            "pending_leave_requests",
            "holiday_count",
            "upcoming_events_count",
            "approved_leave_count",
            "employees_on_leave_today",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "employee_count",
            "manager_count",
            "total_members",
            "active_projects",
            "active_tasks",
            "pending_leave_requests",
            "holiday_count",
            "upcoming_events_count",
            "approved_leave_count",
            "employees_on_leave_today",
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

    def get_total_members(self, obj):
        return obj.users.count()

    def get_active_projects(self, obj):
        return obj.projects.filter(status="active").count()

    def get_active_tasks(self, obj):
        from tasks.models import Task

        return Task.objects.filter(
            project__organization=obj,
            status__in=[
                "todo",
                "in_progress",
                "review",
            ]
        ).count()

    def get_pending_leave_requests(self, obj):
        return obj.leave_requests.filter(status="pending").count()

    def get_holiday_count(self, obj):
        from company_calendar.models import CalendarEvent
        return CalendarEvent.objects.filter(
            organization=obj,
            event_type="holiday"
        ).count()

    def get_upcoming_events_count(self, obj):
        import datetime
        from company_calendar.models import CalendarEvent
        return CalendarEvent.objects.filter(
            organization=obj,
            event_type="company_event",
            start_date__gte=datetime.date.today()
        ).count()

    def get_approved_leave_count(self, obj):
        return obj.leave_requests.filter(status="approved").count()

    def get_employees_on_leave_today(self, obj):
        import datetime
        today = datetime.date.today()
        leaves = obj.leave_requests.filter(
            status="approved",
            start_date__lte=today,
            end_date__gte=today
        ).select_related("employee")
        return [
            {
                "id": str(leave.employee.id),
                "name": leave.employee.name,
                "email": leave.employee.email,
                "leave_type": leave.get_leave_type_display(),
                "duration": f"{leave.start_date} - {leave.end_date}"
            }
            for leave in leaves
        ]


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

        
        user = User.objects.create_user(
            email=validated_data["email"],
            password=password,
            name=admin_name,
            role="admin",
            organization=organization
        )

        from notifications.models import Notification
        Notification.objects.create(
            user=user,
            title="Welcome to ProjectFlow",
            message="Welcome to ProjectFlow. Get started by creating a new project or inviting team members.",
            type="welcome_organization_creator",
            category="system"
        )

        return organization
