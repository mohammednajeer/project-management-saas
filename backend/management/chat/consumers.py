import json

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

class ChatConsumer(
    AsyncWebsocketConsumer
):

    async def connect(self):

        self.user = self.scope["user"]
        print("WS USER:", self.scope["user"])

        if not self.user.is_authenticated:

            await self.close()
            return

        self.conversation_id = (
            self.scope["url_route"]["kwargs"][
                "conversation_id"
            ]
        )

        is_participant = (
            await self.user_in_conversation()
        )

        if not is_participant:

            await self.close()
            return

        self.room_group_name = (
            f"chat_{self.conversation_id}"
        )
        print("WS GROUP:", self.room_group_name)

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(
        self,
        close_code
    ):

        if hasattr(self, "room_group_name"):

            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(
        self,
        text_data
    ):

        data = json.loads(text_data)

        content = data.get("content")

        if not content:
            return

        message = await self.create_message(
            content
        )

        await self.channel_layer.group_send(

            self.room_group_name,

            {
                "type": "chat_message",

                "message": {

                    "id":
                        str(message.id),

                    "content":
                        message.content,

                    "created_at":
                        message.created_at.isoformat(),

                    "is_mine": False,

                    "sender_data": {

                        "id":
                            str(self.user.id),
                        

                        "name":
                            self.user.name,

                        "email":
                            self.user.email,

                        "role":
                            self.user.role,

                        "profile_picture": (
                            self.user.profile_picture.url
                            if self.user.profile_picture
                            else None
                        ),
                    },
                },
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