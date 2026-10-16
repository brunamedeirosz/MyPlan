from django.contrib.auth.models import User
from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .access import accessible_workspaces, require_manager
from .models import Comentario, EspacoPessoal, ItemPessoal, Nota, Projeto, Tarefa, Workspace


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']


class RegistroUsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def validate(self, attrs):
        try:
            validate_password(attrs['password'], User(username=attrs['username'], email=attrs.get('email', '')))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': exc.messages})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        EspacoPessoal.objects.bulk_create([EspacoPessoal(usuario=user, nome=nome) for nome in ['Pessoal', 'Trabalho', 'Estudos']])
        return user


class WorkspaceSerializer(serializers.ModelSerializer):
    membros = UserSerializer(many=True, read_only=True)
    dono_nome = serializers.ReadOnlyField(source='dono.username')
    pode_gerenciar = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = '__all__'
        read_only_fields = ['dono']

    def get_pode_gerenciar(self, obj):
        return obj.dono_id == self.context['request'].user.id


class ProjetoSerializer(serializers.ModelSerializer):
    workspace_nome = serializers.ReadOnlyField(source='workspace.nome')
    pode_gerenciar = serializers.SerializerMethodField()
    status = serializers.ChoiceField(choices=['Em Planejamento', 'Em Andamento', 'Concluido'])

    class Meta:
        model = Projeto
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['workspace'].queryset = accessible_workspaces(self.context['request'].user)

    def get_pode_gerenciar(self, obj):
        return obj.workspace.dono_id == self.context['request'].user.id

    def validate(self, attrs):
        workspace = attrs.get('workspace', self.instance.workspace if self.instance else None)
        require_manager(self.context['request'].user, workspace)
        if self.instance and workspace.pk != self.instance.workspace_id and self.instance.tarefa_set.exists():
            raise serializers.ValidationError({'workspace': 'Projetos com tarefas nao podem mudar de workspace.'})
        return attrs


class ComentarioSerializer(serializers.ModelSerializer):
    autor_nome = serializers.ReadOnlyField(source='autor.username')

    class Meta:
        model = Comentario
        fields = '__all__'
        read_only_fields = ['autor']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request:
            self.fields['tarefa'].queryset = Tarefa.objects.filter(projeto__workspace__in=accessible_workspaces(request.user))


class TarefaSerializer(serializers.ModelSerializer):
    comentarios = ComentarioSerializer(many=True, read_only=True)
    projeto_nome = serializers.ReadOnlyField(source='projeto.nome')
    responsavel_nome = serializers.ReadOnlyField(source='responsavel.username')
    pode_gerenciar = serializers.SerializerMethodField()
    status = serializers.ChoiceField(choices=['A Fazer', 'Em Andamento', 'Concluido'])
    prioridade = serializers.ChoiceField(choices=['Baixa', 'Media', 'Alta'])

    class Meta:
        model = Tarefa
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request:
            self.fields['projeto'].queryset = Projeto.objects.filter(workspace__in=accessible_workspaces(request.user))

    def get_pode_gerenciar(self, obj):
        return obj.projeto.workspace.dono_id == self.context['request'].user.id

    def validate(self, attrs):
        projeto = attrs.get('projeto', self.instance.projeto if self.instance else None)
        responsavel = attrs.get('responsavel', self.instance.responsavel if self.instance else None)
        if 'projeto' in attrs:
            require_manager(self.context['request'].user, projeto.workspace)
        if responsavel and responsavel.pk != projeto.workspace.dono_id and not projeto.workspace.membros.filter(pk=responsavel.pk).exists():
            raise serializers.ValidationError({'responsavel': 'Selecione um membro deste workspace.'})
        return attrs


class NotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Nota
        fields = '__all__'
        read_only_fields = ['usuario']

    def validate(self, attrs):
        for field in ('itens', 'itens_concluidos'):
            if field not in attrs:
                continue
            items = attrs[field]
            if not isinstance(items, list) or any(
                not isinstance(item, dict) or not isinstance(item.get('id'), str)
                or not isinstance(item.get('texto'), str) for item in items
            ):
                raise serializers.ValidationError({field: 'Envie uma lista de itens com id e texto.'})
        return attrs


class ItemPessoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemPessoal
        fields = ['id', 'titulo', 'descricao', 'prioridade', 'subtarefas', 'recorrencia', 'proxima_ocorrencia', 'concluida', 'importante', 'espaco', 'prazo', 'criado_em']
        read_only_fields = ['id', 'criado_em', 'proxima_ocorrencia']

    def validate_subtarefas(self, value):
        if not isinstance(value, list) or len(value) > 50:
            raise serializers.ValidationError('Envie no máximo 50 subtarefas.')
        seen = set()
        for item in value:
            if (not isinstance(item, dict) or set(item) != {'id', 'texto', 'concluida'}
                or not isinstance(item['id'], str) or not item['id'] or len(item['id']) > 80
                or not isinstance(item['texto'], str) or not item['texto'].strip() or len(item['texto']) > 300
                or not isinstance(item['concluida'], bool) or item['id'] in seen):
                raise serializers.ValidationError('Cada subtarefa precisa de id único, texto e conclusão válida.')
            seen.add(item['id'])
        return value

    def validate(self, attrs):
        recurrence = attrs.get('recorrencia', self.instance.recorrencia if self.instance else 'nenhuma')
        due = attrs.get('prazo', self.instance.prazo if self.instance else None)
        if recurrence != 'nenhuma' and not due:
            raise serializers.ValidationError({'prazo': 'Defina um prazo para a tarefa recorrente.'})
        return attrs

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['espaco'].queryset = EspacoPessoal.objects.filter(usuario=self.context['request'].user)


class EspacoPessoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspacoPessoal
        fields = ['id', 'nome', 'criado_em']
        read_only_fields = ['id', 'criado_em']

    def validate_nome(self, value):
        existing = EspacoPessoal.objects.filter(usuario=self.context['request'].user, nome__iexact=value)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError('Você já tem um espaço com esse nome.')
        return value
