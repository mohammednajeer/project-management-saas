from rest_framework import serializers

from .models import Issue, IssueAttachment


class IssueAttachmentSerializer(serializers.ModelSerializer):

    uploaded_by_data = serializers.SerializerMethodField()

    file_size = serializers.SerializerMethodField()

    class Meta:

        model = IssueAttachment

        fields = [
            "id",
            "file",
            "original_name",
            "uploaded_at",
            "uploaded_by_data",
            "file_size",
        ]

    def get_uploaded_by_data(self, obj):

        return {
            "id": str(obj.uploaded_by.id),
            "name": obj.uploaded_by.name,
            "email": obj.uploaded_by.email,
            "role": obj.uploaded_by.role,
        }

    def get_file_size(self, obj):

        try:
            return obj.file.size

        except OSError:
            return None


class IssueSerializer(serializers.ModelSerializer):

    raised_by_data = (
        serializers.SerializerMethodField()
    )

    assigned_to_data = (
        serializers.SerializerMethodField()
    )

    project_data = serializers.SerializerMethodField()

    task_data = serializers.SerializerMethodField()

    subtask_data = serializers.SerializerMethodField()

    attachments = IssueAttachmentSerializer(
        many=True,
        read_only=True,
    )

    class Meta:

        model = Issue

        fields = [
            "id",
            "title",
            "description",
            "project",
            "project_data",
            "task",
            "task_data",
            "subtask",
            "subtask_data",
            "raised_by",
            "raised_by_data",
            "assigned_to",
            "assigned_to_data",
            "status",
            "priority",
            "attachments",
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

    def get_project_data(self, obj):

        if not obj.project:
            return None

        return {
            "id": str(obj.project.id),
            "name": obj.project.name,
        }

    def get_task_data(self, obj):

        if not obj.task:
            return None

        return {
            "id": str(obj.task.id),
            "title": obj.task.title,
        }

    def get_subtask_data(self, obj):

        if not obj.subtask:
            return None

        return {
            "id": str(obj.subtask.id),
            "title": obj.subtask.title,
        }
