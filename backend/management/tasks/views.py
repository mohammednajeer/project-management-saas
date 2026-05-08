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