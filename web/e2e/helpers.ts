import type { Page } from '@playwright/test';

export async function openTools(page: Page) {
  const details = page.locator('details.tools');
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
}
export async function startClassic(page: Page) {
  await page.getByLabel('Tryb nauki', { exact: true }).selectOption('classic');
  await page.getByRole('button', { name: /^(Rozpocznij|Wznów naukę)$/ }).click();
}
export async function checkUpdates(page: Page) {
  const details = page.locator('.pwa-details');
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
  await page.getByRole('button', { name: 'Sprawdź aktualizacje' }).click();
}
export async function resetProgress(page: Page) {
  await openTools(page);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Wyzeruj postępy lekcji' }).click();
}
