from rest_framework import serializers

from .models import CalendarEvent


class CalendarEventSerializer(serializers.ModelSerializer):
    created_by_data = serializers.SerializerMethodField()
    event_type_label = serializers.CharField(
        source="get_event_type_display",
        read_only=True
    )

    class Meta:
        model = CalendarEvent
        fields = [
            "id",
            "organization",
            "title",
            "description",
            "notes",
            "event_type",
            "event_type_label",
            "start_date",
            "end_date",
            "visibility",
            "is_recurring",
            "recurrence_pattern",
            "created_by",
            "created_by_data",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "organization",
            "created_by",
            "created_at",
        ]

    def validate(self, attrs):
        start_date = attrs.get(
            "start_date",
            getattr(self.instance, "start_date", None)
        )
        end_date = attrs.get(
            "end_date",
            getattr(self.instance, "end_date", None)
        )

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({
                "end_date": "End date must be after start date."
            })

        return attrs

    def get_created_by_data(self, obj):
        return {
            "id": str(obj.created_by.id),
            "name": obj.created_by.name,
            "email": obj.created_by.email,
        }

