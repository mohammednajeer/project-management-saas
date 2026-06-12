from rest_framework import serializers
from .models import (
    Task,
    SubTask,
    TaskComment,
    TaskAttachment,
    SubTaskAttachment,
)


class TaskSerializer(serializers.ModelSerializer):

    subtask_count = serializers.SerializerMethodField()

    completed_subtasks = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    assigned_users =serializers.SerializerMethodField()
    blocked_by_data = serializers.SerializerMethodField()
    blocking_data = serializers.SerializerMethodField()

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
            "blocked_by",
            "blocked_by_data",
            "blocking_data",
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
                "role": user.role,
                "profile_picture": user.profile_picture.url if user.profile_picture else None,
            }

            for user in obj.assigned_to.all()
        ]

    def get_blocked_by_data(self, obj):
        return [
            {
                "id": str(t.id),
                "title": t.title,
                "status": t.status,
            }
            for t in obj.blocked_by.all()
        ]

    def get_blocking_data(self, obj):
        return [
            {
                "id": str(t.id),
                "title": t.title,
                "status": t.status,
            }
            for t in obj.blocking.all()
        ]

    def check_circularity(self, task, target_id):
        visited = set()
        def has_path(current_id, target_id):
            if current_id == target_id:
                return True
            if current_id in visited:
                return False
            visited.add(current_id)
            try:
                curr_task = Task.objects.get(id=current_id)
                for blocker in curr_task.blocked_by.all():
                    if has_path(blocker.id, target_id):
                        return True
            except Task.DoesNotExist:
                pass
            return False
        return has_path(task.id, target_id)

    def validate(self, attrs):
        status_val = attrs.get("status", self.instance.status if self.instance else "todo")
        
        if status_val == "done" and self.instance:
            blockers = attrs.get("blocked_by", None)
            if blockers is None:
                unresolved_blockers = self.instance.blocked_by.exclude(status="done")
            else:
                unresolved_blockers = [t for t in blockers if t.status != "done"]
            
            if unresolved_blockers:
                titles = ", ".join([t.title for t in unresolved_blockers])
                raise serializers.ValidationError(
                    {"status": f"Cannot complete task because it is blocked by unresolved tasks: {titles}"}
                )

        blocked_by_tasks = attrs.get("blocked_by", None)
        if blocked_by_tasks is not None and self.instance:
            for blocker in blocked_by_tasks:
                if blocker.id == self.instance.id:
                    raise serializers.ValidationError(
                        {"blocked_by": "A task cannot block itself."}
                    )
                if self.check_circularity(blocker, self.instance.id):
                    raise serializers.ValidationError(
                        {"blocked_by": f"Circular dependency detected: '{blocker.title}' is blocked by this task."}
                    )
                if blocker.project != self.instance.project:
                    raise serializers.ValidationError(
                        {"blocked_by": "Blocker task must belong to the same project."}
                    )

        assigned_to = attrs.get("assigned_to")
        if assigned_to is not None:
            project = self.instance.project if self.instance else self.context.get("project")
            if project:
                project_member_ids = set(project.members.values_list('id', flat=True))
                if project.project_lead_id:
                    project_member_ids.add(project.project_lead_id)
                for user in assigned_to:
                    if user.id not in project_member_ids:
                        raise serializers.ValidationError(
                            {"assigned_to": f"User {user.name} is not a member of the project."}
                        )
                    if user.role in ["admin", "manager"]:
                        raise serializers.ValidationError(
                            {"assigned_to": f"{user.name} is an {user.role} and cannot be assigned work. "
                                            f"Admins and managers monitor projects — only employees can be assignees."}
                        )

        return attrs
    



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

    def validate(self, attrs):
        assigned_to = attrs.get("assigned_to")
        if assigned_to is not None:
            task = self.instance.task if self.instance else self.context.get("task")
            if task:
                project = task.project
                project_member_ids = set(project.members.values_list('id', flat=True))
                if project.project_lead_id:
                    project_member_ids.add(project.project_lead_id)
                for user in assigned_to:
                    if user.id not in project_member_ids:
                        raise serializers.ValidationError(
                            {"assigned_to": f"User {user.name} is not a member of the project."}
                        )
                    if user.role in ["admin", "manager"]:
                        raise serializers.ValidationError(
                            {"assigned_to": f"{user.name} is an {user.role} and cannot be assigned work. "
                                            f"Admins and managers monitor projects — only employees can be assignees."}
                        )
        return attrs

    def get_assigned_users(self, obj):

        return [
            {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "profile_picture": user.profile_picture.url if user.profile_picture else None,
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
            "role": obj.user.role,
            "profile_picture": obj.user.profile_picture.url if obj.user.profile_picture else None,
        }
    
    def get_subtask_data(self,obj):

        if not obj.subtask:
            return None

        return {
            "id": str(obj.subtask.id),
            "title": obj.subtask.title,
        }
    
class TaskAttachmentSerializer( serializers.ModelSerializer):

    uploaded_by_data = ( serializers.SerializerMethodField())
    file_size = serializers.SerializerMethodField()
    original_name = serializers.SerializerMethodField()

    class Meta:

        model = TaskAttachment

        fields = [
            "id",
            "file",
            "original_name",
            "file_size",
            "uploaded_at",
            "uploaded_by_data",
        ]

    def get_uploaded_by_data( self,obj):

        return {

            "id": str(obj.uploaded_by.id),

            "name":  obj.uploaded_by.name,

            "role": obj.uploaded_by.role,
        }

    def get_file_size(self, obj):

        try:
            return obj.file.size

        except OSError:
            return None

    def get_original_name(self, obj):

        if not obj.file:
            return None

        return obj.file.name.split("/")[-1]
    

class SubTaskAttachmentSerializer(serializers.ModelSerializer):

    uploaded_by_data = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = SubTaskAttachment

        fields = [
            "id",
            "file",
            "original_name",
            "file_size",
            "uploaded_at",
            "uploaded_by_data",
        ]

    def get_uploaded_by_data(self, obj):

        return {
            "id": str(obj.uploaded_by.id),
            "name": obj.uploaded_by.name,
            "role": obj.uploaded_by.role,
        }

    def get_file_size(self, obj):

        try:
            return obj.file.size

        except OSError:
            return None
