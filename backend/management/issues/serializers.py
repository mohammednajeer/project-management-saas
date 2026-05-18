from rest_framework import serializers

from .models import Issue


class IssueSerializer(serializers.ModelSerializer):

    raised_by_data = (
        serializers.SerializerMethodField()
    )

    assigned_to_data = (
        serializers.SerializerMethodField()
    )

    class Meta:

        model = Issue

        fields = [
            "id",
            "title",
            "description",
            "project",
            "task",
            "subtask",
            "raised_by",
            "raised_by_data",
            "assigned_to",
            "assigned_to_data",
            "status",
            "priority",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "raised_by",
            "created_at",
            "updated_at",
        ]

    def get_raised_by_data(self, obj):

        return {
            "id": str(obj.raised_by.id),
            "name": obj.raised_by.name,
            "email": obj.raised_by.email,
            "role": obj.raised_by.role,
        }

    def get_assigned_to_data(self, obj):

        if not obj.assigned_to:
            return None

        return {
            "id": str(obj.assigned_to.id),
            "name": obj.assigned_to.name,
            "email": obj.assigned_to.email,
            "role": obj.assigned_to.role,
        }