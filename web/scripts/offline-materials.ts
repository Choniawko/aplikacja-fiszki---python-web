import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { extension, imageTypes } from '../src/domain/lessons.ts';
import type { Manifest } from './generate-lessons.ts';

export async function embedMaterials(publicDirectory: string): Promise<Manifest> {
  const manifest: Manifest = JSON.parse(await readFile(path.join(publicDirectory, 'generated/lessons.json'), 'utf8'));
  for (const lesson of manifest.lessons) {
    for (const card of lesson.cards) {
      const bytes = await readFile(path.join(publicDirectory, card.imagePath));
      const type = imageTypes[extension(card.imagePath)];
      if (!type) throw new Error(`Nieobsługiwany obraz: ${card.id}`);
      card.imagePath = `data:${type};base64,${bytes.toString('base64')}`;
    }
  }
  return manifest;
}

// This is HTML raw text, not an HTML attribute. Escaping '<' prevents a lesson
// or answer containing '</script>' from terminating the JSON script element.
export function embeddedJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}
