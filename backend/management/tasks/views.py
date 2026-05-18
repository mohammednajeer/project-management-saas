from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Task,SubTask,TaskComment
from .serializers import TaskSerializer,SubTaskAttachmentSerializer,TaskAttachmentSerializer,SubTaskSerializer,TaskCommentSerializer
from notifications.models import Notification
from projects.models import Project
from accounts.permissions import IsManagerOrAdmin
from activities.utils import create_activity
from .models import (
    TaskAttachment,
    SubTaskAttachment,
)

class ProjectTaskListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get(self, request, project_id):

        tasks = Task.objects.filter(
            project__id=project_id,
            project__organization=
                request.user.organization
        )

        serializer = TaskSerializer(
            tasks,
            many=True
        )

        return Response(serializer.data)

    def post(self, request, project_id):

        try:
            project = Project.objects.get(
                id=project_id,
                organization=
                    request.user.organization
            )
            if project.status in [
                "archived",
                "completed"
            ]:

                return Response(
                    {
                        "message":
                        "Project is locked"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Project.DoesNotExist:
            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TaskSerializer(
            data=request.data
        )

        if serializer.is_valid():

            task = serializer.save(
                project=project,
                created_by=request.user
            )
            create_activity(

                organization=request.user.organization,

                user=request.user,

                action= "task_created",

                message=
                    f"Created task "
                    f"'{task.title}'",

                task=task,

                project= task.project,
            )

            return Response(
                TaskSerializer(task).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
class SubTaskListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get(self, request, task_id):

        subtasks = SubTask.objects.filter(
            task__id=task_id,
            task__project__organization=
                request.user.organization
                    )

        serializer = SubTaskSerializer(
            subtasks,
            many=True
        )

        return Response(serializer.data)

    def post(self, request, task_id):

        try:
            task = Task.objects.get(
                id=task_id,
                project__organization=
                    request.user.organization
                )

        except Task.DoesNotExist:
                return Response(
                    {"message": "Task not found"},
                    status=status.HTTP_404_NOT_FOUND
            )

        serializer = SubTaskSerializer(
            data=request.data
        )

        if serializer.is_valid():

            subtask = serializer.save(task=task)
            create_activity(

                organization=request.user.organization,

                user=request.user,

                action="subtask_created",

                message=
                    f"Created subtask "
                    f"'{subtask.title}'",

                project=task.project,

                task= task,

                subtask=subtask,
            )

            for user in subtask.assigned_to.all():

                Notification.objects.create(

                    user=user,

                    title="New Subtask Assigned",

                    message=
                    f"You were assigned "
                    f"to subtask: "
                    f"{subtask.title}",

                    type="subtask_assigned"
                )

            return Response(
               SubTaskSerializer(subtask).data,
                    status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
        )
    

class SubTaskUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def patch(self, request, subtask_id):

        try:

            subtask = SubTask.objects.get(
                id=subtask_id,
                task__project__organization=
                    request.user.organization
            )

        except SubTask.DoesNotExist:

            return Response(
                {"message": "Subtask not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = SubTaskSerializer(
            subtask,
            data=request.data,
            partial=True
        )
        old_status = subtask.status

        if serializer.is_valid():

            serializer.save()
            new_status = serializer.instance.status

            if old_status != new_status:

                create_activity(

                    organization=
                        request.user.organization,

                    user=
                        request.user,

                    action=
                        "subtask_updated",

                    message=
                        f"Changed subtask "
                        f"'{subtask.title}' "
                        f"status from "
                        f"{old_status} "
                        f"to "
                        f"{new_status}",

                    project=
                        subtask.task.project,

                    task=
                        subtask.task,

                    subtask=
                        subtask,
                )

            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    def delete(self, request, subtask_id):

        try:

            subtask = SubTask.objects.get(
                id=subtask_id,
                task__project__organization=
                    request.user.organization
            )

        except SubTask.DoesNotExist:

            return Response(
                {"message": "Subtask not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        subtask.delete()

        return Response(
            {
                "message":
                "Subtask deleted"
            }
        )
    



class TaskUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def patch(self, request, task_id):

        try:

            task = Task.objects.get(
                id=task_id,
                project__organization=
                    request.user.organization
            )

        except Task.DoesNotExist:

            return Response(
                {"message": "Task not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TaskSerializer(
            task,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            old_status = task.status

            old_priority = task.priority

            old_due_date = task.due_date

            serializer.save()
            updated_task = serializer.instance

            if old_status != updated_task.status:

                create_activity(
                    organization=request.user.organization,
                    user=request.user,
                    action="task_updated",
                    message=(
                        f"Changed task "
                        f"'{task.title}' "
                        f"status from "
                        f"{old_status} "
                        f"to "
                        f"{updated_task.status}"
                    ),
                    project=task.project,
                    task=task,
                )


            if old_priority != updated_task.priority:

                create_activity(
                    organization=request.user.organization,
                    user=request.user,
                    action="task_updated",
                    message=(
                        f"Changed task "
                        f"'{task.title}' "
                        f"priority from "
                        f"{old_priority} "
                        f"to "
                        f"{updated_task.priority}"
                    ),
                    project=task.project,
                    task=task,
                )


            if old_due_date != updated_task.due_date:

                create_activity(
                    organization=request.user.organization,
                    user=request.user,
                    action="task_updated",
                    message=(
                        f"Updated due date for "
                        f"task "
                        f"'{task.title}'"
                    ),
                    project=task.project,
                    task=task,
                )

            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
class TaskDetailView(APIView):
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get_object(self, task_id, user):

        try:

            return Task.objects.get(
                id=task_id,
                project__organization=
                    user.organization
            )

        except Task.DoesNotExist:

            return None

    def patch(self, request, task_id):

        task = self.get_object(
            task_id,
            request.user
        )

        if not task:

            return Response(
                {"message": "Task not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TaskSerializer(
            task,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return Response(
                serializer.data
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, task_id):

        task = self.get_object(
            task_id,
            request.user
        )

        if not task:

            return Response(
                {"message": "Task not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        task.delete()

        return Response(
            {
                "message":
                "Task deleted successfully"
            }
        )

class TaskCommentListCreateView(APIView):

    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get(self, request, task_id):

        comments = TaskComment.objects.filter(
            task__id=task_id,
            task__project__organization=request.user.organization
        ).order_by("-created_at")

        serializer = TaskCommentSerializer(
            comments,
            many=True
        )

        return Response(serializer.data)

    def post(self, request, task_id):

        try:

            task = Task.objects.get(
                id=task_id,
                project__organization=request.user.organization
            )

        except Task.DoesNotExist:

            return Response(
                {
                    "message": "Task not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TaskCommentSerializer(
            data=request.data
        )

        if serializer.is_valid():

            comment = serializer.save(
                task=task,
                user=request.user
            )
            if comment.subtask:

                activity_message = (
                    f"Commented on subtask "
                    f"'{comment.subtask.title}'"
                )

            else:

                activity_message = (
                    f"Commented on task "
                    f"'{task.title}'"
                )

            create_activity(
                organization=request.user.organization,
                user=request.user,
                action="comment_added",
                message=activity_message,
                project=task.project,
                task=task,
                subtask=comment.subtask,
            )
            users_to_notify = set()

            for user in task.assigned_to.all():

                if user != request.user:
                    users_to_notify.add(user)

            if comment.subtask:

                for user in comment.subtask.assigned_to.all():

                    if user != request.user:
                        users_to_notify.add(user)

            for user in users_to_notify:

                Notification.objects.create(
                    user=user,
                    title="New Comment",
                    message=(
                        f"{request.user.name} "
                        f"commented on "
                        f"{task.title}"
                    ),
                    type="comment_added"
                )

            return Response(
                TaskCommentSerializer(comment).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class TaskAttachmentUploadView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsManagerOrAdmin,
    ]

    def post(self, request, task_id):

        try:

            task = Task.objects.get(
                id=task_id,
                project__organization=
                    request.user.organization
            )

        except Task.DoesNotExist:

            return Response(
                {
                    "message":
                    "Task not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        uploaded_file = request.FILES.get(
            "file"
        )

        if not uploaded_file:

            return Response(
                {
                    "message":
                    "No file uploaded"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        attachment = (
            TaskAttachment.objects.create(
                task=task,
                uploaded_by=request.user,
                file=uploaded_file,
            )
        )
        print(attachment.file.url)

        serializer = (
            TaskAttachmentSerializer(
                attachment
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )

class TaskAttachmentListView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request, task_id):

        attachments = (
            TaskAttachment.objects.filter(
                task_id=task_id,
                task__project__organization=
                    request.user.organization
            )
            .select_related(
                "uploaded_by"
            )
            .order_by("-uploaded_at")
        )

        serializer = (
            TaskAttachmentSerializer(
                attachments,
                many=True
            )
        )

        return Response(serializer.data)
    
class TaskAttachmentDeleteView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsManagerOrAdmin,
    ]

    def delete(self, request, attachment_id):

        try:

            attachment = TaskAttachment.objects.get(
                id=attachment_id,
                task__project__organization=request.user.organization
            )

        except TaskAttachment.DoesNotExist:

            return Response(
                {
                    "message": "Attachment not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        attachment.file.delete(save=False)

        attachment.delete()

        return Response(
            {
                "message": "Attachment deleted successfully"
            }
        )


class SubTaskAttachmentUploadView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(self, request, subtask_id):

        try:

            subtask = SubTask.objects.get(
                id=subtask_id,
                task__project__organization=request.user.organization
            )

        except SubTask.DoesNotExist:

            return Response(
                {
                    "message": "Subtask not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        uploaded_file = request.FILES.get("file")

        if not uploaded_file:

            return Response(
                {
                    "message": "No file uploaded"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        attachment = SubTaskAttachment.objects.create(
            subtask=subtask,
            uploaded_by=request.user,
            file=uploaded_file,
            original_name=uploaded_file.name,
        )

        serializer = SubTaskAttachmentSerializer(
            attachment
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )
    
class SubTaskAttachmentListView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request, subtask_id):

        attachments = (
            SubTaskAttachment.objects
            .filter(
                subtask_id=subtask_id,
                subtask__task__project__organization=request.user.organization
            )
            .select_related(
                "uploaded_by"
            )
            .order_by(
                "-uploaded_at"
            )
        )

        serializer = SubTaskAttachmentSerializer(
            attachments,
            many=True
        )

        return Response(serializer.data)
    
class SubTaskAttachmentDeleteView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsManagerOrAdmin,
    ]

    def delete(self, request, attachment_id):

        try:

            attachment = (
                SubTaskAttachment.objects.get(
                    id=attachment_id,
                    subtask__task__project__organization=request.user.organization
                )
            )

        except SubTaskAttachment.DoesNotExist:

            return Response(
                {
                    "message": "Attachment not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        attachment.file.delete()

        attachment.delete()

        return Response(
            {
                "message": "Attachment deleted successfully"
            }
        )