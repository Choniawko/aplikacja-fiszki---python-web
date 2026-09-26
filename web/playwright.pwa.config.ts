import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: 'pwa.spec.ts', outputDir: 'test-results-pwa',
  timeout: 120000, expect: { timeout: 30000 }, workers: 2, fullyParallel: true,
  use: { browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || undefined, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
