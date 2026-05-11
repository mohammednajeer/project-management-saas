from rest_framework import serializers
from .models import Task,SubTask,TaskComment


class TaskSerializer(serializers.ModelSerializer):

    subtask_count = serializers.SerializerMethodField()

    completed_subtasks = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    assigned_users =serializers.SerializerMethodField()

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
            "progress",
            "completed_subtasks",
            "assigned_to",
            "assigned_users",
            
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
    

    def get_progress(self, obj):

        total = obj.subtasks.count()

        if total == 0:
            return 0

        completed = obj.subtasks.filter(
            status="done"
        ).count()

        return round(
            (completed / total) * 100
        )
    def get_assigned_users(self, obj):

        return [

            {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
            }

            for user in obj.assigned_to.all()
        ]
    



class SubTaskSerializer(serializers.ModelSerializer):

    assigned_users = serializers.SerializerMethodField()

    class Meta:
        model = SubTask

        fields = [
            "id",
            "task",
            "title",
            "description",
            "assigned_to",
            "assigned_users",
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

    def get_assigned_users(self, obj):

        return [
            {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
            }
            for user in obj.assigned_to.all()
        ]
    
class TaskCommentSerializer(serializers.ModelSerializer):

    user_data =serializers.SerializerMethodField()
    subtask_data =serializers.SerializerMethodField()

    class Meta:

        model = TaskComment

        fields = [
            "id",
            "task",
            "subtask",
            "subtask_data",
            "user",
            "user_data",
            "message",
            "created_at",

        ]

        read_only_fields = [
            "id",
            "task",
            "user",
            "created_at",
        ]

    def get_user_data(self,obj):

        return {
            "id": str(obj.user.id),
            "name": obj.user.name,
            "email": obj.user.email,
        }
    
    def get_subtask_data(self,obj):

        if not obj.subtask:
            return None

        return {
            "id": str(obj.subtask.id),
            "title": obj.subtask.title,
        }