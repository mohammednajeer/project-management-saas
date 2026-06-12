import uuid

from django.db import models


class Conversation(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="conversations"
    )

    sender = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="sent_conversations"
    )

    receiver = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="received_conversations"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:

        ordering = ["-updated_at"]

    def __str__(self):

        return (
            f"Conversation {self.id}"
        )


class Message(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages"
    )

    sender = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="sent_messages"
    )

    content = models.TextField()

    is_seen = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:

        ordering = ["created_at"]

    def __str__(self):

        return (
            f"{self.sender.name}: "
            f"{self.content[:30]}"
        )


class GroupChannel(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="group_channels"
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="group_channels",
        null=True,
        blank=True
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    members = models.ManyToManyField(
        "accounts.User",
        related_name="joined_group_channels",
        blank=True
    )
    is_general = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_group_channels"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("organization", "name")

    def __str__(self):
        return f"#{self.name} ({self.organization.name})"


class ChannelMessage(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    channel = models.ForeignKey(
        GroupChannel,
        on_delete=models.CASCADE,
        related_name="messages"
    )
    sender = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="sent_channel_messages"
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender.name}: {self.content[:30]} (#{self.channel.name})"