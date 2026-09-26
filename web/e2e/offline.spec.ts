import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { unzipSync } from 'fflate';

const root = fileURLToPath(new URL('../', import.meta.url));
const test = base.extend<{ offlineUrl: string; folder: string }>({
  offlineUrl: async ({}, use) => {
    const temp = await mkdtemp(path.join(tmpdir(), 'fiszki-plik-'));
    const archive = unzipSync(await readFile(path.join(root, 'fiszki-offline.zip')));
    expect(Object.keys(archive).sort()).toEqual(['INSTRUKCJA.txt', 'fiszki.html']);
    expect(Buffer.from(archive['fiszki.html']!)).toEqual(await readFile(path.join(root, 'dist-offline/fiszki.html')));
    const filename = path.join(temp, 'Fiszki przenośne ąę.html');
    await writeFile(filename, archive['fiszki.html']!);
    await use(pathToFileURL(filename).href);
    await rm(temp, { recursive: true, force: true });
  },
  folder: async ({}, use) => {
    const temp = await mkdtemp(path.join(tmpdir(), 'fiszki-import-'));
    const folder = path.join(temp, 'Moja lekcja');
    await mkdir(folder);
    const manifest = JSON.parse(await readFile(path.join(root, 'public/generated/lessons.json'), 'utf8'));
    const bytes = await readFile(path.join(root, 'public', manifest.lessons[0].cards[0].imagePath));
    await writeFile(path.join(folder, 'Żółć...v2!.PNG'), bytes);
    await writeFile(path.join(folder, 'Druga odpowiedź.png'), bytes);
    await use(folder);
    await rm(temp, { recursive: true, force: true });
  },
});

test.beforeEach(async ({ context, page }) => {
  await context.setOffline(true);
  await page.addInitScript(() => {
    (window as unknown as { fetchAttempts: string[] }).fetchAttempts = [];
    window.fetch = async (...args) => {
      (window as unknown as { fetchAttempts: string[] }).fetchAttempts.push(String(args[0]));
      throw new Error('Test offline zabrania fetch, także lokalnych plików.');
    };
  });
});

test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => (window as unknown as { fetchAttempts: string[] }).fetchAttempts)).toEqual([]);
});

async function reveal(page: Page) {
  const button = page.getByRole('button', { name: 'Pokaż odpowiedź' });
  await expect(button).toHaveAttribute('aria-disabled', 'false');
  await button.click();
  return page.locator('#answer').innerText();
}

test('samotny HTML file:// bez sieci: wszystkie grafiki i pełna nauka z kolejnymi powtórkami', async ({ page, offlineUrl }, info) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => { if (request.url() !== offlineUrl && !/^(data|blob):/.test(request.url())) requests.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(offlineUrl);
  await expect(page.getByRole('radio')).toHaveCount(2);
  const count = await page.evaluate(async () => {
    const data = JSON.parse(document.getElementById('embedded-lessons')!.textContent!);
    let count = 0;
    for (const lesson of data.lessons) for (const card of lesson.cards) {
      if (!card.imagePath.startsWith('data:image/')) throw new Error('Grafika nie jest osadzona.');
      const image = new Image(); image.src = card.imagePath; await image.decode(); count++;
    }
    return count;
  });
  expect(count).toBe(354);
  await page.getByRole('radio').nth(1).check();
  await page.getByRole('button', { name: 'Rozpocznij lekcję' }).click();
  await expect(page.getByTestId('counter')).toHaveText('1 / 220');
  await page.getByRole('button', { name: 'Powrót do listy lekcji' }).click();
  await page.getByRole('button', { name: 'Rozpocznij lekcję' }).click();
  const correct = page.getByRole('button', { name: 'Poprawna odpowiedź', exact: true });
  const wrong = page.getByRole('button', { name: 'Błędna odpowiedź' });
  const missed: string[] = [];
  await expect(correct).toBeDisabled();
  for (let i = 0; i < 134; i++) {
    const answer = await reveal(page);
    if (i < 2) { missed.push(answer); await wrong.click(); } else await correct.click();
  }
  await expect(page.getByText('Powtórka błędnych', { exact: true })).toBeVisible();
  await expect(page.getByTestId('counter')).toHaveText('1 / 2');
  const again = await reveal(page); expect(missed).toContain(again); await wrong.click();
  const second = await reveal(page); expect(missed).toContain(second); expect(second).not.toBe(again); await correct.click();
  await expect(page.getByTestId('counter')).toHaveText('1 / 1');
  expect(await reveal(page)).toBe(again); await wrong.click();
  expect(await reveal(page)).toBe(again); await correct.click();
  await expect(page.getByText('Wszystkie fiszki zaliczone!', { exact: true })).toBeVisible();
  await expect(page.getByTestId('counter')).toHaveCount(0);
  await expect(correct).toBeDisabled();
  await page.screenshot({ path: info.outputPath('file-offline-complete.png'), fullPage: true });
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('file:// bez IndexedDB: import sesyjny, eksport obrazów i odtworzenie kopii po utracie sesji', async ({ page, offlineUrl, folder }, info) => {
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { get() { throw new DOMException('denied', 'SecurityError'); } }));
  await page.goto(offlineUrl);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importuj folder lekcji' }).click();
  await (await chooser).setFiles(folder);
  await expect(page.getByRole('status')).toContainText('Dostępne tylko w bieżącej sesji');
  await expect(page.getByRole('status')).not.toContainText('Zapisano');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksportuj kopię lekcji' }).click();
  const backup = info.outputPath('kopia.json'); await (await download).saveAs(backup);
  const contents = JSON.parse(await readFile(backup, 'utf8'));
  expect(contents.lessons).toHaveLength(1);
  expect(contents.lessons[0].cards.map((card: { answer: string }) => card.answer).sort()).toEqual(['Druga odpowiedź', 'Żółć...v2!']);
  expect(contents.lessons[0].cards.every((card: { image: string }) => card.image.startsWith('data:image/png;base64,'))).toBe(true);
  await page.reload(); await expect(page.getByRole('radio')).toHaveCount(2);
  await page.getByTestId('backup-input').setInputFiles(backup);
  await expect(page.getByRole('status')).toContainText('Wczytano kopię zapasową');
  await expect(page.getByRole('radio')).toHaveCount(3);
  await page.getByRole('button', { name: 'Rozpocznij lekcję' }).click();
  const answers = [await reveal(page)];
  await page.getByRole('button', { name: 'Poprawna odpowiedź', exact: true }).click();
  answers.push(await reveal(page));
  expect(answers.sort()).toEqual(['Druga odpowiedź', 'Żółć...v2!']);
  await page.getByRole('button', { name: 'Poprawna odpowiedź', exact: true }).click();
  await expect(page.getByText('Wszystkie fiszki zaliczone!', { exact: true })).toBeVisible();
});

test('file:// dostępny IndexedDB zapisuje import, a brak miejsca pozostawia lekcję w sesji', async ({ page, offlineUrl, folder }) => {
  await page.goto(offlineUrl);
  let chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importuj folder lekcji' }).click(); await (await chooser).setFiles(folder);
  await expect(page.getByRole('status')).toContainText('Zapisano lokalnie');
  await page.reload(); await expect(page.getByRole('radio')).toHaveCount(3);
  await page.evaluate(() => { IDBObjectStore.prototype.put = () => { throw new DOMException('quota', 'QuotaExceededError'); }; });
  chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importuj folder lekcji' }).click(); await (await chooser).setFiles(folder);
  await expect(page.getByRole('status')).toContainText('Dostępne tylko w bieżącej sesji');
  await expect(page.getByRole('alert')).toContainText('Brakuje miejsca');
  await expect(page.getByRole('button', { name: 'Eksportuj kopię lekcji' })).toBeEnabled();
});
