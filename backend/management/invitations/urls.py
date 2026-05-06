from django.urls import path
from .views import BulkInviteView, CancelInvitationView, ChangeRoleView, CreateInvitationView, RemoveMemberView, ResendInvitationView, TeamListView, ValidateInvitationView

urlpatterns = [
    path("create/", CreateInvitationView.as_view()),
    path("validate/", ValidateInvitationView.as_view()), 
    path("bulk/", BulkInviteView.as_view()),
    path("team/", TeamListView.as_view()),
    path("resend/<uuid:invitation_id>/",ResendInvitationView.as_view()),
    path("cancel/<uuid:invitation_id>/",CancelInvitationView.as_view()),
    path("remove-member/<uuid:user_id>/",RemoveMemberView.as_view()),
    path("change-role/<uuid:user_id>/",ChangeRoleView.as_view()),
]