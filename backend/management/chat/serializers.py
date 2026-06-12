from rest_framework import serializers

from .models import (
    Conversation,
    Message,
    GroupChannel,
    ChannelMessage,
)


class ConversationSerializer(
    serializers.ModelSerializer
):

    other_user = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    last_message = (
        serializers.SerializerMethodField()
    )

    class Meta:

        model = Conversation

        fields = [
            "id",
            "other_user",
            "last_message",
            "unread_count",
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
            "sender_id": str(last_message.sender.id),
            "sender_name":
                last_message.sender.name,
            "is_seen": last_message.is_seen,
            "created_at":
                last_message.created_at,
        }

    def get_unread_count(
        self,
        obj
    ):

        request = self.context.get("request")

        if not request:
            return 0

        return (
            obj.messages
            .filter(
                is_seen=False
            )
            .exclude(
                sender=request.user
            )
            .count()
        )


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


class GroupChannelSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)
    last_message = serializers.SerializerMethodField()
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = GroupChannel
        fields = [
            "id",
            "name",
            "description",
            "project",
            "project_name",
            "is_general",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
            "last_message",
        ]
        read_only_fields = [
            "id",
            "is_general",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def get_last_message(self, obj):
        last_message = obj.messages.last()
        if not last_message:
            return None
        return {
            "id": str(last_message.id),
            "content": last_message.content,
            "sender_id": str(last_message.sender.id),
            "sender_name": last_message.sender.name,
            "created_at": last_message.created_at,
        }


class ChannelMessageSerializer(serializers.ModelSerializer):
    sender_data = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = ChannelMessage
        fields = [
            "id",
            "channel",
            "sender",
            "sender_data",
            "content",
            "created_at",
            "is_mine",
        ]
        read_only_fields = [
            "id",
            "sender",
            "created_at",
        ]

    def get_sender_data(self, obj):
        return {
            "id": str(obj.sender.id),
            "name": obj.sender.name,
            "email": obj.sender.email,
            "role": obj.sender.role,
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
