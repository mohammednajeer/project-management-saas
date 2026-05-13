from django.urls import path

from .views import (

    ActivityListView,

    TaskActivityListView,
)

urlpatterns = [

    path(
        "",
        ActivityListView.as_view()
    ),

    path(
        "task/<uuid:task_id>/",
        TaskActivityListView.as_view()
    ),
]