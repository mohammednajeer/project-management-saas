from django.urls import path
from .views import (
    ProjectDetailView,
    ProjectListCreateView,
    ProjectMembersView,
)

urlpatterns = [
    path("",ProjectListCreateView.as_view()),
    path("<uuid:project_id>/",ProjectDetailView.as_view()),
    path("<uuid:project_id>/members/",ProjectMembersView.as_view()),
]
