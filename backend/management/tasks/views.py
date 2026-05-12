from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Task,SubTask,TaskComment
from .serializers import TaskSerializer,SubTaskSerializer,TaskCommentSerializer
from notifications.models import Notification
from projects.models import Project
from accounts.permissions import IsManagerOrAdmin


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

        if serializer.is_valid():

            serializer.save()

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

            serializer.save()

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
