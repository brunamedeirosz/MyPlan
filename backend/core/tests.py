from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Comentario, EspacoPessoal, ItemPessoal, Nota, Projeto, Tarefa, Workspace


class DevDeskApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='bruna',
            email='bruna@example.com',
            password='devdesk123',
        )
        self.workspace = Workspace.objects.create(
            dono=self.user,
            nome='Produto',
            tipo='Desenvolvimento',
        )
        self.projeto = Projeto.objects.create(
            workspace=self.workspace,
            nome='Portal DevDesk',
            descricao='Organizar entregas da equipe',
            status='Em Andamento',
            prazo_entrega=timezone.now() + timedelta(days=7),
        )

    def test_token_endpoint_returns_access_token(self):
        response = self.client.post('/api/token/', {
            'username': 'bruna',
            'password': 'devdesk123',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_registration_endpoint_creates_user(self):
        response = self.client.post('/api/registro/', {
            'username': 'ana',
            'email': 'ana@example.com',
            'password': 'devdesk123',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='ana').exists())
        self.assertNotIn('password', response.data)

    def test_users_endpoint_lists_basic_user_data(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get('/api/usuarios/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['username'], 'bruna')

    def test_create_task_with_responsavel_returns_related_names(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/tarefas/', {
            'projeto': self.projeto.id,
            'responsavel': self.user.id,
            'titulo': 'Fechar Kanban',
            'descricao': 'Permitir troca de status',
            'prioridade': 'Alta',
            'status': 'A Fazer',
            'prazo_entrega': (timezone.now() + timedelta(days=2)).isoformat(),
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['projeto_nome'], 'Portal DevDesk')
        self.assertEqual(response.data['responsavel_nome'], 'bruna')

    def test_create_task_without_due_date(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/tarefas/', {
            'projeto': self.projeto.id,
            'responsavel': self.user.id,
            'titulo': 'Tarefa sem prazo',
            'descricao': 'Nem toda demanda precisa de data final.',
            'prioridade': 'Media',
            'status': 'A Fazer',
            'prazo_entrega': None,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['prazo_entrega'])

    def test_anonymous_user_cannot_create_task(self):
        response = self.client.post('/api/tarefas/', {
            'projeto': self.projeto.id,
            'responsavel': self.user.id,
            'titulo': 'Tarefa bloqueada',
            'descricao': 'Sem login nao pode criar.',
            'prioridade': 'Alta',
            'status': 'A Fazer',
            'prazo_entrega': (timezone.now() + timedelta(days=2)).isoformat(),
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_user_cannot_list_users(self):
        response = self.client.get('/api/usuarios/')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_comment_task(self):
        tarefa = Tarefa.objects.create(
            projeto=self.projeto,
            responsavel=self.user,
            titulo='Testar comentarios',
            descricao='Adicionar feedback em tarefas',
            prioridade='Media',
            status='Em Andamento',
            prazo_entrega=timezone.now() + timedelta(days=1),
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/comentarios/', {
            'tarefa': tarefa.id,
            'texto': 'Comentario criado pela API.',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comentario.objects.count(), 1)
        self.assertEqual(response.data['autor_nome'], 'bruna')

    def test_authenticated_user_can_create_note(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/notas/', {
            'titulo': 'Checklist rapido',
            'itens': [{'id': '1', 'texto': 'Revisar tarefa'}],
            'itens_concluidos': [],
            'pos_x': 120,
            'pos_y': 180,
            'fixada': True,
            'visivel': True,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Nota.objects.count(), 1)
        self.assertEqual(response.data['titulo'], 'Checklist rapido')

    def test_user_only_lists_own_notes(self):
        other_user = User.objects.create_user(username='ana', password='devdesk123')
        Nota.objects.create(usuario=self.user, titulo='Minha nota')
        Nota.objects.create(usuario=other_user, titulo='Nota de outra pessoa')
        self.client.force_authenticate(user=self.user)

        response = self.client.get('/api/notas/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['titulo'], 'Minha nota')

    def test_anonymous_user_cannot_access_notes(self):
        response = self.client.get('/api/notas/')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class WorkspaceAccessTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(username='gestor', password='DevDesk!Teste42')
        self.member = User.objects.create_user(username='colaborador', password='DevDesk!Teste42')
        self.outsider = User.objects.create_user(username='outra_equipe', password='DevDesk!Teste42')
        self.workspace = Workspace.objects.create(dono=self.manager, nome='Equipe', tipo='Design')
        self.workspace.membros.add(self.member)
        self.project = Projeto.objects.create(workspace=self.workspace, nome='Entrega', descricao='V1', status='Em Andamento', prazo_entrega=timezone.now())
        self.task = Tarefa.objects.create(projeto=self.project, titulo='Implementar', descricao='V1', prioridade='Alta', status='A Fazer')
        self.comment = Comentario.objects.create(tarefa=self.task, autor=self.manager, texto='Contexto')
        self.client.force_authenticate(self.outsider)

    def task_payload(self, **changes):
        return {'projeto': self.project.pk, 'titulo': 'Nova', 'descricao': 'Detalhes', 'status': 'A Fazer', 'prioridade': 'Media', **changes}

    def test_outsider_cannot_list_or_retrieve_team_data(self):
        for resource, instance in [('workspaces', self.workspace), ('projetos', self.project), ('tarefas', self.task), ('comentarios', self.comment)]:
            with self.subTest(resource=resource):
                self.assertEqual(self.client.get(f'/api/{resource}/').data, [])
                self.assertEqual(self.client.get(f'/api/{resource}/{instance.pk}/').status_code, 404)
                self.assertEqual(self.client.patch(f'/api/{resource}/{instance.pk}/', {}, format='json').status_code, 404)
                self.assertEqual(self.client.delete(f'/api/{resource}/{instance.pk}/').status_code, 404)

    def test_outsider_cannot_create_task_or_comment_in_other_workspace(self):
        self.assertEqual(self.client.post('/api/tarefas/', self.task_payload(), format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/comentarios/', {'tarefa': self.task.pk, 'texto': 'Intruso'}).status_code, 400)

    def test_user_directory_excludes_unrelated_accounts_and_emails(self):
        response = self.client.get('/api/usuarios/')
        self.assertEqual([u['id'] for u in response.data], [self.outsider.pk])
        self.assertNotIn('email', response.data[0])

    def test_new_workspace_owner_is_always_current_user(self):
        response = self.client.post('/api/workspaces/', {'nome': 'Meu', 'tipo': 'Design', 'dono': self.manager.pk})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['dono'], self.outsider.pk)
        self.assertTrue(response.data['pode_gerenciar'])

    def test_member_can_read_comment_and_change_status(self):
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get('/api/tarefas/').data[0]['id'], self.task.pk)
        response = self.client.patch(f'/api/tarefas/{self.task.pk}/', {'status': 'Concluido'})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['pode_gerenciar'])
        self.assertEqual(self.client.post('/api/comentarios/', {'tarefa': self.task.pk, 'texto': 'Feito'}).status_code, 201)

    def test_member_cannot_manage_workspaces_projects_or_tasks(self):
        self.client.force_authenticate(self.member)
        for resource, instance, changes in [
            ('workspaces', self.workspace, {'nome': 'Outro'}),
            ('projetos', self.project, {'nome': 'Outro'}),
            ('tarefas', self.task, {'titulo': 'Outro'}),
        ]:
            with self.subTest(resource=resource):
                self.assertEqual(self.client.patch(f'/api/{resource}/{instance.pk}/', changes).status_code, 403)
                self.assertEqual(self.client.delete(f'/api/{resource}/{instance.pk}/').status_code, 403)
        self.assertEqual(self.client.post('/api/tarefas/', self.task_payload(), format='json').status_code, 403)
        self.assertEqual(self.client.post(f'/api/workspaces/{self.workspace.pk}/membros/', {'username': self.outsider.username}).status_code, 403)

    def test_manager_can_add_and_remove_member(self):
        self.client.force_authenticate(self.manager)
        url = f'/api/workspaces/{self.workspace.pk}/membros/'
        response = self.client.post(url, {'username': self.outsider.username})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['membros']), 2)
        self.task.responsavel = self.outsider
        self.task.save()
        self.assertEqual(self.client.delete(url, {'username': self.outsider.username}, format='json').status_code, 200)
        self.task.refresh_from_db()
        self.assertIsNone(self.task.responsavel)
        self.client.force_authenticate(self.outsider)
        self.assertEqual(self.client.get('/api/tarefas/').data, [])

    def test_membership_errors_do_not_change_team(self):
        self.client.force_authenticate(self.manager)
        for username in [self.manager.username, 'nao_existe']:
            self.assertEqual(self.client.post(f'/api/workspaces/{self.workspace.pk}/membros/', {'username': username}).status_code, 400)
        self.assertEqual(self.workspace.membros.count(), 1)

    def test_cannot_assign_task_to_outsider(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post('/api/tarefas/', self.task_payload(responsavel=self.outsider.pk), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('responsavel', response.data)

    def test_cannot_move_project_with_tasks_to_another_workspace(self):
        self.client.force_authenticate(self.manager)
        other = Workspace.objects.create(dono=self.manager, nome='Outro', tipo='Design')
        response = self.client.patch(f'/api/projetos/{self.project.pk}/', {'workspace': other.pk})
        self.assertEqual(response.status_code, 400)

    def test_cannot_move_task_to_workspace_managed_by_someone_else(self):
        other = Workspace.objects.create(dono=self.outsider, nome='Outro', tipo='Design')
        other.membros.add(self.manager)
        project = Projeto.objects.create(workspace=other, nome='Outro', descricao='V1', status='Em Andamento', prazo_entrega=timezone.now())
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.patch(f'/api/tarefas/{self.task.pk}/', {'projeto': project.pk}).status_code, 403)

    def test_only_author_can_edit_or_delete_comment(self):
        self.client.force_authenticate(self.member)
        url = f'/api/comentarios/{self.comment.pk}/'
        self.assertEqual(self.client.patch(url, {'texto': 'Alterado'}).status_code, 403)
        self.assertEqual(self.client.delete(url).status_code, 403)
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.patch(url, {'texto': 'Revisado'}).status_code, 200)
        self.assertEqual(self.client.delete(url).status_code, 204)

    def test_invalid_status_and_priority_are_rejected(self):
        self.client.force_authenticate(self.manager)
        for changes in [{'status': 'qualquer'}, {'prioridade': 'qualquer'}]:
            self.assertEqual(self.client.patch(f'/api/tarefas/{self.task.pk}/', changes).status_code, 400)

    def test_note_data_is_validated_and_private(self):
        self.assertEqual(self.client.post('/api/notas/', {'itens': {'texto': 'invalido'}}, format='json').status_code, 400)
        note = Nota.objects.create(usuario=self.manager)
        self.assertEqual(self.client.patch(f'/api/notas/{note.pk}/', {'titulo': 'Intruso'}).status_code, 404)
        self.assertEqual(self.client.delete(f'/api/notas/{note.pk}/').status_code, 404)

    def test_weak_password_is_rejected(self):
        self.client.force_authenticate(None)
        response = self.client.post('/api/registro/', {'username': 'contanova', 'password': '12345678'})
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='contanova').exists())

    def test_refresh_token_works(self):
        self.client.force_authenticate(None)
        tokens = self.client.post('/api/token/', {'username': self.manager.username, 'password': 'DevDesk!Teste42'}).data
        response = self.client.post('/api/token/refresh/', {'refresh': tokens['refresh']})
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)

    def test_manager_can_delete_project_and_related_data(self):
        self.client.force_authenticate(self.manager)
        response = self.client.delete(f'/api/projetos/{self.project.pk}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Tarefa.objects.filter(pk=self.task.pk).exists())
        self.assertFalse(Comentario.objects.filter(pk=self.comment.pk).exists())


    def test_minimal_project_and_task_do_not_require_description_or_deadline(self):
        self.client.force_authenticate(self.manager)
        project = self.client.post('/api/projetos/', {'nome': 'Minhas tarefas', 'workspace': self.workspace.pk, 'status': 'Em Planejamento'}, format='json')
        self.assertEqual(project.status_code, 201, project.data)
        self.assertIsNone(project.data['prazo_entrega'])
        task = self.client.post('/api/tarefas/', {'titulo': 'Primeira tarefa', 'projeto': project.data['id'], 'status': 'A Fazer', 'prioridade': 'Media'}, format='json')
        self.assertEqual(task.status_code, 201, task.data)
        self.assertEqual(task.data['descricao'], '')
        self.assertIsNone(task.data['prazo_entrega'])


class PersonalTaskTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='pessoal', password='DevDesk!12345')
        self.other = User.objects.create_user(username='outro', password='DevDesk!12345')
        self.client.force_authenticate(self.user)

    def test_create_with_only_title_without_project_or_workspace(self):
        response = self.client.post('/api/itens-pessoais/', {'titulo': 'Ler um capítulo'})
        self.assertEqual(response.status_code, 201, response.data)
        self.assertFalse(response.data['concluida'])
        self.assertFalse(response.data['importante'])
        self.assertEqual(Workspace.objects.count(), 0)
        self.assertEqual(ItemPessoal.objects.get().usuario, self.user)

    def test_accounts_are_isolated_in_lists_and_all_detail_actions(self):
        mine = ItemPessoal.objects.create(usuario=self.user, titulo='Minha tarefa')
        other = ItemPessoal.objects.create(usuario=self.other, titulo='Privada')
        self.assertEqual([item['id'] for item in self.client.get('/api/itens-pessoais/').data], [mine.pk])
        url = f'/api/itens-pessoais/{other.pk}/'
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.patch(url, {'concluida': True}).status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)

    def test_edit_complete_reopen_star_and_delete(self):
        item = ItemPessoal.objects.create(usuario=self.user, titulo='Começar')
        url = f'/api/itens-pessoais/{item.pk}/'
        for change in [{'titulo': 'Continuar'}, {'concluida': True}, {'concluida': False}, {'importante': True}]:
            response = self.client.patch(url, change, format='json')
            self.assertEqual(response.status_code, 200)
            for key, value in change.items(): self.assertEqual(response.data[key], value)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertFalse(ItemPessoal.objects.exists())

    def test_cannot_choose_owner(self):
        response = self.client.post('/api/itens-pessoais/', {'titulo': 'Privada', 'usuario': self.other.pk})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ItemPessoal.objects.get().usuario, self.user)

    def test_blank_and_oversized_titles_rejected(self):
        for title in ['', '   ', 'x' * 256]:
            self.assertEqual(self.client.post('/api/itens-pessoais/', {'titulo': title}).status_code, 400)
        self.assertFalse(ItemPessoal.objects.exists())

    def test_anonymous_access_rejected(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/itens-pessoais/').status_code, 401)
        self.assertEqual(self.client.post('/api/itens-pessoais/', {'titulo': 'Privada'}).status_code, 401)


class PersonalSpaceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='pessoa', password='DevDesk!12345')
        self.other = User.objects.create_user(username='outra', password='DevDesk!12345')
        self.space = EspacoPessoal.objects.create(usuario=self.user, nome='Trabalho')
        self.foreign = EspacoPessoal.objects.create(usuario=self.other, nome='Privado')
        self.client.force_authenticate(self.user)

    def test_registration_seeds_defaults_once_and_deleted_spaces_stay_deleted(self):
        self.client.force_authenticate(None)
        response = self.client.post('/api/registro/', {'username': 'nova', 'password': 'NovaConta!Test42'})
        self.assertEqual(response.status_code, 201, response.data)
        user = User.objects.get(username='nova')
        self.assertEqual(list(user.espacos_pessoais.order_by('id').values_list('nome', flat=True)), ['Pessoal', 'Trabalho', 'Estudos'])
        self.client.force_authenticate(user)
        for space in user.espacos_pessoais.all():
            self.assertEqual(self.client.delete(f'/api/espacos-pessoais/{space.pk}/').status_code, 204)
        self.assertEqual(self.client.get('/api/espacos-pessoais/').data, [])
        self.assertEqual(self.client.get('/api/espacos-pessoais/').data, [])

    def test_space_crud_is_private_and_owner_cannot_be_chosen(self):
        created = self.client.post('/api/espacos-pessoais/', {'nome': 'Faculdade', 'usuario': self.other.pk})
        self.assertEqual(created.status_code, 201)
        self.assertEqual(EspacoPessoal.objects.get(pk=created.data['id']).usuario, self.user)
        self.assertEqual(len(self.client.get('/api/espacos-pessoais/').data), 2)
        foreign = f'/api/espacos-pessoais/{self.foreign.pk}/'
        self.assertEqual(self.client.get(foreign).status_code, 404)
        self.assertEqual(self.client.patch(foreign, {'nome': 'Intruso'}).status_code, 404)
        self.assertEqual(self.client.delete(foreign).status_code, 404)
        self.assertEqual(self.client.patch(f'/api/espacos-pessoais/{self.space.pk}/', {'nome': 'Escola'}).status_code, 200)

    def test_task_can_move_only_between_own_spaces(self):
        task = self.client.post('/api/itens-pessoais/', {'titulo': 'Estudar', 'espaco': self.space.pk})
        self.assertEqual(task.status_code, 201, task.data)
        url = f"/api/itens-pessoais/{task.data['id']}/"
        self.assertEqual(self.client.patch(url, {'espaco': self.foreign.pk}).status_code, 400)
        self.assertEqual(self.client.post('/api/itens-pessoais/', {'titulo': 'Intruso', 'espaco': self.foreign.pk}).status_code, 400)
        self.assertEqual(self.client.patch(url, {'espaco': None}, format='json').status_code, 200)

    def test_deleting_space_preserves_open_and_completed_tasks(self):
        first = ItemPessoal.objects.create(usuario=self.user, espaco=self.space, titulo='Aberta')
        second = ItemPessoal.objects.create(usuario=self.user, espaco=self.space, titulo='Feita', concluida=True)
        self.assertEqual(self.client.delete(f'/api/espacos-pessoais/{self.space.pk}/').status_code, 204)
        first.refresh_from_db(); second.refresh_from_db()
        self.assertIsNone(first.espaco)
        self.assertIsNone(second.espaco)
        self.assertTrue(second.concluida)

    def test_bad_space_names_rejected(self):
        for name in ['', '   ', 'x' * 61, 'trabalho']:
            self.assertEqual(self.client.post('/api/espacos-pessoais/', {'nome': name}).status_code, 400)

    def test_existing_users_and_tasks_are_seeded_without_replacement(self):
        from importlib import import_module
        from types import SimpleNamespace
        from django.apps import apps
        from django.db import connection
        item = ItemPessoal.objects.create(usuario=self.user, titulo='Tarefa existente', concluida=True, importante=True)
        seed = import_module('core.migrations.0011_espacos_iniciais').seed_spaces
        seed(apps, SimpleNamespace(connection=connection))
        item.refresh_from_db()
        self.assertEqual(item.espaco.nome, 'Pessoal')
        self.assertTrue(item.concluida)
        self.assertTrue(item.importante)
        seed(apps, SimpleNamespace(connection=connection))
        self.assertEqual(self.user.espacos_pessoais.count(), 3)

    def test_anonymous_cannot_access_spaces(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/espacos-pessoais/').status_code, 401)
        self.assertEqual(self.client.post('/api/espacos-pessoais/', {'nome': 'Intruso'}).status_code, 401)


class PersonalCalendarTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='agenda', password='Calendar!Teste42')
        self.client.force_authenticate(self.user)

    def test_deadline_is_optional_and_uses_date_without_timezone_conversion(self):
        response = self.client.post('/api/itens-pessoais/', {'titulo': 'Estudar', 'prazo': '2026-10-16'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['prazo'], '2026-10-16')
        task = ItemPessoal.objects.get(pk=response.data['id'])
        self.assertEqual(task.prazo.isoformat(), '2026-10-16')
        url = f'/api/itens-pessoais/{task.pk}/'
        self.assertEqual(self.client.patch(url, {'prazo': '2026-10-17'}).data['prazo'], '2026-10-17')
        self.assertIsNone(self.client.patch(url, {'prazo': None}, format='json').data['prazo'])
        self.assertIsNone(self.client.post('/api/itens-pessoais/', {'titulo': 'Sem prazo'}).data['prazo'])

    def test_invalid_date_rejected_without_creating_task(self):
        for date in ['2026-02-30', '2026-13-01', 'not-a-date']:
            response = self.client.post('/api/itens-pessoais/', {'titulo': 'Inválida', 'prazo': date})
            self.assertEqual(response.status_code, 400)
            self.assertIn('prazo', response.data)
        self.assertFalse(ItemPessoal.objects.exists())


class PlannerEnhancementTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='planner', password='Planner!Test42')
        self.client.force_authenticate(self.user)

    def test_details_priority_and_checklist_are_persisted(self):
        payload = {'titulo': 'Estudar', 'descricao': 'Revisar capítulos', 'prioridade': 'alta', 'subtarefas': [{'id': 'one', 'texto': 'Ler capítulo', 'concluida': False}]}
        response = self.client.post('/api/itens-pessoais/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        for field, value in payload.items(): self.assertEqual(response.data[field], value)
        task = ItemPessoal.objects.get(pk=response.data['id'])
        response = self.client.patch(f'/api/itens-pessoais/{task.pk}/', {'subtarefas': [{'id': 'one', 'texto': 'Ler capítulo', 'concluida': True}]}, format='json')
        self.assertTrue(response.data['subtarefas'][0]['concluida'])

    def test_bad_checklists_and_priorities_are_rejected(self):
        for changes in [{'prioridade': 'urgentissima'}, {'subtarefas': {}}, {'subtarefas': [{'id': 'x', 'texto': '', 'concluida': False}]}, {'subtarefas': [{'id': 'x', 'texto': 'A', 'concluida': 'true'}]}, {'subtarefas': [{'id': 'x', 'texto': 'A', 'concluida': False}] * 2}]:
            response = self.client.post('/api/itens-pessoais/', {'titulo': 'Inválida', **changes}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(ItemPessoal.objects.exists())

    def test_recurrence_requires_due_date(self):
        response = self.client.post('/api/itens-pessoais/', {'titulo': 'Rotina', 'recorrencia': 'diaria'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('prazo', response.data)

    def test_completion_creates_one_next_occurrence_and_resets_checklist(self):
        from datetime import timedelta
        due = timezone.localdate() + timedelta(days=2)
        task = self.client.post('/api/itens-pessoais/', {'titulo': 'Rotina', 'prazo': due.isoformat(), 'recorrencia': 'diaria', 'descricao': 'Uma rotina', 'prioridade': 'alta', 'subtarefas': [{'id': 'a', 'texto': 'Etapa', 'concluida': True}]}, format='json').data
        url = f"/api/itens-pessoais/{task['id']}/"
        completed = self.client.patch(url, {'concluida': True}, format='json')
        self.assertEqual(completed.status_code, 200, completed.data)
        next_task = ItemPessoal.objects.get(pk=completed.data['proxima_ocorrencia'])
        self.assertEqual(next_task.prazo, due + timedelta(days=1))
        self.assertEqual(next_task.descricao, 'Uma rotina')
        self.assertEqual(next_task.prioridade, 'alta')
        self.assertFalse(next_task.subtarefas[0]['concluida'])
        self.assertFalse(next_task.concluida)
        self.client.patch(url, {'concluida': True}, format='json')
        self.client.patch(url, {'concluida': False}, format='json')
        self.client.patch(url, {'concluida': True}, format='json')
        self.assertEqual(ItemPessoal.objects.count(), 2)

    def test_monthly_recurrence_keeps_original_month_day(self):
        from datetime import date
        from unittest.mock import patch
        with patch('core.views.timezone.localdate', return_value=date(2027, 1, 30)):
            task = self.client.post('/api/itens-pessoais/', {'titulo': 'Mensal', 'prazo': '2027-01-31', 'recorrencia': 'mensal'}).data
            first = self.client.patch(f"/api/itens-pessoais/{task['id']}/", {'concluida': True}).data
            next_id = first['proxima_ocorrencia']
            self.assertEqual(ItemPessoal.objects.get(pk=next_id).prazo, date(2027, 2, 28))
            # Editing unchanged date/recurrence must not lose the original day 31.
            self.client.patch(f'/api/itens-pessoais/{next_id}/', {'titulo': 'Mensal editada', 'prazo': '2027-02-28', 'recorrencia': 'mensal'})
            second = self.client.patch(f'/api/itens-pessoais/{next_id}/', {'concluida': True}).data
            self.assertEqual(ItemPessoal.objects.get(pk=second['proxima_ocorrencia']).prazo, date(2027, 3, 31))

    def test_overdue_recurrence_advances_to_future_and_weekly_preserves_weekday(self):
        from datetime import date
        from .recurrence import next_deadline
        self.assertEqual(next_deadline(date(2026, 1, 1), 'diaria', date(2026, 1, 1), date(2026, 10, 16)), date(2026, 10, 17))
        weekly = next_deadline(date(2026, 1, 1), 'semanal', date(2026, 1, 1), date(2026, 10, 16))
        self.assertGreater(weekly, date(2026, 10, 16))
        self.assertEqual(weekly.weekday(), date(2026, 1, 1).weekday())

    def test_client_cannot_choose_next_occurrence(self):
        other = User.objects.create_user(username='other', password='Planner!Test42')
        foreign = ItemPessoal.objects.create(usuario=other, titulo='Privada')
        response = self.client.post('/api/itens-pessoais/', {'titulo': 'Minha', 'proxima_ocorrencia': foreign.pk})
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data['proxima_ocorrencia'])
