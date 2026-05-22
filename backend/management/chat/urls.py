from django.urls import path

from .views import (
    ConversationListView,
    ConversationMessagesView,
    StartConversationView,
    SendMessageView,
    ChatUsersView,
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
]