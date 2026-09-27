import { openTools, startClassic, checkUpdates } from './helpers.ts';
import { test as base, expect, chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pwaBase } from '../scripts/pwa-config.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const basePath = pwaBase;
const dist = path.join(root, 'dist-pwa');
const manifest = JSON.parse(await readFile(path.join(dist, 'generated/lessons.json'), 'utf8'));
const samplePath: string = manifest.lessons[0].cards[0].imagePath;
const lastImage: string = manifest.lessons[1].cards.at(-1).imagePath;

interface Site {
  url: string;
  directory: string;
  fail: string | null;
  hold: string | null;
  held: Promise<void>;
  release: () => void;
}

const test = base.extend<{ site: Site }>({
  site: async ({}, use) => {
    let signalHeld: () => void = () => {};
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const site: Site = { url: '', directory: dist, fail: null, hold: null, held: new Promise<void>((resolve) => { signalHeld = resolve; }), release };
    const server = createServer(async (request, response) => {
      try {
        const pathname = new URL(request.url!, 'http://localhost').pathname;
        if (!pathname.startsWith(basePath)) { response.writeHead(404).end(); return; }
        const file = decodeURIComponent(pathname.slice(basePath.length)) || 'index.html';
        if (file.includes('..')) { response.writeHead(400).end(); return; }
        if (site.hold === file) { signalHeld(); await gate; }
        if (site.fail === file) { response.writeHead(503).end('test: interrupted download'); return; }
        const types: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
        response.writeHead(200, { 'Content-Type': `${types[path.extname(file)] ?? 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
        response.end(await readFile(path.join(site.directory, file)));
      } catch { if (!response.headersSent) response.writeHead(404); response.end(); }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as { port: number };
    site.url = `http://127.0.0.1:${address.port}${basePath}`;
    await use(site);
    release();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  },
});

async function ready(page: Page) {
  await expect(page.getByTestId('offline-state')).toHaveText('Gotowe do nauki offline');
}

async function importBackup(page: Page) {
  const image = `data:image/png;base64,${(await readFile(path.join(dist, samplePath))).toString('base64')}`;
  const backup = { format: 'fiszki-backup', version: 1, lessons: [{ name: 'Moja kopia z komputera', cards: [{ answer: 'Żółć...v2!', image }] }] };
  await page.getByTestId('backup-input').setInputFiles({ name: 'kopia.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('.menu-status')).toContainText('Zapisano lokalnie');
}

test('pierwsze pobranie czeka na wszystkie zasoby; ponowne otwarcie offline dekoduje także nieoglądane grafiki', async ({ page, context, site }, info) => {
  site.hold = lastImage;
  await page.goto(site.url);
  await expect(page.getByRole('radio')).toHaveCount(2);
  await site.held;
  await expect(page.getByTestId('offline-state')).not.toHaveText('Gotowe do nauki offline');
  site.release(); await ready(page);
  await page.screenshot({ path: info.outputPath('pwa-ready-mobile.png'), fullPage: true });
  const appManifest = await page.evaluate(async () => (await fetch(document.querySelector<HTMLLinkElement>('link[rel=manifest]')!.href)).json());
  expect(appManifest.id).toBe(basePath); expect(appManifest.start_url).toBe(basePath); expect(appManifest.scope).toBe(basePath);
  expect(appManifest.display).toBe('standalone');
  await context.setOffline(true);
  await page.close();
  const reopened = await context.newPage(); await reopened.goto(site.url); await ready(reopened);
  const decoded = await reopened.evaluate(async () => {
    const data = await (await fetch('./generated/lessons.json')).json();
    let count = 0;
    for (const lesson of data.lessons) for (const card of lesson.cards) {
      const image = new Image(); image.src = card.imagePath; await image.decode(); count++;
    }
    return count;
  });
  expect(decoded).toBe(354);
  await reopened.getByRole('radio').nth(1).check();
  await startClassic(reopened);
  await expect(reopened.getByTestId('counter')).toHaveText('1 / 220');
  await reopened.getByRole('button', { name: 'Pokaż odpowiedź' }).click();
  await expect(reopened.getByRole('button', { name: 'Pamiętam', exact: true })).toBeEnabled();
  expect(await reopened.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('nieudane pobranie nie zgłasza gotowości i można je ponowić', async ({ page, site }) => {
  site.fail = lastImage;
  await page.goto(site.url);
  await expect(page.getByRole('button', { name: 'Ponów pobieranie' })).toBeVisible();
  await expect(page.getByTestId('offline-state')).not.toHaveText('Gotowe do nauki offline');
  site.fail = null;
  await page.getByRole('button', { name: 'Ponów pobieranie' }).click();
  await ready(page);
});

test('utracony element cache jest wykrywany i naprawiany', async ({ page, site }) => {
  await page.goto(site.url); await ready(page);
  await page.evaluate(async (file) => {
    for (const name of await caches.keys()) if (name.startsWith('fiszki-pwa:')) await (await caches.open(name)).delete(new URL(file, location.href));
  }, lastImage);
  await checkUpdates(page);
  await expect(page.getByTestId('offline-state')).not.toHaveText('Gotowe do nauki offline');
  await page.getByRole('button', { name: 'Ponów pobieranie' }).click();
  await ready(page);
});

test('plik kopii na telefonie i nowa wersja: lekcja trwa do decyzji, importy przeżywają aktualizację', async ({ page, context, site }) => {
  await page.goto(site.url); await ready(page); await importBackup(page);
  const previousScript = await page.locator('script[type=module][src]').getAttribute('src');
  await page.getByRole('button', { name: 'Rozpocznij', exact: true }).click();
  await page.getByRole('button', { name: 'Pokaż odpowiedź' }).click();
  await page.getByRole('button', { name: 'Pamiętam', exact: true }).click();
  await expect(page.getByTestId('save-status')).toHaveText('Postępy zapisane lokalnie');
  await page.getByRole('button', { name: 'Pokaż odpowiedź' }).click();
  const updated = await mkdtemp(path.join(tmpdir(), 'fiszki-pwa-update-'));
  try {
    await promisify(execFile)(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'pwa', '--outDir', updated, '--emptyOutDir'], { cwd: root, env: { ...process.env, PWA_BUILD_ID: 'test-update-version' } });
    site.directory = updated;
    await checkUpdates(page);
    await expect(page.getByText('Dostępna nowa wersja', { exact: true })).toBeVisible();
    await expect(page.locator('#answer')).toHaveText('Żółć...v2!');
    await expect(page.getByTestId('box-2')).toHaveText('Szuflada 21');
    await page.getByRole('button', { name: 'Później', exact: true }).click();
    await expect(page.locator('#answer')).toHaveText('Żółć...v2!');
    await checkUpdates(page);
    await expect(page.getByText('Dostępna nowa wersja', { exact: true })).toBeVisible();
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Przeładuj i zaktualizuj' }).click()]);
    await ready(page);
    await expect(page.locator('.pwa-panel')).toHaveAttribute('data-build', 'test-update-version');
    await expect(page.getByRole('radio', { name: 'Moja kopia z komputera (import)', exact: true })).toBeVisible();
    await context.setOffline(true); await page.reload(); await ready(page);
    expect(await page.evaluate(async (url) => (await fetch(url!)).ok, previousScript)).toBe(true);
    await page.getByRole('radio', { name: 'Moja kopia z komputera (import)', exact: true }).check();
    await page.getByRole('button', { name: 'Wznów naukę' }).click();
    await expect(page.getByTestId('box-2')).toHaveText('Szuflada 21');
    await expect(page.locator('#answer')).toHaveText('Przypomnij sobie odpowiedź');
    for (let round = 0; round < 2; round++) {
      await page.getByRole('button', { name: 'Pokaż odpowiedź' }).click();
      await expect(page.locator('#answer')).toHaveText('Żółć...v2!');
      await page.getByRole('button', { name: 'Pamiętam', exact: true }).click();
    }
    await expect(page.getByText('Wszystkie fiszki zaliczone!', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Wróć do lekcji' }).click();
    const download = page.waitForEvent('download'); await openTools(page); await page.getByRole('button', { name: 'Eksportuj kopię lekcji' }).click();
    expect((await download).suggestedFilename()).toMatch(/^fiszki-kopia-.*\.json$/);
  } finally { await rm(updated, { recursive: true, force: true }); }
});

test('instrukcje instalacji są ukryte w trybie standalone; zoom pozostaje dostępny', async ({ page, site }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.goto(site.url); await ready(page);
  await expect(page.locator('.install-instructions')).toHaveCount(0);
  const viewport = await page.locator('meta[name=viewport]').getAttribute('content');
  expect(viewport).toContain('viewport-fit=cover');
  expect(viewport).not.toMatch(/user-scalable=no|maximum-scale=1/);
});

test('zapisane PWA uruchamia się offline po zamknięciu i ponownym uruchomieniu przeglądarki', async ({ site }) => {
  const profile = await mkdtemp(path.join(tmpdir(), 'fiszki-browser-profile-'));
  let context = await chromium.launchPersistentContext(profile, { channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  try {
    const page = await context.newPage(); await page.goto(site.url); await ready(page); await importBackup(page);
    await page.getByRole('button', { name: 'Rozpocznij', exact: true }).click();
    await page.getByRole('button', { name: 'Pokaż odpowiedź' }).click();
    await page.getByRole('button', { name: 'Pamiętam', exact: true }).click();
    await expect(page.getByTestId('save-status')).toHaveText('Postępy zapisane lokalnie');
    await context.close();
    context = await chromium.launchPersistentContext(profile, { channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
    await context.setOffline(true);
    const reopened = await context.newPage(); await reopened.goto(site.url); await ready(reopened);
    await expect(reopened.getByRole('radio')).toHaveCount(3);
    await reopened.getByRole('button', { name: 'Wznów naukę' }).click();
    await expect(reopened.getByTestId('box-2')).toHaveText('Szuflada 21');
    await expect(reopened.locator('#answer')).toHaveText('Przypomnij sobie odpowiedź');
  } finally { await context.close(); await rm(profile, { recursive: true, force: true }); }
});
