from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from leave_management.models import LeaveRequest
from notifications.models import Notification

from .models import CalendarEvent
from .serializers import CalendarEventSerializer


def user_can_manage_event(user, event_type=None, event=None, allow_delete=False):
    if user.role == "admin":
        return True

    if user.role != "manager" or allow_delete:
        return False

    next_type = event_type or event.event_type

    return next_type == "company_event" and (
        event is None or event.event_type == "company_event"
    )


class CalendarEventListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        events = CalendarEvent.objects.filter(
            organization=request.user.organization
        ).select_related(
            "created_by",
            "organization"
        )

        event_type = request.query_params.get("event_type")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if event_type:
            events = events.filter(event_type=event_type)

        if start_date:
            events = events.filter(end_date__gte=start_date)

        if end_date:
            events = events.filter(start_date__lte=end_date)

        return Response(CalendarEventSerializer(events, many=True).data)

    def post(self, request):
        if not user_can_manage_event(
            request.user,
            event_type=request.data.get("event_type")
        ):
            return Response(
                {"message": "You are not allowed to create this event"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CalendarEventSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        event = serializer.save(
            organization=request.user.organization,
            created_by=request.user
        )

        if event.event_type == "company_event":
            members = User.objects.filter(
                organization=request.user.organization
            ).exclude(id=request.user.id)

            for member in members:
                Notification.objects.create(
                    user=member,
                    title="Company Event Created",
                    message=(
                        f"{request.user.name} created "
                        f"company event: {event.title}"
                    ),
                    type="company_event_created"
                )

        return Response(
            CalendarEventSerializer(event).data,
            status=status.HTTP_201_CREATED
        )


class CalendarEventDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, event_id):
        try:
            return CalendarEvent.objects.select_related(
                "created_by",
                "organization"
            ).get(
                id=event_id,
                organization=request.user.organization
            )
        except CalendarEvent.DoesNotExist:
            return None

    def patch(self, request, event_id):
        event = self.get_object(request, event_id)

        if not event:
            return Response(
                {"message": "Calendar event not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if not user_can_manage_event(
            request.user,
            event_type=request.data.get("event_type", event.event_type),
            event=event
        ):
            return Response(
                {"message": "You are not allowed to edit this event"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CalendarEventSerializer(
            event,
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

    def delete(self, request, event_id):
        event = self.get_object(request, event_id)

        if not event:
            return Response(
                {"message": "Calendar event not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if not user_can_manage_event(
            request.user,
            event=event,
            allow_delete=True
        ):
            return Response(
                {"message": "Only admins can delete calendar events"},
                status=status.HTTP_403_FORBIDDEN
            )

        event.delete()

        return Response({"message": "Calendar event deleted"})


class CalendarFeedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization

        events = CalendarEvent.objects.filter(
            organization=organization
        ).select_related(
            "created_by"
        )

        approved_leaves = LeaveRequest.objects.filter(
            organization=organization,
            status="approved"
        ).select_related(
            "employee",
            "approved_by"
        )

        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if start_date:
            events = events.filter(end_date__gte=start_date)
            approved_leaves = approved_leaves.filter(end_date__gte=start_date)

        if end_date:
            events = events.filter(start_date__lte=end_date)
            approved_leaves = approved_leaves.filter(start_date__lte=end_date)

        calendar_items = [
            {
                "id": str(event.id),
                "source": "calendar_event",
                "title": event.title,
                "description": event.description,
                "event_type": event.event_type,
                "event_type_label": event.get_event_type_display(),
                "start_date": event.start_date,
                "end_date": event.end_date,
                "created_by_data": {
                    "id": str(event.created_by.id),
                    "name": event.created_by.name,
                    "email": event.created_by.email,
                },
            }
            for event in events
        ]

        calendar_items.extend([
            {
                "id": str(leave.id),
                "source": "leave_request",
                "title": f"{leave.employee.name} on leave",
                "description": leave.reason,
                "event_type": "leave",
                "event_type_label": leave.get_leave_type_display(),
                "start_date": leave.start_date,
                "end_date": leave.end_date,
                "employee_data": {
                    "id": str(leave.employee.id),
                    "name": leave.employee.name,
                    "email": leave.employee.email,
                },
            }
            for leave in approved_leaves
        ])

        calendar_items.sort(
            key=lambda item: (
                item["start_date"],
                item["title"].lower()
            )
        )

        return Response(calendar_items)

