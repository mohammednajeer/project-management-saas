from django.urls import path

from .views import (
    ConversationListView,
    ConversationMessagesView,
    StartConversationView,
    SendMessageView,
    ChatUsersView,
    GroupChannelListCreateView,
    ChannelMessagesView,
    MentionsSearchView,
    ChannelMembersView,
    ChannelInviteView,
)

urlpatterns = [

    path( "",ConversationListView.as_view()),

    path(
        "start/",StartConversationView.as_view() ),

    path(
        "<uuid:conversation_id>/messages/",
        ConversationMessagesView.as_view()
    ),

    path(
        "<uuid:conversation_id>/send/",
        SendMessageView.as_view()
    ),
    path(
        "users/",
        ChatUsersView.as_view()
    ),
    path(
        "channels/",
        GroupChannelListCreateView.as_view()
    ),
    path(
        "channels/<uuid:channel_id>/messages/",
        ChannelMessagesView.as_view()
    ),
    path(
        "channels/<uuid:channel_id>/members/",
        ChannelMembersView.as_view()
    ),
    path(
        "channels/<uuid:channel_id>/invite/",
        ChannelInviteView.as_view()
    ),
    path(
        "mentions-search/",
        MentionsSearchView.as_view()
    ),
]