import { compareNames } from '../domain/lessons.ts';
import { verifyImage } from './import-lessons.ts';
import type { StoredLesson } from './import-lessons.ts';
import { blobToDataUrl, dataUrlToBlob } from './image-data.ts';

interface Backup {
  format: 'fiszki-backup';
  version: 1;
  lessons: { name: string; cards: { answer: string; image: string }[] }[];
}

export async function createBackup(lessons: readonly StoredLesson[]): Promise<string> {
  if (!lessons.length) throw new Error('Najpierw zaimportuj własną lekcję.');
  const backup: Backup = { format: 'fiszki-backup', version: 1, lessons: [] };
  for (const lesson of [...lessons].sort((a, b) => compareNames(a.name, b.name))) {
    const cards: Backup['lessons'][number]['cards'] = [];
    for (const card of lesson.cards) cards.push({ answer: card.answer, image: await blobToDataUrl(card.blob) });
    backup.lessons.push({ name: lesson.name, cards });
  }
  return JSON.stringify(backup, null, 2);
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function parseBackup(
  text: string,
  decode: (blob: Blob) => Promise<void> = verifyImage,
): Promise<StoredLesson[]> {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('Nie udało się odczytać kopii zapasowej. Wybierz plik JSON wyeksportowany z Fiszek.'); }
  if (!object(data) || data.format !== 'fiszki-backup' || data.version !== 1 || !Array.isArray(data.lessons) || !data.lessons.length) {
    throw new Error('Nieobsługiwany format lub wersja kopii zapasowej.');
  }
  const lessons: StoredLesson[] = [];
  const names = new Set<string>();
  // Validate the entire archive before changing either memory or IndexedDB.
  for (const item of data.lessons) {
    if (!object(item) || typeof item.name !== 'string' || !item.name.trim() || names.has(item.name) || !Array.isArray(item.cards) || !item.cards.length) {
      throw new Error('Kopia zapasowa zawiera nieprawidłową, pustą lub powtórzoną lekcję.');
    }
    names.add(item.name);
    const lesson: StoredLesson = { id: `imported:${item.name}`, name: item.name, cards: [] };
    for (const [index, card] of item.cards.entries()) {
      if (!object(card) || typeof card.answer !== 'string' || typeof card.image !== 'string') {
        throw new Error('Kopia zapasowa zawiera nieprawidłową fiszkę.');
      }
      const blob = dataUrlToBlob(card.image);
      try { await decode(blob); } catch { throw new Error(`Kopia zapasowa zawiera uszkodzoną grafikę w lekcji „${item.name}”.`); }
      lesson.cards.push({ id: `backup:${index}`, answer: card.answer, blob });
    }
    lessons.push(lesson);
  }
  return lessons;
}

export function downloadBackup(contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `fiszki-kopia-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
