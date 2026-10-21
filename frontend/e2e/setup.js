import { spawn, spawnSync, execFile } from 'node:child_process';
import { existsSync, mkdirSync, openSync, closeSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(frontend, '../backend');
const venv = resolve(backend, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
const python = process.env.PLAYWRIGHT_PYTHON || (existsSync(venv) ? venv : 'python');
const env = { ...process.env, DJANGO_SETTINGS_MODULE: 'config.e2e_settings', DJANGO_DEBUG: 'true', VITE_DEMO_ONLY: 'false', VITE_BASE_PATH: '/', VITE_API_URL: 'http://127.0.0.1:8001/api/' };

async function assertPortFree(port) {
  await new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error(`A porta ${port} já está em uso. Encerre o servidor de testes anterior.`)));
    probe.listen(port, '127.0.0.1', () => probe.close(resolvePort));
  });
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    // Limita a espera do taskkill: o encerramento antigo podia bloquear o Playwright.
    await new Promise(resolveStop => execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000 }, resolveStop));
  }
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  child.unref();
}

async function ready(url, child) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Servidor encerrou antes de iniciar (${url}). Veja test-results/*.log.`);
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch { /* Aguarda a inicialização. */ }
    await new Promise(resolveWait => setTimeout(resolveWait, 200));
  }
  throw new Error(`Servidor não iniciou: ${url}. Veja test-results/*.log.`);
}

export default async function setup() {
  await assertPortFree(8001);
  await assertPortFree(5175);
  mkdirSync(resolve(frontend, 'test-results'), { recursive: true });
  const migration = spawnSync(python, ['manage.py', 'migrate', '--noinput'], { cwd: backend, env, stdio: 'inherit', windowsHide: true, timeout: 60000 });
  if (migration.status !== 0) throw new Error('Falha ao preparar o banco isolado de testes.');
  const children = [];
  const launch = (command, args, cwd, name) => {
    const log = openSync(resolve(frontend, `test-results/${name}.log`), 'w');
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', log, log], windowsHide: true });
    closeSync(log);
    child.on('error', error => { console.error(`${name}: ${error.message}`); });
    children.push(child);
    return child;
  };
  const cleanup = async () => { await Promise.all(children.map(stop)); };
  try {
    const api = launch(python, ['manage.py', 'runserver', '127.0.0.1:8001', '--noreload'], backend, 'api');
    const web = launch(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5175', '--strictPort'], frontend, 'frontend');
    await Promise.all([ready('http://127.0.0.1:8001/api/health/', api), ready('http://127.0.0.1:5175', web)]);
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
}
