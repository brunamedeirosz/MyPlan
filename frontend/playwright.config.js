import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'personal.spec.js',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5175', timezoneId: 'America/Sao_Paulo', trace: 'retain-on-failure' },
  webServer: [
    {
      command: '..\\backend\\.venv\\Scripts\\python.exe ..\\backend\\manage.py migrate --settings=config.e2e_settings && ..\\backend\\.venv\\Scripts\\python.exe ..\\backend\\manage.py runserver 127.0.0.1:8001 --noreload --settings=config.e2e_settings',
      url: 'http://127.0.0.1:8001/admin/login/', reuseExistingServer: false,
    },
    { env: { VITE_API_URL: 'http://127.0.0.1:8001/api/' }, command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort', url: 'http://127.0.0.1:5175', reuseExistingServer: false },
  ],
});
