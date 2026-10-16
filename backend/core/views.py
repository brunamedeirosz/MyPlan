from django.contrib.auth.models import User
from django.db.models import Q
from django.db import transaction
from django.utils import timezone
from .recurrence import next_deadline
from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .access import accessible_workspaces, require_manager
from .models import Comentario, EspacoPessoal, ItemPessoal, Nota, Projeto, Tarefa, Workspace
from .serializers import (
    ComentarioSerializer, EspacoPessoalSerializer, ItemPessoalSerializer, NotaSerializer, ProjetoSerializer, RegistroUsuarioSerializer,
    TarefaSerializer, UserSerializer, WorkspaceSerializer,
)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.none()
    serializer_class = UserSerializer

    def get_queryset(self):
        workspaces = accessible_workspaces(self.request.user)
        return User.objects.filter(
            Q(pk=self.request.user.pk) | Q(workspaces_criados__in=workspaces) | Q(workspaces__in=workspaces)
        ).distinct().order_by('username')


class RegistroUsuarioView(generics.CreateAPIView):
    serializer_class = RegistroUsuarioSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


class WorkspaceViewSet(viewsets.ModelViewSet):
    queryset = Workspace.objects.none()
    serializer_class = WorkspaceSerializer

    def get_queryset(self):
        return accessible_workspaces(self.request.user).prefetch_related('membros').order_by('id')

    def perform_create(self, serializer):
        serializer.save(dono=self.request.user)

    def perform_update(self, serializer):
        require_manager(self.request.user, serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        require_manager(self.request.user, instance)
        instance.delete()

    @action(detail=True, methods=['post', 'delete'])
    def membros(self, request, pk=None):
        workspace = self.get_object()
        require_manager(request.user, workspace)
        username = request.data.get('username', '')
        user = User.objects.filter(username=username, is_active=True).first()
        if not user:
            raise ValidationError({'username': 'Conta nao encontrada. Peca que a pessoa se cadastre primeiro.'})
        if user.pk == workspace.dono_id:
            raise ValidationError({'username': 'O gestor ja faz parte do workspace.'})
        if request.method == 'DELETE':
            workspace.membros.remove(user)
            Tarefa.objects.filter(projeto__workspace=workspace, responsavel=user).update(responsavel=None)
        else:
            workspace.membros.add(user)
        return Response(self.get_serializer(workspace).data)


class ProjetoViewSet(viewsets.ModelViewSet):
    queryset = Projeto.objects.none()
    serializer_class = ProjetoSerializer

    def get_queryset(self):
        return Projeto.objects.filter(workspace__in=accessible_workspaces(self.request.user)).select_related('workspace').order_by('id')

    def perform_create(self, serializer):
        require_manager(self.request.user, serializer.validated_data['workspace'])
        serializer.save()

    def perform_update(self, serializer):
        require_manager(self.request.user, serializer.instance.workspace)
        serializer.save()

    def perform_destroy(self, instance):
        require_manager(self.request.user, instance.workspace)
        instance.delete()


class TarefaViewSet(viewsets.ModelViewSet):
    queryset = Tarefa.objects.none()
    serializer_class = TarefaSerializer

    def get_queryset(self):
        return Tarefa.objects.filter(projeto__workspace__in=accessible_workspaces(self.request.user)).select_related(
            'projeto__workspace', 'responsavel'
        ).prefetch_related('comentarios__autor').order_by('id')

    def perform_create(self, serializer):
        require_manager(self.request.user, serializer.validated_data['projeto'].workspace)
        serializer.save()

    def perform_update(self, serializer):
        if serializer.instance.projeto.workspace.dono_id != self.request.user.id:
            if set(serializer.validated_data) - {'status'}:
                raise PermissionDenied('Colaboradores podem alterar apenas o status da tarefa.')
        serializer.save()

    def perform_destroy(self, instance):
        require_manager(self.request.user, instance.projeto.workspace)
        instance.delete()


class ComentarioViewSet(viewsets.ModelViewSet):
    queryset = Comentario.objects.none()
    serializer_class = ComentarioSerializer

    def get_queryset(self):
        return Comentario.objects.filter(tarefa__projeto__workspace__in=accessible_workspaces(self.request.user)).select_related('tarefa', 'autor').order_by('id')

    def perform_create(self, serializer):
        serializer.save(autor=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.autor_id != self.request.user.id:
            raise PermissionDenied('Voce so pode editar seus proprios comentarios.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.autor_id != self.request.user.id:
            raise PermissionDenied('Voce so pode excluir seus proprios comentarios.')
        instance.delete()


class NotaViewSet(viewsets.ModelViewSet):
    serializer_class = NotaSerializer

    def get_queryset(self):
        return Nota.objects.filter(usuario=self.request.user).order_by('id')

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


class ItemPessoalViewSet(viewsets.ModelViewSet):
    serializer_class = ItemPessoalSerializer

    def get_queryset(self):
        return ItemPessoal.objects.filter(usuario=self.request.user).order_by('-criado_em', '-id')

    def perform_create(self, serializer):
        attrs = serializer.validated_data
        anchor = attrs.get('prazo') if attrs.get('recorrencia', 'nenhuma') != 'nenhuma' else None
        serializer.save(usuario=self.request.user, inicio_recorrencia=anchor)

    @transaction.atomic
    def perform_update(self, serializer):
        item = self.get_queryset().select_for_update().get(pk=serializer.instance.pk)
        was_complete = item.concluida
        serializer.instance = item
        attrs = serializer.validated_data
        anchor = item.inicio_recorrencia
        if attrs.get('prazo', item.prazo) != item.prazo or attrs.get('recorrencia', item.recorrencia) != item.recorrencia:
            anchor = attrs.get('prazo', item.prazo) if attrs.get('recorrencia', item.recorrencia) != 'nenhuma' else None
        item = serializer.save(inicio_recorrencia=anchor)
        if item.concluida and not was_complete and item.recorrencia != 'nenhuma' and not item.proxima_ocorrencia_id:
            try:
                deadline = next_deadline(item.prazo, item.recorrencia, item.inicio_recorrencia or item.prazo, timezone.localdate())
            except (ValueError, OverflowError):
                raise ValidationError({'prazo': 'Não há uma próxima data válida para esta recorrência.'})
            upcoming = ItemPessoal.objects.create(
                usuario=item.usuario, espaco=item.espaco, titulo=item.titulo, descricao=item.descricao,
                prioridade=item.prioridade, importante=item.importante, recorrencia=item.recorrencia,
                prazo=deadline, inicio_recorrencia=item.inicio_recorrencia or item.prazo,
                subtarefas=[{**task, 'concluida': False} for task in item.subtarefas],
            )
            item.proxima_ocorrencia = upcoming
            item.save(update_fields=['proxima_ocorrencia'])


class EspacoPessoalViewSet(viewsets.ModelViewSet):
    serializer_class = EspacoPessoalSerializer

    def get_queryset(self):
        return EspacoPessoal.objects.filter(usuario=self.request.user).order_by('id')

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)
