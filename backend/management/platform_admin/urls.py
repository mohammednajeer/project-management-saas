from django.urls import path

from .views import (
    PlatformDashboardStatsView,
    PlatformOrganizationsView,
    PlatformOrganizationsToggleView,
    PlatformOrganizationsTierView,
    PlatformActiveSessionsView,
    PlatformCacheClearView,
    PlatformLogsView,
    PlatformBackupView,
    PlatformOrganizationDetailsView,
    PlatformUsersListView,
)

urlpatterns = [
    path("stats/", PlatformDashboardStatsView.as_view(), name="platform-stats"),
    path("organizations/", PlatformOrganizationsView.as_view(), name="platform-organizations"),
    path("organizations/<uuid:org_id>/", PlatformOrganizationDetailsView.as_view(), name="platform-org-details"),
    path("organizations/<uuid:org_id>/toggle/", PlatformOrganizationsToggleView.as_view(), name="platform-org-toggle"),
    path("organizations/<uuid:org_id>/tier/", PlatformOrganizationsTierView.as_view(), name="platform-org-tier"),
    path("sessions/", PlatformActiveSessionsView.as_view(), name="platform-sessions"),
    path("cache/clear/", PlatformCacheClearView.as_view(), name="platform-cache-clear"),
    path("logs/", PlatformLogsView.as_view(), name="platform-logs"),
    path("backup/", PlatformBackupView.as_view(), name="platform-backup"),
    path("users/", PlatformUsersListView.as_view(), name="platform-users"),
]
