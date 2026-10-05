from rest_framework import permissions

class IsAdminRole(permissions.BasePermission):
    """Allows access only to Admin users or superusers."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.role == 'ADMIN' or request.user.is_superuser))

class IsManagerOrAdmin(permissions.BasePermission):
    """Allows access to Managers, Admins or superusers."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role in ['ADMIN', 'MANAGER'] or request.user.is_superuser)
        )

class IsStaffOrAbove(permissions.BasePermission):
    """Allows write/execute access to Staff, Managers, and Admins. Viewers get read-only."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in ['ADMIN', 'MANAGER', 'STAFF'] or request.user.is_superuser

class ReadOnlyOrManager(permissions.BasePermission):
    """Read-only for Staff & Viewers, full write/update/delete for Manager and Admin."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user.role in ['ADMIN', 'MANAGER'] or request.user.is_superuser)
