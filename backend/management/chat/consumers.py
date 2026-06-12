import json
from json import JSONDecodeError

from channels.generic.websocket import (
    AsyncWebsocketConsumer
)

from channels.db import (
    database_sync_to_async
)

from .models import (
    Conversation,
    Message,
)
from django.db.models import Q
from django.utils import timezone

class ChatConsumer(
    AsyncWebsocketConsumer
):

    async def connect(self):

        self.user = self.scope["user"]

        if not self.user.is_authenticated:

            await self.close()
            return

        self.conversation_id = (
            self.scope["url_route"]["kwargs"].get("conversation_id")
        )
        self.channel_id = (
            self.scope["url_route"]["kwargs"].get("channel_id")
        )

        if self.conversation_id:
            is_participant = await self.user_in_conversation()
            if not is_participant:
                await self.close()
                return
            self.room_group_name = f"chat_{self.conversation_id}"
        elif self.channel_id:
            is_member = await self.user_in_channel_org()
            if not is_member:
                await self.close()
                return
            self.room_group_name = f"group_channel_{self.channel_id}"
        else:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "presence_event",
                "user_id": str(self.user.id),
                "status": "online",
                "last_seen": timezone.now().isoformat(),
            },
        )

    async def disconnect(
        self,
        close_code
    ):

        if hasattr(self, "room_group_name"):

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "presence_event",
                    "user_id": str(self.user.id),
                    "status": "offline",
                    "last_seen": timezone.now().isoformat(),
                },
            )

            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(
        self,
        text_data
    ):

        try:
            data = json.loads(text_data)
        except (TypeError, JSONDecodeError):
            await self.send_error("Invalid websocket payload")
            return

        event_type = data.get("type", "message")

        if event_type == "typing":

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "typing_event",
                    "conversation_id": str(self.conversation_id) if self.conversation_id else None,
                    "channel_id": str(self.channel_id) if self.channel_id else None,
                    "sender_id": str(self.user.id),
                    "is_typing": bool(data.get("is_typing")),
                },
            )
            return

        if event_type == "seen":

            if self.conversation_id:
                await self.mark_messages_seen()
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "seen_event",
                        "conversation_id": str(self.conversation_id),
                        "seen_by": str(self.user.id),
                    },
                )
            return

        content = data.get("content")

        if not content or not content.strip():
            return

        content = content.strip()

        if len(content) > 4000:
            await self.send_error("Message is too long")
            return

        message = await self.create_message(
            content
        )

        if self.conversation_id:
            message_data = {
                "type": "message",
                "id": str(message.id),
                "client_id": data.get("client_id"),
                "conversation": str(self.conversation_id),
                "content": message.content,
                "is_seen": message.is_seen,
                "created_at": message.created_at.isoformat(),
                "sender_data": {
                    "id": str(self.user.id),
                    "name": self.user.name,
                    "email": self.user.email,
                    "role": self.user.role,
                    "profile_picture": (
                        self.user.profile_picture.url
                        if self.user.profile_picture
                        else None
                    ),
                },
            }
        else:
            message_data = {
                "type": "message",
                "id": str(message.id),
                "client_id": data.get("client_id"),
                "channel": str(self.channel_id),
                "content": message.content,
                "created_at": message.created_at.isoformat(),
                "sender_data": {
                    "id": str(self.user.id),
                    "name": self.user.name,
                    "email": self.user.email,
                    "role": self.user.role,
                    "profile_picture": (
                        self.user.profile_picture.url
                        if self.user.profile_picture
                        else None
                    ),
                },
            }

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message_data,
            },
        )

    async def chat_message(
        self,
        event
    ):

        await self.send(
            text_data=json.dumps(
                event["message"]
            )
        )

    async def typing_event(
        self,
        event
    ):

        await self.send(
            text_data=json.dumps(
                {
                    "type": "typing",
                    "conversation_id": event.get("conversation_id"),
                    "channel_id": event.get("channel_id"),
                    "sender_id": event["sender_id"],
                    "is_typing": event["is_typing"],
                }
            )
        )

    async def seen_event(
        self,
        event
    ):

        await self.send(
            text_data=json.dumps(
                {
                    "type": "seen",
                    "conversation_id": event.get("conversation_id"),
                    "channel_id": event.get("channel_id"),
                    "seen_by": event["seen_by"],
                }
            )
        )

    async def presence_event(
        self,
        event
    ):

        await self.send(
            text_data=json.dumps(
                {
                    "type": "presence",
                    "user_id": event["user_id"],
                    "status": event["status"],
                    "last_seen": event["last_seen"],
                }
            )
        )

    async def send_error(
        self,
        message
    ):

        await self.send(
            text_data=json.dumps(
                {
                    "type": "error",
                    "message": message,
                }
            )
        )

    @database_sync_to_async
    def user_in_conversation(self):

        return (
            Conversation.objects.filter(
                id=self.conversation_id
            ).filter(
                Q(sender=self.user) |
                Q(receiver=self.user)
            ).exists()
        )

    @database_sync_to_async
    def create_message(
        self,
        content
    ):
        if self.conversation_id:
            conversation = (
                Conversation.objects.get(
                    id=self.conversation_id
                )
            )
            message = (
                Message.objects.create(
                    conversation=conversation,
                    sender=self.user,
                    content=content
                )
            )
            conversation.save()
            return message
        else:
            from .models import GroupChannel, ChannelMessage
            channel = (
                GroupChannel.objects.get(
                    id=self.channel_id
                )
            )
            message = (
                ChannelMessage.objects.create(
                    channel=channel,
                    sender=self.user,
                    content=content
                )
            )
            return message

    @database_sync_to_async
    def mark_messages_seen(self):
        if self.conversation_id:
            return (
                Message.objects.filter(
                    conversation_id=self.conversation_id,
                    is_seen=False
                )
                .exclude(
                    sender=self.user
                )
                .update(
                    is_seen=True
                )
            )
        return 0

    @database_sync_to_async
    def user_in_channel_org(self):
        from .models import GroupChannel
        try:
            channel = GroupChannel.objects.get(id=self.channel_id)
            if channel.organization_id != self.user.organization_id:
                return False
            if self.user.role in ["admin", "manager"] or channel.is_general:
                return True
            if channel.project_id:
                return channel.project.members.filter(id=self.user.id).exists()
            return channel.members.filter(id=self.user.id).exists()
        except GroupChannel.DoesNotExist:
            return False
