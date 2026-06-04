from django.urls import path

from .views import DashboardOverviewView
from .workload_views import TeamWorkloadView, WorkloadChartsView

urlpatterns = [
    path("overview/", DashboardOverviewView.as_view()),
    path("workload/", TeamWorkloadView.as_view()),
    path("workload/charts/", WorkloadChartsView.as_view()),
]