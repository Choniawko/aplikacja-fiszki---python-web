import { answerFromFilename, compareNames, extension, imageTypes, isImage } from '../domain/lessons.ts';
import type { Lesson } from '../domain/lessons.ts';

export interface StoredLesson {
  id: string;
  name: string;
  cards: { id: string; answer: string; blob: Blob }[];
}

export function supportsDirectoryPicker(): boolean {
  return 'webkitdirectory' in document.createElement('input');
}

export async function verifyImage(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      const timeout = window.setTimeout(() => reject(new Error('Przekroczono czas odczytu grafiki.')), 15000);
      image.onload = () => { window.clearTimeout(timeout); resolve(); };
      image.onerror = () => { window.clearTimeout(timeout); reject(new Error('Nieprawidłowy obraz.')); };
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareImport(
  files: readonly File[],
  decode: (blob: Blob) => Promise<void> = verifyImage,
): Promise<StoredLesson> {
  if (!files.length) throw new Error('Wybrany folder nie zawiera grafik.');
  const folder = files[0]!.webkitRelativePath?.split('/')[0];
  if (!folder || files.some((file) => !file.webkitRelativePath?.includes('/') || file.webkitRelativePath.split('/')[0] !== folder)) {
    throw new Error('Ta przeglądarka nie przekazała folderu lekcji. Użyj przeglądarki obsługującej wybór folderów.');
  }
  // As in Python, only files directly inside a lesson are cards.
  const images = files.filter((file) => file.webkitRelativePath.split('/').length === 2 && isImage(file.name));
  if (!images.length) throw new Error('Ta lekcja nie zawiera grafik. Umieść obrazy bezpośrednio w wybranym folderze.');

  const lesson: StoredLesson = { id: `imported:${folder}`, name: folder, cards: [] };
  for (const file of images.sort((a, b) => compareNames(a.name, b.name))) {
    try {
      const bytes = await file.arrayBuffer();
      const blob = new Blob([bytes], { type: imageTypes[extension(file.name)] });
      if (!blob.size) throw new Error('Pusty plik.');
      await decode(blob);
      lesson.cards.push({ id: file.webkitRelativePath, answer: answerFromFilename(file.name), blob });
    } catch {
      throw new Error(`Nie udało się odczytać grafiki „${file.name}”. Sprawdź plik i spróbuj ponownie. Lekcja nie została zaimportowana.`);
    }
  }
  return lesson;
}

export function materializeLesson(stored: StoredLesson): Lesson {
  const cards: Lesson['cards'] = [];
  try {
    for (const card of stored.cards) {
      cards.push({ id: card.id, answer: card.answer, imageUrl: URL.createObjectURL(card.blob) });
    }
  } catch (error) {
    for (const card of cards) URL.revokeObjectURL(card.imageUrl);
    throw error;
  }
  return { id: stored.id, name: stored.name, source: 'imported', cards };
}

export function releaseLesson(lesson: Lesson): void {
  if (lesson.source === 'imported') {
    for (const card of lesson.cards) URL.revokeObjectURL(card.imageUrl);
  }
}
