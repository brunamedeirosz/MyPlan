import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const origin = process.env.SMOKE_URL || 'http://127.0.0.1:8000';
const headers = { 'X-Forwarded-Proto': 'https' };
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try { ready = (await fetch(`${origin}/api/health/`, { headers, signal: AbortSignal.timeout(1000) })).ok; } catch { /* Aguarda migrações. */ }
  if (ready) break;
  await new Promise(resolveWait => setTimeout(resolveWait, 1000));
}
assert.ok(ready, 'Imagem de produção não iniciou.');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ extraHTTPHeaders: headers });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/admin/login/`);
  assert.equal(await page.locator('input[name="username"]').count(), 1);
  const adminCss = await page.locator('link[rel="stylesheet"]').first().getAttribute('href');
  assert.ok((await page.request.get(new URL(adminCss, origin).href)).ok(), 'CSS do admin não foi coletado com o manifesto de produção.');
  await page.goto(origin);
  await page.getByRole('button', { name: 'Primeira vez? Crie sua conta' }).click();
  await page.getByLabel('Usuário', { exact: true }).fill(`smoke${Date.now()}`);
  await page.getByLabel('Senha', { exact: true }).fill('Smoke!MyPlanPortfolio42');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await page.getByRole('heading', { name: 'Hoje.' }).waitFor();
  await page.getByRole('textbox', { name: 'Nova tarefa', exact: true }).fill('Validar publicação');
  await page.getByRole('textbox', { name: 'Nova tarefa', exact: true }).press('Enter');
  await page.locator('.task-title').filter({ hasText: 'Validar publicação' }).waitFor();
  await page.reload();
  await page.locator('.task-title').filter({ hasText: 'Validar publicação' }).waitFor();
  assert.equal((await page.request.get(`${origin}/api/workspaces/`)).status(), 404);
  assert.deepEqual(errors, []);
  console.log('Produção: interface, cadastro, tarefa, persistência e legado desativado aprovados.');
} finally {
  await browser.close();
}
