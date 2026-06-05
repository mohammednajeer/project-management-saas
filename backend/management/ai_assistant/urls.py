from django.urls import path

from .views import (
    ProjectSummaryView,
    RiskDetectionView,
    TaskBreakdownView,
    WeeklySummaryView,
    WorkloadInsightsView,
)


urlpatterns = [
    path(
        "project-summary/<uuid:project_id>/",
        ProjectSummaryView.as_view(),
        name="ai-project-summary",
    ),
    path(
        "risk-detection/",
        RiskDetectionView.as_view(),
        name="ai-risk-detection",
    ),
    path(
        "task-breakdown/",
        TaskBreakdownView.as_view(),
        name="ai-task-breakdown",
    ),
    path(
        "weekly-summary/",
        WeeklySummaryView.as_view(),
        name="ai-weekly-summary",
    ),
    path(
        "workload-insights/",
        WorkloadInsightsView.as_view(),
        name="ai-workload-insights",
    ),
]
