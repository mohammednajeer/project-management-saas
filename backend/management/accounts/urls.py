from django.urls import path
from .views import (
    LoginView,
    MeView,
    LogoutView,
    InviteRegisterView,
    RefreshView,
    ProfileUpdateView,
    VerifyEmailView,
    SendVerificationOTPView,
    ForgotPasswordView,
    ResetPasswordView,
)


urlpatterns = [
    path("login/", LoginView.as_view() ,name="login"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("me/",  MeView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("invite-register/", InviteRegisterView.as_view()),
    path("profile/", ProfileUpdateView.as_view()),
    path("verify-email/", VerifyEmailView.as_view()),
    path("verify-email/resend/", SendVerificationOTPView.as_view()),
    path("forgot-password/", ForgotPasswordView.as_view()),
    path("reset-password/", ResetPasswordView.as_view()),
]
