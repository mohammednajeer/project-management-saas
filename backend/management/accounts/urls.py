from django.urls import path
from .views import LoginView,MeView,LogoutView,InviteRegisterView

urlpatterns = [
    path("login/", LoginView.as_view() ,name="login"),
    path("me/",  MeView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("invite-register/", InviteRegisterView.as_view()),
]