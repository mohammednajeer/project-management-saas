from rest_framework import serializers

from .models import Activity


class ActivitySerializer(serializers.ModelSerializer):

    user_data = serializers.SerializerMethodField()

    project_data = serializers.SerializerMethodField()

    task_data = serializers.SerializerMethodField()

    subtask_data = serializers.SerializerMethodField()

    class Meta:

        model = Activity

        fields = [
            "id",
            "action",
            "message",
            "created_at",
            "user_data",
            "project_data",
            "task_data",
            "subtask_data"
        ]

    def get_user_data(self, obj):

        return {
            "id": str(obj.user.id),
            "name": obj.user.name,
            "email": obj.user.email,
            "role": obj.user.role,
            "profile_picture": obj.user.profile_picture.url if obj.user.profile_picture else None,
        }
    
    def get_project_data(self, obj):

        if not obj.project:
            return None

        return {

            "id":
                str(obj.project.id),

            "name":
                obj.project.name,
        }


    def get_task_data(self, obj):

        if not obj.task:
            return None

        return {

            "id":
                str(obj.task.id),

            "title":
                obj.task.title,
        }


    def get_subtask_data(self, obj):

        if not obj.subtask:
            return None

        return {

            "id":
                str(obj.subtask.id),

            "title":
                obj.subtask.title,
        }