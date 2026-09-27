import type { Lesson } from '../domain/lessons.ts';

export async function loadBundledLessons(): Promise<{ lessons: Lesson[]; dataDirectoryMissing: boolean }> {
  try {
    const embedded = document.getElementById('embedded-lessons');
    let manifest;
    if (embedded) {
      manifest = JSON.parse(embedded.textContent ?? '');
    } else {
      const response = await fetch(`${import.meta.env.BASE_URL}generated/lessons.json`);
      if (!response.ok) throw new Error('Manifest niedostępny.');
      manifest = await response.json();
    }
    if (!manifest || !Array.isArray(manifest.lessons)) throw new Error('Nieprawidłowy manifest.');
    const lessons: Lesson[] = manifest.lessons.map((lesson: {
      id: string; name: string; cards: { id: string; answer: string; imagePath: string; revision?: string }[];
    }) => ({
      id: lesson.id,
      name: lesson.name,
      source: 'bundled',
      cards: lesson.cards.map((card) => ({
        id: card.id,
        answer: card.answer,
        revision: card.revision,
        imageUrl: embedded ? card.imagePath : `${import.meta.env.BASE_URL}${card.imagePath}`,
      })),
    }));
    return { lessons, dataDirectoryMissing: Boolean(manifest.dataDirectoryMissing) };
  } catch {
    throw new Error('Nie udało się wczytać wbudowanych lekcji. Odśwież stronę lub ponownie pobierz kompletną aplikację. Możesz też zaimportować własny folder.');
  }
}
