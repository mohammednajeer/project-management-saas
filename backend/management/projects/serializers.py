from rest_framework import serializers
from .models import Project


class ProjectSerializer(serializers.ModelSerializer):

    total_tasks = serializers.SerializerMethodField()
    completed_tasks = serializers.SerializerMethodField()
    members_data = serializers.SerializerMethodField()

    class Meta:
        model = Project

        fields = [
            "id",
            "name",
            "description",
            "status",
            "priority",
            "due_date",
            "created_at",
            "organization",
            "created_by",
            "members",
            "members_data",
            "total_tasks",
            "completed_tasks",
        ]

        read_only_fields = [
            "id",
            "organization",
            "created_by",
            "created_at",
            "members",
        ]

    def get_total_tasks(self, obj):
        return 0

    def get_completed_tasks(self, obj):
        return 0

    def get_members_data(self, obj):

        return [
            {
                "id": str(member.id),
                "name": member.name,
                "initials": (
                    member.name[:2].upper()
                    if member.name
                    else "?"
                )
            }
            for member in obj.organization.users.all()
        ]