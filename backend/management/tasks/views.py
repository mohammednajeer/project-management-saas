from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Task,SubTask
from .serializers import TaskSerializer,SubTaskSerializer

from projects.models import Project


class ProjectTaskListCreateView(APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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

            subtask = serializer.save(
                task=task
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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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