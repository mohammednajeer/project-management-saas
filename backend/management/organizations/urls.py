from django.urls import path
from .views import RegisterOrganizationView,OrganizationTeamView

urlpatterns = [

    path("register/",RegisterOrganizationView.as_view(),name="register-organization"),
    path(
        "team/",
        OrganizationTeamView.as_view()
    ),
    
]