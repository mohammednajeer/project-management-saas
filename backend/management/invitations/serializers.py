from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from .models import Invitation


class CreateInvitationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Invitation
        fields = ["email", "role"]

    def validate_role(self, value):
        request = self.context["request"]

        if value not in ["admin", "manager", "employee"]:
            raise serializers.ValidationError("Invalid role")

        if request.user.role == "manager" and value != "employee":
            raise PermissionDenied(
                "Managers can invite employees only."
            )

        return value

    def create(self, validated_data):
        request = self.context["request"]

        invitation = Invitation.objects.create(
            email=validated_data["email"],
            role=validated_data.get("role", "employee"),
            organization=request.user.organization
        )

        return invitation
