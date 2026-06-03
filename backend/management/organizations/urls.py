from django.urls import path
from .views import (
    OrganizationProfileView,
    RegisterOrganizationView,
    OrganizationTeamView,
)

urlpatterns = [

    path("register/",RegisterOrganizationView.as_view(),name="register-organization"),
    path(
        "team/",
        OrganizationTeamView.as_view()
    ),
    path(
        "profile/",
        OrganizationProfileView.as_view()
    ),
    
]
