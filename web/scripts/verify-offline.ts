import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Manifest } from './generate-lessons.ts';

export function inspectOfflineHtml(html: string): Manifest {
  const match = /<script\b[^>]*\bid="embedded-lessons"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  assert.ok(match, 'Brak osadzonych lekcji w HTML.');
  const manifest: Manifest = JSON.parse(match[1]!);
  let javascript = 0;
  const markup = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_, attributes: string, code: string) => {
    assert.doesNotMatch(attributes, /\bsrc\s*=/i, 'HTML odwołuje się do zewnętrznego skryptu.');
    if (!attributes.includes('application/json')) {
      javascript++;
      assert.ok(code.length > 0, 'Pusty skrypt.');
    }
    return '';
  });
  assert.equal(javascript, 1, 'Aplikacja powinna zawierać jeden osadzony pakiet JavaScript.');
  assert.match(markup, /<style[\s>]/i, 'Brak osadzonego CSS.');
  assert.doesNotMatch(markup, /<(?:link|iframe|object|embed)\b|\b(?:src|srcset)\s*=/i, 'HTML wymaga osobnego zasobu.');
  assert.doesNotMatch(markup, /@import\b|url\(\s*["']?(?!data:)/i, 'CSS wymaga osobnego zasobu.');
  for (const lesson of manifest.lessons) {
    for (const card of lesson.cards) assert.match(card.imagePath, /^data:image\/(?:png|jpeg|bmp|gif|webp);base64,[A-Za-z0-9+/]+=*$/);
  }
  return manifest;
}

export async function verifyOffline(webRoot: string, filename = 'fiszki.html'): Promise<void> {
  const output = path.join(webRoot, 'dist-offline');
  assert.deepEqual(await readdir(output), [filename], 'Build offline powinien składać się wyłącznie z jednego HTML.');
  const manifest = inspectOfflineHtml(await readFile(path.join(output, filename), 'utf8'));
  const source: Manifest = JSON.parse(await readFile(path.join(webRoot, 'public/generated/lessons.json'), 'utf8'));
  assert.equal(manifest.lessons.length, source.lessons.length);
  let count = 0;
  for (const [index, lesson] of manifest.lessons.entries()) {
    const original = source.lessons[index]!;
    assert.equal(lesson.id, original.id);
    assert.equal(lesson.name, original.name);
    assert.equal(lesson.cards.length, original.cards.length);
    for (const [cardIndex, card] of lesson.cards.entries()) {
      const originalCard = original.cards[cardIndex]!;
      assert.equal(card.id, originalCard.id);
      assert.equal(card.answer, originalCard.answer);
      const bytes = Buffer.from(card.imagePath.split(',')[1]!, 'base64');
      assert.ok(bytes.equals(await readFile(path.join(webRoot, 'public', originalCard.imagePath))), `Zmienione bajty grafiki: ${card.id}`);
      count++;
    }
  }
  console.log(`Offline: ${manifest.lessons.length} lekcje, ${count} grafik osadzonych bez zmiany bajtów; JS i CSS wewnątrz jednego HTML.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await verifyOffline(fileURLToPath(new URL('../', import.meta.url)));
}
