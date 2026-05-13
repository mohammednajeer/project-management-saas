from rest_framework import serializers

from .models import Activity


class ActivitySerializer(serializers.ModelSerializer):

    user_data = serializers.SerializerMethodField()

    class Meta:

        model = Activity

        fields = [
            "id",
            "action",
            "message",
            "created_at",
            "user_data",
        ]

    def get_user_data(self, obj):

        return {
            "id": str(obj.user.id),
            "name": obj.user.name,
            "email": obj.user.email,
        }