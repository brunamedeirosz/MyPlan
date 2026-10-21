import { test, expect } from '@playwright/test';

test('demonstração permite editar, recarregar e restaurar sem chamar a API ou trocar a sessão real', async ({ page }) => {
  const apiRequests = [];
  page.on('request', request => { if (request.url().includes('/api/')) apiRequests.push(request.url()); });
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('devdesk_token', 'sessao-real-preservada'));
  await page.getByRole('link', { name: 'Experimentar demonstração' }).click();
  await expect(page.getByRole('complementary', { name: 'Modo de demonstração' })).toBeVisible();
  await expect(page.locator('.task-title').filter({ hasText: 'Planejar a semana com calma' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Nova tarefa', exact: true }).fill('Minha experiência no MyPlan');
  await page.getByRole('textbox', { name: 'Nova tarefa', exact: true }).press('Enter');
  await expect(page.locator('.task-title').filter({ hasText: 'Minha experiência no MyPlan' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.task-title').filter({ hasText: 'Minha experiência no MyPlan' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('devdesk_token'))).toBe('sessao-real-preservada');
  await page.getByRole('button', { name: 'Restaurar exemplo' }).click();
  await expect(page.locator('.task-title').filter({ hasText: 'Minha experiência no MyPlan' })).toHaveCount(0);
  expect(apiRequests).toEqual([]);
});

test('demonstração mantém recorrência e não duplica a próxima tarefa', async ({ page }) => {
  await page.goto('/?demo=1');
  await page.getByRole('button', { name: 'Concluir Fazer uma pausa para caminhar', exact: true }).click();
  await page.getByRole('button', { name: 'Todos os espaços', exact: true }).click();
  await expect(page.locator('.task-title').filter({ hasText: 'Fazer uma pausa para caminhar' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Reabrir na agenda: Fazer uma pausa para caminhar', exact: true }).click();
  await page.getByRole('button', { name: 'Hoje', exact: false }).first().click();
  await page.getByRole('button', { name: 'Concluir Fazer uma pausa para caminhar', exact: true }).click();
  await page.getByRole('button', { name: 'Todos os espaços', exact: true }).click();
  await expect(page.locator('.task-title').filter({ hasText: 'Fazer uma pausa para caminhar' })).toHaveCount(1);
});

test('portfolio: exemplo funciona em desktop e celular nos dois temas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?demo=1');
  await expect(page.locator('.task-title').filter({ hasText: 'Planejar a semana com calma' })).toBeVisible();
  await page.screenshot({ path: 'test-results/portfolio-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Ativar modo claro', exact: true }).click();
  await page.screenshot({ path: 'test-results/portfolio-light.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/portfolio-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Semana', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Visão semanal' })).toBeVisible();
  await page.getByRole('button', { name: 'Calendário', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Calendário', exact: true })).toBeVisible();
});
