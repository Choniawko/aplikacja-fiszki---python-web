import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBackup, parseBackup } from '../src/data/backup.ts';
import { blobToDataUrl, dataUrlToBlob } from '../src/data/image-data.ts';
import { embeddedJson } from '../scripts/offline-materials.ts';
import type { StoredLesson } from '../src/data/import-lessons.ts';

const original: StoredLesson = { id: 'imported:Żółć', name: 'Żółć', cards: [{ id: 'one', answer: ' Łącze...v2! ', blob: new Blob([Uint8Array.from([0, 128, 255, 1, 2])], { type: 'image/png' }) }] };
const decode = async () => {};

test('kopia zapasowa przenosi dokładne odpowiedzi, nazwy i bajty obrazów', async () => {
  const text = await createBackup([original]);
  const restored = await parseBackup(text, decode);
  assert.equal(restored[0]!.name, original.name);
  assert.equal(restored[0]!.id, original.id);
  assert.equal(restored[0]!.cards[0]!.answer, original.cards[0]!.answer);
  assert.deepEqual(await restored[0]!.cards[0]!.blob.arrayBuffer(), await original.cards[0]!.blob.arrayBuffer());
  assert.equal(restored[0]!.cards[0]!.blob.type, 'image/png');
});

test('niepoprawny format, zduplikowane lekcje i uszkodzone obrazy odrzucają całą kopię', async () => {
  await assert.rejects(createBackup([]), /zaimportuj/);
  await assert.rejects(parseBackup('not json', decode), /odczytać kopii/);
  await assert.rejects(parseBackup('{"version":2}', decode), /format lub wersja/);
  const data = JSON.parse(await createBackup([original]));
  data.lessons.push(data.lessons[0]);
  await assert.rejects(parseBackup(JSON.stringify(data), decode), /powtórzoną lekcję/);
  data.lessons.pop();
  data.lessons[0].cards[0].image = 'https://example.com/image.png';
  await assert.rejects(parseBackup(JSON.stringify(data), decode), /Nieprawidłowa grafika/);
  await assert.rejects(parseBackup(await createBackup([original]), async () => { throw new Error('decode'); }), /uszkodzoną grafikę/);
});

test('konwersja obrazów obsługuje większe pliki i odrzuca SVG oraz obce URL', async () => {
  const bytes = new Uint8Array(100000).map((_, i) => i % 256);
  const data = await blobToDataUrl(new Blob([bytes], { type: 'image/webp' }));
  assert.deepEqual(new Uint8Array(await dataUrlToBlob(data).arrayBuffer()), bytes);
  for (const invalid of ['data:image/svg+xml;base64,PHN2Zz4=', 'file:///x.png', 'data:image/png;base64,notbase64!', 'data:image/png;base64,A']) {
    assert.throws(() => dataUrlToBlob(invalid), /Nieprawidłowa grafika/);
  }
});

test('osadzanie JSON w HTML zachowuje znaki bez możliwości zamknięcia skryptu', () => {
  const source = { name: '</script><img src=x>', answer: 'ąęć & "' };
  const embedded = embeddedJson(source);
  assert.equal(embedded.includes('<'), false);
  assert.deepEqual(JSON.parse(embedded), source);
});
