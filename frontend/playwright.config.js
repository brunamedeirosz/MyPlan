import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['personal.spec.js', 'demo.spec.js'],
  globalSetup: './e2e/setup.js',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5175', timezoneId: 'America/Sao_Paulo', trace: 'retain-on-failure' },
});
