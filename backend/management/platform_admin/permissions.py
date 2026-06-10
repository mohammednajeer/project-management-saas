from rest_framework.permissions import BasePermission


class IsPlatformAdmin(BasePermission):
    """
    Allows access only to platform administrators (system owners).
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role == "platform_admin"
                or request.user.is_superuser
                or request.user.is_staff
            )
        )
6