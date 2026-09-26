import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDirectory = fileURLToPath(new URL('../../dane/Symbole elektryczne popularne/', import.meta.url));
const answers = [
  'Żółć, łącze...v2!',
  'Prosta odpowiedź',
  'Bardzo długa odpowiedź ze spacjami, polskimi znakami ąęć i interpunkcją... kolejna część nazwy',
];

const test = base.extend<{ lessonFolder: string }>({
  lessonFolder: async ({}, use) => {
    const temporary = await mkdtemp(path.join(tmpdir(), 'fiszki-browser-'));
    const folder = path.join(temporary, 'Moja lekcja');
    await mkdir(folder);
    const source = path.join(sourceDirectory, (await readdir(sourceDirectory)).find((file) => file.endsWith('.png'))!);
    for (const answer of answers) await copyFile(source, path.join(folder, `${answer}.PNG`));
    await writeFile(path.join(folder, 'notatki.txt'), 'Ten plik nie jest fiszką.');
    await use(folder);
    await rm(temporary, { recursive: true, force: true });
  },
});

async function importFolder(page: Page, folder: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importuj folder lekcji' }).click();
  await (await chooser).setFiles(folder);
}

async function reveal(page: Page): Promise<string> {
  const button = page.getByRole('button', { name: 'Pokaż odpowiedź' });
  await expect(button).toHaveAttribute('aria-disabled', 'false');
  await button.click();
  await expect(page.getByRole('button', { name: 'Poprawna odpowiedź', exact: true })).toBeEnabled();
  return (await page.locator('#answer').textContent())!;
}

test('lista oryginalnych lekcji, klawiatura i układ bez poziomego przewijania', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'FISZKI', exact: true })).toBeVisible();
  const radios = page.getByRole('radio');
  await expect(radios).toHaveCount(2);
  await expect(radios.nth(0)).toBeChecked();
  await expect(page.getByRole('status')).toContainText('Znaleziono lekcji: 2');
  await radios.nth(0).focus();
  await page.keyboard.press('ArrowDown');
  await expect(radios.nth(1)).toBeChecked();
  await page.keyboard.press('ArrowUp');
  await expect(radios.nth(0)).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('menu.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('pełna oryginalna lekcja, dwie powtórki błędnych, koniec i nowa sesja', async ({ page }, testInfo) => {
  const externalRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4174/')) externalRequests.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await page.getByRole('button', { name: 'Rozpocznij lekcję' }).click();
  const correct = page.getByRole('button', { name: 'Poprawna odpowiedź', exact: true });
  const wrong = page.getByRole('button', { name: 'Błędna odpowiedź' });
  await expect(correct).toBeDisabled();
  await expect(wrong).toBeDisabled();
  await expect(page.getByTestId('counter')).toHaveText('1 / 134');
  const image = page.getByRole('img');
  await expect(image).toHaveAttribute('alt', 'Symbol do rozpoznania');
  expect(await image.getAttribute('title')).toBeNull();
  await expect(page.getByRole('button', { name: 'Pokaż odpowiedź' })).toHaveAttribute('aria-disabled', 'false');
  const dimensions = await image.evaluate((img: HTMLImageElement) => ({ width: img.width, height: img.height, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight }));
  expect(dimensions.width).toBeLessThanOrEqual(500);
  expect(dimensions.height).toBeLessThanOrEqual(350);
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.naturalWidth);
  expect(Math.abs(dimensions.width / dimensions.height - dimensions.naturalWidth / dimensions.naturalHeight)).toBeLessThan(0.03);
  await page.screenshot({ path: testInfo.outputPath('study-hidden.png'), fullPage: true });

  const missed: string[] = [];
  for (let i = 0; i < 134; i++) {
    await expect(page.getByTestId('counter')).toHaveText(`${i + 1} / 134`);
    const answer = await reveal(page);
    if (i < 2) { missed.push(answer); await wrong.click(); }
    else await correct.click();
  }
  await expect(page.getByText('Powtórka błędnych', { exact: true })).toBeVisible();
  await expect(page.getByTestId('counter')).toHaveText('1 / 2');
  const repeated: string[] = [];
  for (let i = 0; i < 2; i++) {
    repeated.push(await reveal(page));
    if (i === 0) await wrong.click();
    else await correct.click();
  }
  expect(repeated.toSorted()).toEqual(missed.toSorted());
  await expect(page.getByTestId('counter')).toHaveText('1 / 1');
  expect(await reveal(page)).toBe(repeated[0]);
  await correct.click();
  await expect(page.getByText('Wszystkie fiszki zaliczone!', { exact: true })).toBeVisible();
  await expect(page.getByTestId('counter')).toHaveCount(0);
  await expect(correct).toBeDisabled();
  await expect(wrong).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('completed.png'), fullPage: true });
  await page.getByRole('button', { name: 'Powrót do listy lekcji' }).click();
  await page.getByRole('button', { name: 'Rozpocznij lekcję' }).click();
  await expect(page.getByText('Pierwsza seria', { exact: true })).toBeVisible();
  await expect(page.getByTestId('counter')).toHaveText('1 / 134');
  await expect(correct).toBeDisabled();
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('import folderu, odświeżenie IndexedDB, dokładne odpowiedzi i ponowny import', async ({ page, lessonFolder }, testInfo) => {
  await page.goto('./');
  await importFolder(page, lessonFolder);
  await expect(page.getByRole('status')).toContainText('Zapisano lokalnie lekcję „Moja lekcja”. Liczba fiszek: 3.');
  await expect(page.getByRole('radio', { name: 'Moja lekcja (import)', exact: true })).toBeChecked();
  await page.reload();
  await expect(page.getByRole('radio')).toHaveCount(3);
  await page.getByRole('radio', { name: 'Moja lekcja (import)', exact: true }).check();
  await page.getByRole('button', { name: 'Rozpocznij lekcję' }).click();
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    seen.push(await reveal(page));
    if (seen.at(-1) === answers[2]) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('long-answer.png'), fullPage: true });
    }
    await page.getByRole('button', { name: 'Poprawna odpowiedź', exact: true }).click();
  }
  expect(seen.toSorted()).toEqual(answers.toSorted());
  await expect(page.getByText('Wszystkie fiszki zaliczone!', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Powrót do listy lekcji' }).click();
  await importFolder(page, lessonFolder);
  await expect(page.getByRole('status')).toContainText('Zapisano lokalnie');
  await expect(page.getByRole('radio')).toHaveCount(3);
  await page.reload();
  await expect(page.getByRole('radio')).toHaveCount(3);
});

test('szybkie kliknięcia nie pomijają kart, klawiatura odkrywa odpowiedź, powrót resetuje', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Rozpocznij lekcję' }).click();
  const revealButton = page.getByRole('button', { name: 'Pokaż odpowiedź' });
  await expect(revealButton).toBeFocused();
  await page.keyboard.press('Enter');
  const correct = page.getByRole('button', { name: 'Poprawna odpowiedź', exact: true });
  await expect(correct).toBeEnabled();
  await correct.evaluate((element) => { (element as HTMLButtonElement).click(); (element as HTMLButtonElement).click(); });
  await expect(page.getByTestId('counter')).toHaveText('2 / 134');
  await expect(correct).toBeDisabled();
  await page.getByRole('button', { name: 'Powrót do listy lekcji' }).click();
  await page.getByRole('button', { name: 'Rozpocznij lekcję' }).click();
  await expect(page.getByTestId('counter')).toHaveText('1 / 134');
  await expect(correct).toBeDisabled();
});

test('przy braku lekcji i zaznaczenia pojawia się komunikat', async ({ page }) => {
  await page.route('**/generated/lessons.json', (route) => route.fulfill({ json: { dataDirectoryMissing: false, lessons: [] } }));
  await page.goto('./');
  await expect(page.getByText('Nie znaleziono żadnych lekcji.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Rozpocznij lekcję' }).click();
  await expect(page.getByRole('status')).toContainText('Najpierw wybierz lekcję.');
});

test('pusta lekcja i brak katalogu dane mają czytelne komunikaty', async ({ page }) => {
  await page.route('**/generated/lessons.json', (route) => route.fulfill({ json: { dataDirectoryMissing: true, lessons: [{ id: 'bundled:empty', name: 'Pusta lekcja', cards: [] }] } }));
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText("Nie znaleziono katalogu 'dane'.");
  await page.getByRole('button', { name: 'Rozpocznij lekcję' }).click();
  await expect(page.getByRole('status')).toContainText('Ta lekcja nie zawiera grafik.');
});

test('uszkodzony import nie nadpisuje wcześniej zapisanej lekcji', async ({ page, lessonFolder }) => {
  await page.goto('./');
  await importFolder(page, lessonFolder);
  await expect(page.getByRole('status')).toContainText('Zapisano lokalnie');
  await writeFile(path.join(lessonFolder, 'uszkodzony.png'), 'not an image');
  await importFolder(page, lessonFolder);
  await expect(page.getByRole('status')).toContainText('Nie udało się odczytać grafiki „uszkodzony.png”.');
  await page.reload();
  await page.getByRole('radio', { name: 'Moja lekcja (import)', exact: true }).check();
  await page.getByRole('button', { name: 'Rozpocznij lekcję' }).click();
  await expect(page.getByTestId('counter')).toHaveText('1 / 3');
});

test('niedostępny IndexedDB nie blokuje oryginalnych lekcji i zgłasza błąd zapisu', async ({ page, lessonFolder }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: undefined }));
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('IndexedDB');
  await importFolder(page, lessonFolder);
  await expect(page.getByRole('status')).toContainText('Nie udało się odczytać lub zapisać');
  await expect(page.getByRole('radio')).toHaveCount(2);
  await page.getByRole('button', { name: 'Rozpocznij lekcję' }).click();
  await expect(page.getByTestId('counter')).toHaveText('1 / 134');
});

test('nieobsługiwany wybór folderu i błąd grafiki nie pozwalają na ocenę', async ({ page }) => {
  await page.addInitScript(() => { Reflect.deleteProperty(HTMLInputElement.prototype, 'webkitdirectory'); });
  await page.goto('./');
  await page.getByRole('button', { name: 'Importuj folder lekcji' }).click();
  await expect(page.getByRole('alert')).toContainText('nie obsługuje wyboru folderu');
  await page.route('**/generated/images/**', (route) => route.abort());
  await page.getByRole('button', { name: 'Rozpocznij lekcję' }).click();
  await expect(page.getByRole('alert')).toContainText('Nie udało się wczytać grafiki.');
  await expect(page.getByRole('button', { name: 'Poprawna odpowiedź', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Powrót do listy lekcji' }).click();
  await expect(page.getByRole('heading', { name: 'FISZKI', exact: true })).toBeVisible();
});
