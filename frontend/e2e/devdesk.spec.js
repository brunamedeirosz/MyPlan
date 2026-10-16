import { test, expect } from '@playwright/test';

const apiURL = 'http://127.0.0.1:8001/api/';
const password = 'DevDesk!Validacao42';
const suffix = () => `${Date.now()}${Math.floor(Math.random() * 10000)}`;

async function register(page, username) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await page.getByPlaceholder('Usuario', { exact: true }).fill(username);
  await page.getByPlaceholder('Email', { exact: true }).fill(`${username}@example.com`);
  await page.getByPlaceholder('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Criar e entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
}

async function seed(request) {
  const username = `gestor${suffix()}`;
  await request.post(`${apiURL}registro/`, { data: { username, password } });
  const tokens = await (await request.post(`${apiURL}token/`, { data: { username, password } })).json();
  const headers = { Authorization: `Bearer ${tokens.access}` };
  const workspace = await (await request.post(`${apiURL}workspaces/`, { headers, data: { nome: 'Equipe de teste', tipo: 'Design' } })).json();
  const project = await (await request.post(`${apiURL}projetos/`, { headers, data: {
    nome: 'Projeto de teste', descricao: 'Entrega V1', workspace: workspace.id, status: 'Em Andamento', prazo_entrega: '2026-12-01T15:30:00Z',
  } })).json();
  const task = await (await request.post(`${apiURL}tarefas/`, { headers, data: {
    titulo: 'Tarefa de teste', descricao: 'Validar entrega', projeto: project.id, status: 'A Fazer', prioridade: 'Alta', prazo_entrega: '2026-12-01T15:30:00Z',
  } })).json();
  return { username, tokens, headers, workspace, project, task };
}

async function loginWithTokens(page, user) {
  await page.goto('/');
  await page.evaluate(({ username, tokens }) => {
    localStorage.setItem('devdesk_token', tokens.access);
    localStorage.setItem('devdesk_refresh_token', tokens.refresh);
    localStorage.setItem('devdesk_username', username);
  }, user);
  await page.reload();
}

test('cadastro, workspace, projeto, tarefa, comentario e nota persistem', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await register(page, `pessoa${suffix()}`);
  await page.getByRole('link', { name: 'Workspaces', exact: true }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Equipe local');
  await page.getByRole('button', { name: 'Salvar workspace' }).click();
  await expect(page.getByRole('link', { name: /Equipe local/ })).toBeVisible();
  await page.getByRole('link', { name: 'Projetos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Projetos', exact: true })).toBeVisible();
  await page.getByLabel('Nome', { exact: true }).fill('Primeira entrega');
  await page.getByLabel('Descricao', { exact: true }).fill('Preparar a V1');
  await page.getByLabel('Workspace', { exact: true }).selectOption({ label: 'Equipe local' });
  await page.getByLabel('Prazo', { exact: true }).fill('2026-12-01T12:30');
  await page.getByRole('button', { name: 'Salvar projeto', exact: true }).click();
  await expect(page.getByText('Primeira entrega', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Desenvolvimento', exact: true }).click();
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click();
  await page.getByPlaceholder('Titulo da tarefa').fill('Revisar a V1');
  await page.getByPlaceholder('Descricao', { exact: true }).fill('Fluxo completo');
  await page.locator('.task-composer select').nth(0).selectOption({ label: 'Primeira entrega' });
  await page.getByTitle('Prazo opcional').fill('2026-12-01T12:30');
  await page.getByRole('button', { name: 'Adicionar tarefa' }).click();
  const card = page.locator('.board-card').filter({ hasText: 'Revisar a V1' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.getByTitle('Prazo opcional')).toHaveValue('2026-12-01T12:30');
  await page.getByRole('button', { name: 'Salvar alteracoes' }).click();
  await card.getByPlaceholder('Comentar', { exact: true }).fill('Revisado no navegador');
  await card.getByRole('button', { name: 'Enviar' }).click();
  await expect(card.getByText('Revisado no navegador')).toBeVisible();
  await card.locator('select').selectOption('Concluido');
  await expect(page.locator('.board-list').last().getByText('Revisar a V1')).toBeVisible();
  await page.getByRole('button', { name: 'Nota', exact: true }).click();
  await page.getByPlaceholder('Nova linha do checklist').fill('Conferir antes de entregar');
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(page.locator('.note-line')).toContainText('Conferir antes de entregar');
  await expect.poll(async () => {
    const token = await page.evaluate(() => localStorage.getItem('devdesk_token'));
    const response = await page.request.get(`${apiURL}notas/`, { headers: { Authorization: `Bearer ${token}` } });
    return (await response.json())[0]?.itens?.length;
  }).toBe(1);
  await page.reload();
  await expect(page.locator('.note-line')).toContainText('Conferir antes de entregar');
  await expect(page.locator('.board-list').last().getByText('Revisar a V1')).toBeVisible();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nota', exact: true })).not.toBeVisible();
  expect(errors).toEqual([]);
});

test('gestor adiciona colaborador; colaborador comenta e conclui sem alterar projeto', async ({ page, request, browser }) => {
  const user = await seed(request);
  await loginWithTokens(page, user);
  const collaborator = `membro${suffix()}`;
  await request.post(`${apiURL}registro/`, { data: { username: collaborator, password } });
  await page.goto(`/workspaces/${user.workspace.id}`);
  await page.getByLabel('Usuario cadastrado').fill('conta-inexistente');
  await page.getByRole('button', { name: 'Adicionar colaborador' }).click();
  await expect(page.getByRole('alert')).toContainText('Conta nao encontrada.');
  await page.getByLabel('Usuario cadastrado').fill(collaborator);
  await page.getByRole('button', { name: 'Adicionar colaborador' }).click();
  await expect(page.getByText(`${collaborator} · Colaborador`)).toBeVisible();
  const context = await browser.newContext();
  const memberPage = await context.newPage();
  const tokens = await (await request.post(`${apiURL}token/`, { data: { username: collaborator, password } })).json();
  await loginWithTokens(memberPage, { username: collaborator, tokens });
  await memberPage.goto('/tarefas');
  const card = memberPage.locator('.board-card');
  await expect(card).toHaveCount(1);
  await expect(card.getByRole('button', { name: 'Editar', exact: true })).not.toBeVisible();
  await expect(memberPage.getByText('Crie um projeto para suas próprias tarefas')).toBeVisible();
  await card.getByPlaceholder('Comentar', { exact: true }).fill('Minha entrega');
  await card.getByRole('button', { name: 'Enviar' }).click();
  await expect(card.getByText('Minha entrega')).toBeVisible();
  await card.locator('select').selectOption('Concluido');
  await expect(memberPage.locator('.board-list').last().getByText('Tarefa de teste')).toBeVisible();
  await context.close();
});

test('sessao renova uma unica vez e encerra quando o refresh deixa de ser valido', async ({ page, request }) => {
  const user = await seed(request);
  await loginWithTokens(page, user);
  let refreshes = 0;
  page.on('request', request => { if (request.url().endsWith('/token/refresh/')) refreshes++; });
  await page.evaluate(() => localStorage.setItem('devdesk_token', 'access-invalido'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('devdesk_token'))).not.toBe('access-invalido');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(refreshes).toBe(1);
  await page.evaluate(() => {
    localStorage.setItem('devdesk_token', 'access-invalido');
    localStorage.setItem('devdesk_refresh_token', 'refresh-invalido');
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('devdesk_token'))).toBeNull();
});


test('nota avisa falha ao salvar, permite tentar novamente e cabe no celular', async ({ page, request }) => {
  const user = await seed(request);
  await loginWithTokens(page, user);
  await page.getByRole('button', { name: 'Nota', exact: true }).click();
  await expect(page.getByPlaceholder('Nova linha do checklist')).toBeVisible();
  const failSave = route => route.request().method() === 'PATCH'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Falha temporaria ao salvar' }) })
    : route.continue();
  await page.route('**/api/notas/*/', failSave);
  await page.getByPlaceholder('Nova linha do checklist').fill('Nao perder minha anotacao');
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Falha temporaria ao salvar');
  await page.unroute('**/api/notas/*/', failSave);
  await page.getByRole('button', { name: 'Tentar salvar novamente' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.note-line')).toContainText('Nao perder minha anotacao');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.floating-note')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.goto('/tarefas');
  await expect(page.locator('.board-card')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/quadro-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/quadro-desktop.png', fullPage: true });
});


test('conta nova cria primeira tarefa pelo dashboard sem descrição ou prazo', async ({ page }) => {
  await register(page, `iniciante${suffix()}`);
  await page.getByRole('link', { name: 'Criar minha primeira tarefa' }).click();
  await page.getByLabel('Nome do workspace', { exact: true }).fill('Meu espaço');
  await page.getByLabel('Nome do projeto', { exact: true }).fill('Minhas tarefas');
  await page.getByRole('button', { name: 'Salvar e criar tarefa' }).click();
  await page.getByPlaceholder('Titulo da tarefa').fill('Minha primeira tarefa');
  await page.getByRole('button', { name: 'Adicionar tarefa', exact: true }).click();
  await expect(page.locator('.board-card')).toContainText('Minha primeira tarefa');
  await expect(page.getByRole('status')).toContainText('Tarefa criada!');
  await page.reload();
  await expect(page.locator('.board-card')).toContainText('Minha primeira tarefa');
});

test('Nova tarefa prepara o projeto quando o quadro está vazio', async ({ page }) => {
  await register(page, `quadro${suffix()}`);
  await page.getByRole('link', { name: 'Desenvolvimento', exact: true }).click();
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click();
  await expect(page.getByLabel('Preparar projeto')).toBeVisible();
  await page.getByLabel('Nome do workspace', { exact: true }).fill('Pessoal');
  await page.getByLabel('Nome do projeto', { exact: true }).fill('Organização');
  await page.getByRole('button', { name: 'Salvar e criar tarefa' }).click();
  await page.getByPlaceholder('Titulo da tarefa').fill('Organizar a semana');
  await page.getByRole('button', { name: 'Adicionar tarefa', exact: true }).click();
  await expect(page.locator('.board-card')).toContainText('Organizar a semana');
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click();
  await expect(page.getByLabel('Projeto da tarefa')).toHaveValue(/\d+/);
  await page.getByPlaceholder('Titulo da tarefa').fill('Segunda tarefa');
  await page.getByRole('button', { name: 'Adicionar tarefa', exact: true }).click();
  await expect(page.locator('.board-card')).toHaveCount(2);
});
