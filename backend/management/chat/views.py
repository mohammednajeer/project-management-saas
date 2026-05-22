from django.db.models import Q

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import (
    Conversation,
    Message,
)

from .serializers import (
    ConversationSerializer,
    MessageSerializer,
)

from accounts.models import User


class ConversationListView(
    APIView
):

    permission_classes = [
        IsAuthenticated
    ]

    def get(self, request):

        conversations = (
            Conversation.objects.filter(
                participants=request.user,
                organization=request.user.organization
            )
            .prefetch_related(
                "participants"
            )
            .order_by("-updated_at")
        )

        serializer = (
            ConversationSerializer(
                conversations,
                many=True,
                context={
                    "request": request
                }
            )
        )

        return Response(
            serializer.data
        )


class ConversationMessagesView(
    APIView
):

    permission_classes = [
        IsAuthenticated
    ]

    def get(
        self,
        request,
        conversation_id
    ):

        try:

            conversation = (
                Conversation.objects.get(
                    id=conversation_id,
                    organization=request.user.organization,
                    participants=request.user
                )
            )

        except Conversation.DoesNotExist:

            return Response(
                {
                    "message":
                        "Conversation not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        messages = (
            conversation.messages
            .select_related("sender")
            .all()
        )

        serializer = (
            MessageSerializer(
                messages,
                many=True,
                context={
                    "request": request
                }
            )
        )

        return Response(
            serializer.data
        )


class StartConversationView(
    APIView
):

    permission_classes = [
        IsAuthenticated
    ]

    def post(self, request):

        user_id = request.data.get(
            "user_id"
        )

        if not user_id:

            return Response(
                {
                    "message":
                        "user_id is required"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            other_user = (
                User.objects.get(
                    id=user_id,
                    organization=request.user.organization
                )
            )

        except User.DoesNotExist:

            return Response(
                {
                    "message":
                        "User not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if other_user == request.user:

            return Response(
                {
                    "message":
                        "Cannot chat with yourself"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        existing_conversation = (
            Conversation.objects.filter(
                organization=request.user.organization,
                participants=request.user
            )
            .filter(
                participants=other_user
            )
            .distinct()
            .first()
        )

        if existing_conversation:

            serializer = (
                ConversationSerializer(
                    existing_conversation,
                    context={
                        "request": request
                    }
                )
            )

            return Response(
                serializer.data
            )

        conversation = (
            Conversation.objects.create(
                organization=request.user.organization
            )
        )

        conversation.participants.add(
            request.user,
            other_user
        )

        serializer = (
            ConversationSerializer(
                conversation,
                context={
                    "request": request
                }
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class SendMessageView(
    APIView
):

    permission_classes = [
        IsAuthenticated
    ]

    def post(
        self,
        request,
        conversation_id
    ):

        content = request.data.get(
            "content"
        )

        if not content:

            return Response(
                {
                    "message":
                        "Message content required"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            conversation = (
                Conversation.objects.get(
                    id=conversation_id,
                    organization=request.user.organization,
                    participants=request.user
                )
            )

        except Conversation.DoesNotExist:

            return Response(
                {
                    "message":
                        "Conversation not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        message = (
            Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=content
            )
        )

        conversation.save()

        serializer = (
            MessageSerializer(
                message,
                context={
                    "request": request
                }
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )
    

class ChatUsersView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def get(self, request):

        users = User.objects.filter(
            organization=request.user.organization).exclude(id=request.user.id)

        data = [

            {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "profile_picture": (
                    user.profile_picture.url
                    if user.profile_picture
                    else None
                ),
            }

            for user in users
        ]

        return Response(data)