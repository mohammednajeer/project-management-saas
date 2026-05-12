from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsEmployee
from tasks.models import Task, SubTask
from tasks.serializers import (
    TaskSerializer,
    SubTaskSerializer,
)


class WorkspaceTasksView(APIView):

    permission_classes = [IsAuthenticated, IsEmployee]

    def get(self, request):

        tasks = Task.objects.filter(
            assigned_to=request.user
        ).distinct()

        serializer = TaskSerializer(
            tasks,
            many=True
        )

        return Response(serializer.data)


class WorkspaceSubTasksView(APIView):

    permission_classes = [IsAuthenticated, IsEmployee]

    def get(self, request):

        subtasks = SubTask.objects.filter(
            assigned_to=request.user
        ).distinct()

        serializer = SubTaskSerializer(
            subtasks,
            many=True
        )

        return Response(serializer.data)
