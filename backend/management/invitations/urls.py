from django.urls import path
from .views import CreateInvitationView, ValidateInvitationView

urlpatterns = [
    path("create/", CreateInvitationView.as_view()),
    path("validate/", ValidateInvitationView.as_view()), 
]