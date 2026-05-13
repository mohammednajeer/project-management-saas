from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from tasks.models import Task
from accounts.permissions import IsManagerOrAdmin

from .models import Activity
from .serializers import ActivitySerializer


class ActivityListView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsManagerOrAdmin,
    ]

    def get(self, request):

        activities = Activity.objects.filter(
            organization=request.user.organization
        ).select_related(
            "user"
        )[:20]

        serializer = ActivitySerializer(
            activities,
            many=True
        )

        return Response(serializer.data)
    

from rest_framework import status


class TaskActivityListView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsManagerOrAdmin,
    ]

    def get(self, request, task_id):

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

        activities = Activity.objects.filter(
            task=task
        ).select_related(
            "user",
            "project",
            "task",
            "subtask"
        )

        serializer = ActivitySerializer(
            activities,
            many=True
        )

        return Response(serializer.data)