from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q

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

    next_type = event_type or (event.event_type if event else None)

    # Managers can manage company events, meetings, deadlines, milestones, and announcements
    # but they CANNOT manage holidays.
    return next_type in ["company_event", "meeting", "deadline", "milestone", "announcement"]


class CalendarEventListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        events = CalendarEvent.objects.filter(
            organization=request.user.organization
        ).filter(
            Q(visibility="organization") | Q(created_by=request.user)
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

        if event.event_type in ["company_event", "holiday", "announcement"]:
            members = User.objects.filter(
                organization=request.user.organization
            ).exclude(id=request.user.id).exclude(role="platform_admin")

            title_map = {
                "company_event": "Company Event Created",
                "holiday": "Public Holiday Declared",
                "announcement": "New Announcement",
            }
            type_map = {
                "company_event": "company_event_created",
                "holiday": "holiday_created",
                "announcement": "announcement_created",
            }

            for member in members:
                Notification.objects.create(
                    user=member,
                    title=title_map[event.event_type],
                    message=(
                        f"{request.user.name} created "
                        f"{event.get_event_type_display().lower()}: {event.title}"
                    ),
                    type=type_map[event.event_type]
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

    def get(self, request, event_id):
        event = self.get_object(request, event_id)
        if not event:
            return Response(
                {"message": "Calendar event not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if event.visibility == "private" and event.created_by_id != request.user.id:
            return Response(
                {"message": "You are not allowed to view this event"},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response(CalendarEventSerializer(event).data)

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
        ).filter(
            Q(visibility="organization") | Q(created_by=request.user)
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

        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        from datetime import datetime, date, timedelta

        start_date = None
        end_date = None
        if start_date_str:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        if end_date_str:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()

        if start_date:
            approved_leaves = approved_leaves.filter(end_date__gte=start_date)
        if end_date:
            approved_leaves = approved_leaves.filter(start_date__lte=end_date)

        # Non-recurring matches within range, recurring starts on or before end_date
        q_non_recurring = Q(is_recurring=False)
        if start_date:
            q_non_recurring &= Q(end_date__gte=start_date)
        if end_date:
            q_non_recurring &= Q(start_date__lte=end_date)

        q_recurring = Q(is_recurring=True)
        if end_date:
            q_recurring &= Q(start_date__lte=end_date)

        events = events.filter(q_non_recurring | q_recurring)

        calendar_items = []

        for event in events:
            if not event.is_recurring or event.recurrence_pattern == "none":
                calendar_items.append({
                    "id": str(event.id),
                    "rawId": str(event.id),
                    "source": "calendar_event",
                    "title": event.title,
                    "description": event.description,
                    "notes": event.notes,
                    "event_type": event.event_type,
                    "event_type_label": event.get_event_type_display(),
                    "start_date": event.start_date.isoformat(),
                    "end_date": event.end_date.isoformat(),
                    "visibility": event.visibility,
                    "is_recurring": event.is_recurring,
                    "recurrence_pattern": event.recurrence_pattern,
                    "created_by_data": {
                        "id": str(event.created_by.id),
                        "name": event.created_by.name,
                        "email": event.created_by.email,
                    },
                })
            else:
                duration = event.end_date - event.start_date
                current_start = event.start_date

                eval_start = start_date or date.today()
                eval_end = end_date or (date.today() + timedelta(days=365))
                limit_end = min(eval_end, event.start_date + timedelta(days=366))

                occurrences = []
                if event.recurrence_pattern == "daily":
                    while current_start <= limit_end:
                        if current_start + duration >= eval_start:
                            occurrences.append(current_start)
                        current_start += timedelta(days=1)
                elif event.recurrence_pattern == "weekly":
                    while current_start <= limit_end:
                        if current_start + duration >= eval_start:
                            occurrences.append(current_start)
                        current_start += timedelta(weeks=1)
                elif event.recurrence_pattern == "biweekly":
                    while current_start <= limit_end:
                        if current_start + duration >= eval_start:
                            occurrences.append(current_start)
                        current_start += timedelta(weeks=2)
                elif event.recurrence_pattern == "monthly":
                    while current_start <= limit_end:
                        if current_start + duration >= eval_start:
                            occurrences.append(current_start)
                        y = current_start.year
                        m = current_start.month + 1
                        if m > 12:
                            m = 1
                            y += 1
                        import calendar
                        last_day = calendar.monthrange(y, m)[1]
                        d = min(event.start_date.day, last_day)
                        current_start = date(y, m, d)
                elif event.recurrence_pattern == "first_friday":
                    for offset in range(24):
                        m = event.start_date.month + offset
                        y = event.start_date.year + (m - 1) // 12
                        m = (m - 1) % 12 + 1

                        first_day_of_month = date(y, m, 1)
                        w = first_day_of_month.weekday()
                        days_to_friday = (4 - w) % 7
                        first_friday = date(y, m, 1 + days_to_friday)

                        if first_friday >= event.start_date:
                            if first_friday <= limit_end:
                                if first_friday + duration >= eval_start:
                                    occurrences.append(first_friday)
                            else:
                                break

                for occ_start in occurrences:
                    occ_end = occ_start + duration
                    calendar_items.append({
                        "id": f"{event.id}_{occ_start.isoformat()}",
                        "rawId": str(event.id),
                        "source": "calendar_event",
                        "title": event.title,
                        "description": event.description,
                        "notes": event.notes,
                        "event_type": event.event_type,
                        "event_type_label": event.get_event_type_display(),
                        "start_date": occ_start.isoformat(),
                        "end_date": occ_end.isoformat(),
                        "visibility": event.visibility,
                        "is_recurring": event.is_recurring,
                        "recurrence_pattern": event.recurrence_pattern,
                        "created_by_data": {
                            "id": str(event.created_by.id),
                            "name": event.created_by.name,
                            "email": event.created_by.email,
                        },
                    })

        calendar_items.extend([
            {
                "id": str(leave.id),
                "rawId": str(leave.id),
                "source": "leave_request",
                "title": f"{leave.employee.name} on leave",
                "description": leave.reason,
                "notes": f"Status: {leave.get_status_display()}",
                "event_type": "leave",
                "event_type_label": leave.get_leave_type_display(),
                "start_date": leave.start_date.isoformat(),
                "end_date": leave.end_date.isoformat(),
                "visibility": "organization",
                "is_recurring": False,
                "recurrence_pattern": "none",
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


