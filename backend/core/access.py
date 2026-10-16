from django.db.models import Q
from rest_framework.exceptions import PermissionDenied

from .models import Workspace


def accessible_workspaces(user):
    return Workspace.objects.filter(Q(dono=user) | Q(membros=user)).distinct()


def require_manager(user, workspace):
    if workspace.dono_id != user.id:
        raise PermissionDenied('Somente o gestor deste workspace pode realizar esta acao.')
