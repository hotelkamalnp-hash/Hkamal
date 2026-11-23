import fs from 'node:fs';
import { defineConfig } from '@playwright/test';

const preinstalledHeadlessShell = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100',
    headless: true,
    viewport: { width: 1280, height: 800 },
    ...(fs.existsSync(preinstalledHeadlessShell)
      ? { launchOptions: { executablePath: preinstalledHeadlessShell } }
      : {}),
  },
  webServer: {
    command:
      'NODE_ENV=production KAMAL_DB_PATH=/tmp/kamal-playwright-e2e.db ALLOW_LOCAL_DEV_AUTH=true PORT=3100 npx tsx server.ts',
    url: 'http://127.0.0.1:3100/api/health/ready',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
