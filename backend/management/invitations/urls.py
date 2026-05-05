from django.urls import path
from .views import BulkInviteView, CreateInvitationView, ValidateInvitationView

urlpatterns = [
    path("create/", CreateInvitationView.as_view()),
    path("validate/", ValidateInvitationView.as_view()), 
    path("bulk/", BulkInviteView.as_view()),
]