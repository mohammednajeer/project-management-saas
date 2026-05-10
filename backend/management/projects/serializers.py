from rest_framework import serializers
from .models import Project


class ProjectSerializer(serializers.ModelSerializer):

    total_tasks =serializers.SerializerMethodField()

    completed_tasks =serializers.SerializerMethodField()

    members_data =serializers.SerializerMethodField()

    class Meta:
        model = Project

        fields = [
            "id",
            "name",
            "description",
            "priority",
            "status",
            "due_date",
            "organization",
            "created_by",
            "members",
            "members_data",
            "created_at",
            "total_tasks",
            "completed_tasks",
        ]

        read_only_fields = [
            "organization",
            "created_by",
            "created_at",
        ]

    def get_total_tasks(self, obj):

        return obj.tasks.count()

    def get_completed_tasks(self, obj):

        return obj.tasks.filter(
            status="done"
        ).count()

    def get_members_data(self, obj):

        return [

            {
                "id": str(member.id),
                "name": member.name,
                "email": member.email,
                "initials": (
                    member.name[:2].upper()
                    if member.name
                    else "?"
                )
            }

            for member in obj.members.all()
        ]