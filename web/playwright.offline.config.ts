import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: 'offline.spec.ts', outputDir: 'test-results-offline',
  timeout: 240000, expect: { timeout: 10000 }, workers: 1, fullyParallel: true,
  use: { browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || undefined, viewport: { width: 390, height: 844 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
