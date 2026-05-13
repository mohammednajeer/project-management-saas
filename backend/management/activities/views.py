from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

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