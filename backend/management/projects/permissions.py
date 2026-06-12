from rest_framework.permissions import BasePermission


def user_can_manage_projects(user):
    return user.role in ("admin", "manager")


def user_can_access_project(user, project):
    if user_can_manage_projects(user):
        return project.organization_id == user.organization_id
    return project.members.filter(id=user.id).exists() or project.project_lead_id == user.id


def user_can_manage_project_instance(user, project):
    return user.role in ("admin", "manager") or project.project_lead_id == user.id


class IsAuthenticatedOrgMember(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.organization_id is not None
        )
