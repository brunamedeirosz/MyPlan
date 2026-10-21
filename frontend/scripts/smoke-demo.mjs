import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.VITE_BASE_PATH || '/';
const origin = `http://127.0.0.1:5176${base}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5176', '--strictPort'], { cwd: frontend, stdio: 'ignore', windowsHide: true });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    if (server.exitCode !== null) throw new Error('Não foi possível iniciar o preview na porta 5176.');
    try { ready = (await fetch(origin, { signal: AbortSignal.timeout(500) })).ok; } catch { /* Aguarda o preview. */ }
    if (ready) break;
    await new Promise(resolveWait => setTimeout(resolveWait, 200));
  }
  assert.ok(ready, 'O preview da demo não iniciou.');
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/Sao_Paulo' });
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()); });
  await page.goto(origin);
  await page.getByRole('complementary', { name: 'Modo de demonstração' }).waitFor();
  await page.locator('.task-title').filter({ hasText: 'Planejar a semana com calma' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => document.fonts.check('14px Inter')), 'A fonte local não carregou no caminho de publicação.');
  if (process.argv.includes('--screenshots')) {
    const images = resolve(frontend, '../docs/images');
    mkdirSync(images, { recursive: true });
    await page.screenshot({ path: resolve(images, 'desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Ativar modo claro', exact: true }).click();
    await page.screenshot({ path: resolve(images, 'light.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: resolve(images, 'mobile.png'), fullPage: true });
  }
  await page.getByRole('textbox', { name: 'Nova tarefa', exact: true }).fill('Testar o build publicado');
  await page.getByRole('textbox', { name: 'Nova tarefa', exact: true }).press('Enter');
  await page.locator('.task-title').filter({ hasText: 'Testar o build publicado' }).waitFor();
  await page.reload();
  await page.locator('.task-title').filter({ hasText: 'Testar o build publicado' }).waitFor();
  assert.deepEqual(requests, [], 'A demo estática não deve consultar a API.');
  assert.deepEqual(errors, []);
  console.log(`Demo compilada: caminho ${base}, fonte local, edição e persistência aprovados.`);
} finally {
  await browser?.close();
  server.kill();
  server.unref();
}
