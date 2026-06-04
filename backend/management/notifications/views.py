from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        queryset = Notification.objects.filter(
            user=request.user
        ).order_by("-created_at")

        category = request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__iexact=category)

        unread = request.query_params.get("unread")
        if unread is not None:
            if unread.lower() == "true":
                queryset = queryset.filter(is_read=False)
            elif unread.lower() == "false":
                queryset = queryset.filter(is_read=True)

        serializer = NotificationSerializer(
            queryset,
            many=True
        )

        return Response(serializer.data)


class NotificationReadView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):

        try:

            notification = Notification.objects.get(
                id=notification_id,
                user=request.user
            )

        except Notification.DoesNotExist:

            return Response(
                {
                    "message": "Notification not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        notification.is_read = True
        notification.save()

        return Response(
            {
                "message": "Notification marked as read"
            }
        )


class NotificationMarkAllReadView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)

        return Response(
            {
                "message": "All notifications marked as read"
            }
        )