from django.contrib import admin

from .models import CalendarEvent


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "organization",
        "event_type",
        "start_date",
        "end_date",
        "created_by",
        "created_at",
    )
    list_filter = ("event_type", "organization")
    search_fields = ("title", "description", "created_by__name")

