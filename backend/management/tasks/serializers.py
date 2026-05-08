from rest_framework import serializers
from .models import Task,SubTask


class TaskSerializer(serializers.ModelSerializer):

    subtask_count = serializers.SerializerMethodField()

    completed_subtasks = serializers.SerializerMethodField()

    class Meta:
        model = Task

        fields = [
            "id",
            "title",
            "description",
            "project",
            "created_by",
            "status",
            "priority",
            "due_date",
            "created_at",
            "subtask_count",
            "completed_subtasks",
        ]

        read_only_fields = [
            "id",
            "project",
            "created_by",
            "created_at",
        ]

    def get_subtask_count(self, obj):
        return obj.subtasks.count()

    def get_completed_subtasks(self, obj):

        return obj.subtasks.filter(
            status="done"
        ).count()
    
class SubTaskSerializer(serializers.ModelSerializer):

    assigned_user = serializers.SerializerMethodField()

    class Meta:
        model = SubTask
        fields = [
            "id",
            "task",
            "title",
            "description",
            "assigned_to",
            "assigned_user",
            "status",
            "priority",
            "due_date",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "task",
            "created_at",
        ]

    def get_assigned_user(self, obj):

        if not obj.assigned_to:
            return None

        return {
            "id": str(obj.assigned_to.id),
            "name": obj.assigned_to.name,
            "email": obj.assigned_to.email,
        }