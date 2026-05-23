from rest_framework import serializers

from .models import (
    Conversation,
    Message,
)


class ConversationSerializer(
    serializers.ModelSerializer
):

    other_user = serializers.SerializerMethodField()

    last_message = (
        serializers.SerializerMethodField()
    )

    class Meta:

        model = Conversation

        fields = [
            "id",
            "other_user",
            "last_message",
            "updated_at",
        ]

    def get_other_user(self, obj):

        request = self.context.get("request")

        if obj.sender == request.user:
            other_user = obj.receiver
        else:
            other_user = obj.sender

        return {
            "id": str(other_user.id),
            "name": other_user.name,
            "email": other_user.email,
            "role": other_user.role,
            "profile_picture": (
                other_user.profile_picture.url
                if other_user.profile_picture
                else None
            ),
        }

    def get_last_message(
        self,
        obj
    ):

        last_message = (
            obj.messages.last()
        )

        if not last_message:
            return None

        return {
            "id": str(last_message.id),
            "content": last_message.content,
            "sender_name":
                last_message.sender.name,
            "created_at":
                last_message.created_at,
        }


class MessageSerializer( serializers.ModelSerializer):

    sender_data = (serializers.SerializerMethodField())
    is_mine = serializers.SerializerMethodField()

    class Meta:

        model = Message

        fields = [
            "id",
            "conversation",
            "sender",
            "sender_data",
            "content",
            "is_seen",
            "created_at",
            "is_mine",
        ]

        read_only_fields = [
            "id",
            "sender",
            "created_at",
        ]

    def get_sender_data(
        self,
        obj
    ):
        
    

        return {

            "id": str(obj.sender.id),

            "name":
                obj.sender.name,

            "email":
                obj.sender.email,

            "role":
                obj.sender.role,

            "profile_picture": (
                obj.sender.profile_picture.url
                if obj.sender.profile_picture
                else None
            ),
        }
    
    def get_is_mine(self, obj):

        request = self.context.get("request")

        if not request:
            return False

        return obj.sender == request.user