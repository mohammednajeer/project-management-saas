from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from accounts.models import User
from accounts.permissions import IsManagerOrAdmin

from .health import refresh_project_health
from .models import Project, ProjectMilestone
from .permissions import (
    IsAuthenticatedOrgMember,
    user_can_access_project,
    user_can_manage_projects,
)
from analytics.workload import get_project_team_workload, get_thresholds

from .serializers import ProjectMilestoneSerializer, ProjectSerializer
from management.pagination import StandardResultsSetPagination


def get_org_projects_queryset(user):
    queryset = Project.objects.filter(
        organization=user.organization
    ).select_related(
        "project_lead",
        "created_by",
    ).prefetch_related(
        "members",
        "milestones",
    )
    if not user_can_manage_projects(user):
        from django.db.models import Q
        queryset = queryset.filter(Q(members=user) | Q(project_lead=user)).distinct()
    return queryset


def get_project_or_404(user, project_id):
    try:
        project = get_org_projects_queryset(user).get(id=project_id)
    except Project.DoesNotExist:
        return None
    if not user_can_access_project(user, project):
        return None
    return project


class ProjectListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedOrgMember]

    def get(self, request):
        projects = get_org_projects_queryset(request.user)
        for project in projects:
            refresh_project_health(project)

        # Filter by status
        status_filter = request.query_params.get("status")
        if status_filter and status_filter != "All":
            status_map = {
                "In Progress": "active",
                "Review": "on_hold",
                "Backlog": "planning",
                "Done": "completed"
            }
            db_status = status_map.get(status_filter)
            if db_status:
                projects = projects.filter(status=db_status)

        # Filter by search
        search_query = request.query_params.get("search")
        if search_query:
            projects = projects.filter(name__icontains=search_query)

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(projects, request, view=self)
        target_projects = page if page is not None else projects

        serializer = ProjectSerializer(
            target_projects,
            many=True,
            context={"request": request},
        )
        
        if page is not None:
            return paginator.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def post(self, request):
        if not user_can_manage_projects(request.user):
            return Response(
                {"message": "Only admins and managers can create projects."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ProjectSerializer(
            data=request.data,
            context={"request": request},
        )

        if serializer.is_valid():
            project = serializer.save(
                organization=request.user.organization,
                created_by=request.user,
            )
            project.members.add(request.user)
            if not project.project_lead:
                project.project_lead = request.user
                project.save(update_fields=["project_lead"])
            refresh_project_health(project)
            return Response(
                ProjectSerializer(project, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedOrgMember]

    def get(self, request, project_id):
        project = get_project_or_404(request.user, project_id)
        if not project:
            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        refresh_project_health(project)
        serializer = ProjectSerializer(
            project,
            context={
                "request": request,
                "include_milestones": True,
            },
        )
        return Response(serializer.data)

    def patch(self, request, project_id):
        project = get_project_or_404(request.user, project_id)
        if not project:
            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        from .permissions import user_can_manage_project_instance
        if not user_can_manage_project_instance(request.user, project):
            return Response(
                {"message": "Only admins, managers, and the project lead can update projects."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ProjectSerializer(
            project,
            data=request.data,
            partial=True,
            context={"request": request},
        )

        if serializer.is_valid():
            serializer.save()
            refresh_project_health(project)
            return Response(
                ProjectSerializer(
                    project,
                    context={
                        "request": request,
                        "include_milestones": True,
                    },
                ).data
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, project_id):
        if not user_can_manage_projects(request.user):
            return Response(
                {"message": "Only admins and managers can delete projects."},
                status=status.HTTP_403_FORBIDDEN,
            )

        project = get_project_or_404(request.user, project_id)
        if not project:
            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        project.delete()
        return Response({"message": "Project deleted"})


class ProjectMembersView(APIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedOrgMember]

    def post(self, request, project_id):
        try:
            project = Project.objects.get(
                id=project_id,
                organization=request.user.organization,
            )
        except Project.DoesNotExist:
            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        from .permissions import user_can_manage_project_instance
        if not user_can_manage_project_instance(request.user, project):
            return Response(
                {"message": "Only admins, managers, and the project lead can manage project members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_ids = request.data.get("members", [])
        users = User.objects.filter(
            id__in=user_ids,
            organization=request.user.organization,
        )
        project.members.add(*users)
        refresh_project_health(project)
        return Response(
            ProjectSerializer(project, context={"request": request}).data
        )

    def delete(self, request, project_id):
        try:
            project = Project.objects.get(
                id=project_id,
                organization=request.user.organization,
            )
        except Project.DoesNotExist:
            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        from .permissions import user_can_manage_project_instance
        if not user_can_manage_project_instance(request.user, project):
            return Response(
                {"message": "Only admins, managers, and the project lead can remove project members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_id = request.data.get("user_id")
        try:
            user = User.objects.get(
                id=user_id,
                organization=request.user.organization,
            )
        except User.DoesNotExist:
            return Response(
                {"message": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        project.members.remove(user)
        
        # Clean up user's roles and assignments in this project
        if project.project_lead == user:
            project.project_lead = None
            project.save(update_fields=["project_lead"])
        
        # Remove from tasks' and subtasks' assignees
        for task in project.tasks.all():
            task.assigned_to.remove(user)
            for subtask in task.subtasks.all():
                subtask.assigned_to.remove(user)
        
        # Remove from project issues' assignees
        project.issues.filter(assigned_to=user).update(assigned_to=None)

        refresh_project_health(project)
        return Response(
            ProjectSerializer(project, context={"request": request}).data
        )


class ProjectMilestoneListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedOrgMember]

    def get(self, request, project_id):
        project = get_project_or_404(request.user, project_id)
        if not project:
            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        milestones = project.milestones.all()
        serializer = ProjectMilestoneSerializer(milestones, many=True)
        return Response(serializer.data)

    def post(self, request, project_id):
        project = get_project_or_404(request.user, project_id)
        if not project:
            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        from .permissions import user_can_manage_project_instance
        if not user_can_manage_project_instance(request.user, project):
            return Response(
                {"message": "Only admins, managers, and the project lead can create milestones."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ProjectMilestoneSerializer(data=request.data)
        if serializer.is_valid():
            milestone = serializer.save(project=project)
            refresh_project_health(project)
            return Response(
                ProjectMilestoneSerializer(milestone).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProjectMilestoneDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedOrgMember]

    def get_milestone(self, request, project_id, milestone_id):
        project = get_project_or_404(request.user, project_id)
        if not project:
            return None, None
        try:
            milestone = project.milestones.get(id=milestone_id)
        except ProjectMilestone.DoesNotExist:
            return project, None
        return project, milestone

    def patch(self, request, project_id, milestone_id):
        project, milestone = self.get_milestone(request, project_id, milestone_id)
        if not project:
            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not milestone:
            return Response(
                {"message": "Milestone not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        from .permissions import user_can_manage_project_instance
        if not user_can_manage_project_instance(request.user, project):
            return Response(
                {"message": "Only admins, managers, and the project lead can update milestones."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ProjectMilestoneSerializer(
            milestone,
            data=request.data,
            partial=True,
        )
        if serializer.is_valid():
            serializer.save()
            refresh_project_health(project)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, project_id, milestone_id):
        project, milestone = self.get_milestone(request, project_id, milestone_id)
        if not project:
            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not milestone:
            return Response(
                {"message": "Milestone not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        from .permissions import user_can_manage_project_instance
        if not user_can_manage_project_instance(request.user, project):
            return Response(
                {"message": "Only admins, managers, and the project lead can delete milestones."},
                status=status.HTTP_403_FORBIDDEN,
            )

        milestone.delete()
        refresh_project_health(project)
        return Response({"message": "Milestone deleted"})


class ProjectTeamWorkloadView(APIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedOrgMember]

    def get(self, request, project_id):
        project = get_project_or_404(request.user, project_id)
        if not project:
            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        members = get_project_team_workload(project)
        if request.user.role == "employee":
            members = [row for row in members if row["id"] == str(request.user.id)]

        return Response(
            {
                "thresholds": get_thresholds(),
                "members": members,
            }
        )
