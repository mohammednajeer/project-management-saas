from rest_framework import serializers
from .models import Invitation


class CreateInvitationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Invitation
        fields = ["email", "role"]

    def create(self, validated_data):
        request = self.context["request"]

        invitation = Invitation.objects.create(
            email=validated_data["email"],
            role=validated_data.get("role", "employee"),
            organization=request.user.organization
        )

        return invitation