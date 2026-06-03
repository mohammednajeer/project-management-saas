from rest_framework import serializers

from .models import LeaveRequest, LeaveBalance


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_data = serializers.SerializerMethodField()
    approved_by_data = serializers.SerializerMethodField()
    leave_type_label = serializers.CharField(
        source="get_leave_type_display",
        read_only=True
    )
    status_label = serializers.CharField(
        source="get_status_display",
        read_only=True
    )

    class Meta:
        model = LeaveRequest
        fields = [
            "id",
            "employee",
            "employee_data",
            "organization",
            "leave_type",
            "leave_type_label",
            "start_date",
            "end_date",
            "reason",
            "status",
            "status_label",
            "approved_by",
            "approved_by_data",
            "approved_at",
            "rejection_reason",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "employee",
            "organization",
            "status",
            "approved_by",
            "approved_at",
            "created_at",
        ]

    def validate(self, attrs):
        start_date = attrs.get(
            "start_date",
            getattr(self.instance, "start_date", None)
        )
        end_date = attrs.get(
            "end_date",
            getattr(self.instance, "end_date", None)
        )

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({
                "end_date": "End date must be after start date."
            })

        # Validate leave balance
        request = self.context.get("request")
        if request and not self.instance:
            employee = request.user
            leave_type = attrs.get("leave_type")

            if leave_type in ["annual", "sick", "casual", "personal", "vacation"]:
                lookup_type = "annual" if leave_type == "vacation" else leave_type

                # Auto-initialize balance if missing
                balance, created = LeaveBalance.objects.get_or_create(
                    employee=employee,
                    leave_type=lookup_type,
                    defaults={
                        "organization": employee.organization,
                        "allocated_days": 20 if lookup_type == "annual" else 10
                    }
                )

                duration = (end_date - start_date).days + 1
                if balance.remaining_days < duration:
                    raise serializers.ValidationError({
                        "end_date": (
                            f"Insufficient leave balance. Requested {duration} days, "
                            f"but only have {balance.remaining_days} days remaining."
                        )
                    })

        return attrs

    def get_employee_data(self, obj):
        return {
            "id": str(obj.employee.id),
            "name": obj.employee.name,
            "email": obj.employee.email,
            "role": obj.employee.role,
        }

    def get_approved_by_data(self, obj):
        if not obj.approved_by:
            return None

        return {
            "id": str(obj.approved_by.id),
            "name": obj.approved_by.name,
            "email": obj.approved_by.email,
        }


class LeaveBalanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.name", read_only=True)
    employee_email = serializers.CharField(source="employee.email", read_only=True)
    leave_type_label = serializers.CharField(
        source="get_leave_type_display",
        read_only=True
    )
    used_days = serializers.IntegerField(read_only=True)
    remaining_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = LeaveBalance
        fields = [
            "id",
            "employee",
            "employee_name",
            "employee_email",
            "leave_type",
            "leave_type_label",
            "allocated_days",
            "used_days",
            "remaining_days",
        ]
        read_only_fields = [
            "id",
            "employee",
            "leave_type",
        ]


