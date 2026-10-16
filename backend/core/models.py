from django.contrib.auth.models import User
from django.db import models


class Workspace(models.Model):
    dono = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name='workspaces_criados')
    membros = models.ManyToManyField(User, blank=True, related_name='workspaces')
    nome = models.CharField(max_length=255)
    tipo = models.CharField(max_length=50)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome


class Projeto(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE
    )
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True)
    status = models.CharField(max_length=50)
    prazo_entrega = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome


class Tarefa(models.Model):
    projeto = models.ForeignKey(
        Projeto,
        on_delete=models.CASCADE
    )
    responsavel = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    titulo = models.CharField(max_length=255)
    descricao = models.TextField(blank=True)
    prioridade = models.CharField(max_length=50)
    status = models.CharField(max_length=50)
    prazo_entrega = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titulo


class Comentario(models.Model):
    tarefa = models.ForeignKey(
        Tarefa,
        on_delete=models.CASCADE,
        related_name='comentarios'
    )
    autor = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )
    texto = models.TextField()
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Comentario de {self.autor.username} em {self.tarefa.titulo}'


class Nota(models.Model):
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notas'
    )
    titulo = models.CharField(max_length=120, default='Minha nota')
    itens = models.JSONField(default=list, blank=True)
    itens_concluidos = models.JSONField(default=list, blank=True)
    pos_x = models.IntegerField(default=24)
    pos_y = models.IntegerField(default=120)
    fixada = models.BooleanField(default=False)
    visivel = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.titulo} - {self.usuario.username}'


class EspacoPessoal(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='espacos_pessoais')
    nome = models.CharField(max_length=60)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['usuario', 'nome'], name='espaco_nome_por_usuario')]

    def __str__(self):
        return self.nome


class ItemPessoal(models.Model):
    espaco = models.ForeignKey(EspacoPessoal, on_delete=models.SET_NULL, null=True, blank=True, related_name='itens')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='itens_pessoais')
    descricao = models.TextField(blank=True, default='', max_length=10000)
    prioridade = models.CharField(max_length=5, choices=[('baixa', 'Baixa'), ('media', 'Média'), ('alta', 'Alta')], default='media')
    subtarefas = models.JSONField(default=list, blank=True)
    recorrencia = models.CharField(max_length=8, choices=[('nenhuma', 'Não repetir'), ('diaria', 'Diária'), ('semanal', 'Semanal'), ('mensal', 'Mensal')], default='nenhuma')
    inicio_recorrencia = models.DateField(null=True, blank=True)
    proxima_ocorrencia = models.OneToOneField('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='ocorrencia_anterior')
    prazo = models.DateField(null=True, blank=True)
    titulo = models.CharField(max_length=255)
    concluida = models.BooleanField(default=False)
    importante = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titulo
