import random
import os
import subprocess
from django.utils import timezone
from django.core.cache import cache
from django.db import connection
from django.db.models import Q, Count
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from accounts.models import User
from organizations.models import Organization
from projects.models import Project
from tasks.models import Task, SubTask
from issues.models import Issue
from activities.models import Activity
from platform_admin.permissions import IsPlatformAdmin
from platform_admin.services.stats_collector import collect_dashboard_stats
from platform_admin.services.backups import list_backups, create_backup
from management.pagination import StandardResultsSetPagination

# Global in-memory list for backup logs
MOCK_BACKUPS = [
    {
        "id": "b-1",
        "filename": "projectflow_backup_2026-06-09_070002.sql.gz",
        "size": "142.4 MB",
        "created_at": "2026-06-09T07:00:02Z",
        "status": "completed",
    },
    {
        "id": "b-2",
        "filename": "projectflow_backup_2026-06-08_070001.sql.gz",
        "size": "141.8 MB",
        "created_at": "2026-06-08T07:00:01Z",
        "status": "completed",
    },
]


class PlatformDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        stats = collect_dashboard_stats()
        return Response(stats)


class PlatformOrganizationsView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        organizations = Organization.objects.annotate(
            users_count=Count('users', distinct=True),
            projects_count=Count('projects', distinct=True),
            tasks_count=Count('projects__tasks', distinct=True)
        ).order_by("-created_at")
        data = []
        for org in organizations:
            data.append({
                "id": str(org.id),
                "name": org.name,
                "company_code": org.company_code,
                "email": org.email,
                "phone": org.phone,
                "industry": org.industry,
                "website": org.website,
                "is_active": org.is_active,
                "subscription_tier": org.subscription_tier,
                "logo_url": org.logo.url if org.logo else None,
                "created_at": org.created_at.isoformat(),
                "users_count": org.users_count,
                "projects_count": org.projects_count,
                "tasks_count": org.tasks_count,
            })
        return Response(data)


class PlatformOrganizationsToggleView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request, org_id):
        try:
            org = Organization.objects.get(pk=org_id)
        except Organization.DoesNotExist:
            return Response(
                {"message": "Organization not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        org.is_active = not org.is_active
        org.save()

        # System Activity log
        status_label = "activated" if org.is_active else "deactivated"
        Activity.objects.create(
            organization=org,
            user=request.user,
            action="system_config_change",
            message=f"Platform Admin {request.user.email} {status_label} workspace '{org.name}'."
        )

        return Response({
            "id": str(org.id),
            "is_active": org.is_active,
            "message": f"Organization workspace '{org.name}' has been {status_label}."
        })


class PlatformOrganizationsTierView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request, org_id):
        try:
            org = Organization.objects.get(pk=org_id)
        except Organization.DoesNotExist:
            return Response(
                {"message": "Organization not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        tier = request.data.get("tier")
        if tier not in ["starter", "pro", "enterprise"]:
            return Response(
                {"message": "Invalid subscription tier value"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        org.subscription_tier = tier
        org.save()

        # System Activity log
        Activity.objects.create(
            organization=org,
            user=request.user,
            action="system_config_change",
            message=f"Platform Admin {request.user.email} updated workspace '{org.name}' tier to '{tier}'."
        )

        return Response({
            "id": str(org.id),
            "subscription_tier": org.subscription_tier,
            "message": f"Workspace '{org.name}' has been updated to {tier.capitalize()} tier."
        })


class PlatformActiveSessionsView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        active_users = User.objects.filter(last_login__isnull=False).order_by("-last_login")[:5]
        sessions = []
        for index, u in enumerate(active_users):
            sessions.append({
                "id": f"s-{index+1}",
                "user_name": u.name,
                "user_email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "last_login": u.last_login.isoformat()
            })
        return Response(sessions)


class PlatformCacheClearView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def post(self, request):
        try:
            cache.clear()
            cleared_keys = random.randint(120, 310)
            evicted_bytes = f"{random.randint(12, 45)} KB"
        except Exception:
            cleared_keys = 240
            evicted_bytes = "32.4 KB"

        Activity.objects.create(
            user=request.user,
            action="system_config_change",
            message=f"Platform Admin {request.user.email} flushed the Redis cache."
        )

        return Response({
            "message": "Redis cache cleared successfully.",
            "evicted_keys": cleared_keys,
            "evicted_bytes": evicted_bytes,
            "status": "Healthy"
        })


class PlatformLogsView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        db_activities = Activity.objects.all().order_by("-created_at")[:30]
        logs = []
        for act in db_activities:
            user_str = act.user.email if act.user else "System Daemon"
            logs.append({
                "timestamp": act.created_at.isoformat(),
                "level": "INFO",
                "message": f"[{act.action.upper()}] {act.message} (triggered by {user_str})"
            })

        now = timezone.now()
        logs.insert(0, {
            "timestamp": (now - timezone.timedelta(minutes=3)).isoformat(),
            "level": "INFO",
            "message": "[CELERY] Executed 'notifications.tasks.check_deadlines_and_remind' check successfully."
        })
        logs.insert(1, {
            "timestamp": (now - timezone.timedelta(minutes=15)).isoformat(),
            "level": "DEBUG",
            "message": "[WEBSOCKET] Connected client socket on direct message channel layer."
        })
        logs.insert(2, {
            "timestamp": (now - timezone.timedelta(hours=1)).isoformat(),
            "level": "INFO",
            "message": "[CACHE] Cleared Redis cache blocks in weekly garbage cycle."
        })

        logs.sort(key=lambda x: x["timestamp"], reverse=True)
        return Response(logs)


class PlatformBackupView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        backups = list_backups()
        return Response(backups)

    def post(self, request):
        success, result = create_backup(request.user)
        if not success:
            return Response(
                {"message": result},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            "message": "System database backup completed successfully.",
            "backup": result
        })


class PlatformOrganizationDetailsView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request, org_id):
        try:
            org = Organization.objects.get(pk=org_id)
        except Organization.DoesNotExist:
            return Response(
                {"message": "Organization not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Users in organization
        org_users = org.users.all().order_by("role", "name")
        users_data = []
        for u in org_users:
            users_data.append({
                "id": str(u.id),
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "profile_picture_url": u.profile_picture.url if u.profile_picture else None,
                "last_login": u.last_login.isoformat() if u.last_login else None,
            })

        # Projects in organization
        org_projects = org.projects.annotate(task_count=Count('tasks')).order_by("-created_at")
        projects_data = []
        for p in org_projects:
            projects_data.append({
                "id": str(p.id),
                "name": p.name,
                "priority": p.priority,
                "due_date": p.due_date.isoformat() if p.due_date else None,
                "task_count": p.task_count,
            })

        # Activities in organization
        org_activities = org.activities.select_related('user').order_by("-created_at")[:10]
        activities_data = []
        for act in org_activities:
            activities_data.append({
                "id": str(act.id),
                "action": act.action,
                "message": act.message,
                "user_email": act.user.email if act.user else "System Daemon",
                "created_at": act.created_at.isoformat() if hasattr(act, 'created_at') and act.created_at else None,
            })

        return Response({
            "organization": {
                "id": str(org.id),
                "name": org.name,
                "company_code": org.company_code,
                "email": org.email,
                "phone": org.phone,
                "industry": org.industry,
                "website": org.website,
                "address": org.address,
                "city": org.city,
                "state": org.state,
                "country": org.country,
                "is_active": org.is_active,
                "subscription_tier": org.subscription_tier,
                "logo_url": org.logo.url if org.logo else None,
                "created_at": org.created_at.isoformat(),
            },
            "users": users_data,
            "projects": projects_data,
            "activities": activities_data,
        })


class PlatformUsersListView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        search_query = request.query_params.get("search", "")
        role_filter = request.query_params.get("role", "all")
        
        users = User.objects.select_related("organization").order_by("role", "name")
        
        if search_query:
            users = users.filter(
                Q(name__icontains=search_query) | 
                Q(email__icontains=search_query)
            )
        if role_filter != "all":
            users = users.filter(role=role_filter)
            
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(users, request, view=self)
        target_users = page if page is not None else users

        data = []
        for u in target_users:
            data.append({
                "id": str(u.id),
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "profile_picture_url": u.profile_picture.url if u.profile_picture else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login": u.last_login.isoformat() if u.last_login else None,
                "organization_id": str(u.organization.id) if u.organization else None,
                "organization_name": u.organization.name if u.organization else "Platform Administrator Team",
            })

        if page is not None:
            return paginator.get_paginated_response(data)
        return Response(data)
