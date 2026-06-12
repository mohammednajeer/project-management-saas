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
                Q(sender=request.user) |
                Q(receiver=request.user),
                organization=request.user.organization
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
                    organization=request.user.organization
                )
            )

            if (
                conversation.sender != request.user
                and conversation.receiver != request.user
            ):
                raise Conversation.DoesNotExist

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

        conversation.messages.filter(
            is_seen=False
        ).exclude(
            sender=request.user
        ).update(
            is_seen=True
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
                organization=request.user.organization
            )
            .filter(
                Q(sender=request.user, receiver=other_user) |
                Q(sender=other_user, receiver=request.user)
            )
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

        conversation = Conversation.objects.create(
                        organization=request.user.organization,
                        sender=request.user,
                        receiver=other_user
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
                    organization=request.user.organization
                )
            )

            if (
                conversation.sender != request.user
                and conversation.receiver != request.user
            ):
                raise Conversation.DoesNotExist

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
            organization=request.user.organization
        ).exclude(
            id=request.user.id
        ).exclude(
            role="platform_admin"
        )

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


class GroupChannelListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import GroupChannel
        from .serializers import GroupChannelSerializer

        # Ensure general channel exists
        GroupChannel.objects.get_or_create(
            organization=request.user.organization,
            is_general=True,
            defaults={
                "name": "general",
                "description": "Company-wide general announcement and chat channel.",
            }
        )

        channels = GroupChannel.objects.filter(
            organization=request.user.organization
        ).distinct()

        user = request.user
        if user.role not in ["admin", "manager"]:
            from django.db.models import Q
            channels = channels.filter(
                Q(is_general=True) |
                Q(project__members=user) |
                Q(members=user)
            ).distinct()

        serializer = GroupChannelSerializer(
            channels,
            many=True,
            context={"request": request}
        )
        return Response(serializer.data)

    def post(self, request):
        from .models import GroupChannel
        from .serializers import GroupChannelSerializer

        if request.user.role not in ["admin", "manager"]:
            return Response(
                {"message": "Only admins and managers can create custom channels."},
                status=status.HTTP_403_FORBIDDEN
            )

        name = request.data.get("name")
        description = request.data.get("description", "")
        project_id = request.data.get("project_id")

        if not name:
            return Response(
                {"message": "Channel name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        import re
        name = name.strip().lower()
        name = re.sub(r'[^a-z0-9\s-]', '', name)
        name = re.sub(r'[\s_]+', '-', name)
        if name.startswith("-"):
            name = name[1:]
        if name.endswith("-"):
            name = name[:-1]
        name = name[:50]

        if not name:
            return Response(
                {"message": "Invalid channel name"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if GroupChannel.objects.filter(organization=request.user.organization, name=name).exists():
            return Response(
                {"message": f"Channel #{name} already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        project = None
        if project_id:
            from projects.models import Project
            try:
                project = Project.objects.get(
                    id=project_id,
                    organization=request.user.organization
                )
            except (Project.DoesNotExist, ValueError):
                return Response(
                    {"message": "Linked project not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

        channel = GroupChannel.objects.create(
            organization=request.user.organization,
            project=project,
            name=name,
            description=description,
            created_by=request.user
        )
        channel.members.add(request.user)

        serializer = GroupChannelSerializer(channel, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChannelMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, channel_id):
        from .models import GroupChannel
        from .serializers import ChannelMessageSerializer

        try:
            channel = GroupChannel.objects.get(
                id=channel_id,
                organization=request.user.organization
            )
        except GroupChannel.DoesNotExist:
            return Response(
                {"message": "Channel not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check access permission
        user = request.user
        has_access = False
        if user.role in ["admin", "manager"] or channel.is_general:
            has_access = True
        elif channel.project_id:
            has_access = channel.project.members.filter(id=user.id).exists()
        else:
            has_access = channel.members.filter(id=user.id).exists()

        if not has_access:
            return Response(
                {"message": "Access denied to this channel"},
                status=status.HTTP_403_FORBIDDEN
            )

        messages = channel.messages.select_related("sender").order_by("created_at")
        serializer = ChannelMessageSerializer(
            messages,
            many=True,
            context={"request": request}
        )
        return Response(serializer.data)


class MentionsSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response([])

        from tasks.models import Task, SubTask

        # Search tasks in same organization
        tasks = Task.objects.filter(
            project__organization=request.user.organization,
            title__icontains=query
        ).select_related("project")[:10]

        # Search subtasks in same organization
        subtasks = SubTask.objects.filter(
            task__project__organization=request.user.organization,
            title__icontains=query
        ).select_related("task", "task__project")[:10]

        results = []
        for t in tasks:
            results.append({
                "type": "task",
                "id": str(t.id),
                "title": t.title,
                "project_id": str(t.project_id),
                "display": f"Task: {t.title}"
            })

        for st in subtasks:
            results.append({
                "type": "subtask",
                "id": str(st.id),
                "title": st.title,
                "parent_task_title": st.task.title,
                "project_id": str(st.task.project_id),
                "display": f"Subtask: {st.title} (Task: {st.task.title})"
            })

        return Response(results)


class ChannelMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, channel_id):
        from .models import GroupChannel
        try:
            channel = GroupChannel.objects.get(
                id=channel_id,
                organization=request.user.organization
            )
        except GroupChannel.DoesNotExist:
            return Response(
                {"message": "Channel not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Access check
        user = request.user
        has_access = False
        if user.role in ["admin", "manager"] or channel.is_general:
            has_access = True
        elif channel.project_id:
            has_access = channel.project.members.filter(id=user.id).exists()
        else:
            has_access = channel.members.filter(id=user.id).exists()

        if not has_access:
            return Response(
                {"message": "Access denied to this channel"},
                status=status.HTTP_403_FORBIDDEN
            )

        if channel.is_general:
            members = User.objects.filter(organization=request.user.organization)
        elif channel.project_id:
            members = channel.project.members.all()
        else:
            members = channel.members.all()

        data = [
            {
                "id": str(u.id),
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "profile_picture": u.profile_picture.url if u.profile_picture else None,
            }
            for u in members
        ]
        return Response(data)


class ChannelInviteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, channel_id):
        from .models import GroupChannel
        try:
            channel = GroupChannel.objects.get(
                id=channel_id,
                organization=request.user.organization
            )
        except GroupChannel.DoesNotExist:
            return Response(
                {"message": "Channel not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Only admins, managers, or the channel creator can invite
        if request.user.role not in ["admin", "manager"] and channel.created_by != request.user:
            return Response(
                {"message": "You do not have permission to invite members to this channel."},
                status=status.HTTP_403_FORBIDDEN
            )

        if channel.is_general:
            return Response(
                {"message": "Cannot invite to general channel (all users are automatically members)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if channel.project_id:
            return Response(
                {"message": "Cannot invite users directly to a project-linked channel. Manage membership via the project instead."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_ids = request.data.get("user_ids", [])
        if not isinstance(user_ids, list):
            user_ids = [user_ids]

        if not user_ids:
            return Response(
                {"message": "user_ids must be provided as a list"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Filter valid users in the same organization
        users_to_add = User.objects.filter(
            id__in=user_ids,
            organization=request.user.organization
        )

        channel.members.add(*users_to_add)

        return Response(
            {"message": f"Successfully invited {users_to_add.count()} members to the channel."},
            status=status.HTTP_200_OK
        )
