import assert from 'node:assert/strict';
import { test } from 'node:test';
import { materializeLesson, prepareImport, releaseLesson } from '../src/data/import-lessons.ts';

function file(relativePath: string, content = 'image'): File {
  const result = new File([content], relativePath.split('/').at(-1)!);
  Object.defineProperty(result, 'webkitRelativePath', { value: relativePath });
  return result;
}

test('import zachowuje nazwę folderu, odpowiedzi, bajty i rozpoznaje wszystkie formaty', async () => {
  let decoded = 0;
  const files = ['Żółć, łącze...v2!.PNG', 'b.JPG', 'c.JPEG', 'd.BMP', 'e.GIF', 'f.WebP'].map((name) => file(`Moja lekcja/${name}`));
  files.push(file('Moja lekcja/opis.txt'), file('Moja lekcja/podfolder/nested.png'));
  const lesson = await prepareImport(files, async () => { decoded++; });
  assert.equal(lesson.name, 'Moja lekcja');
  assert.equal(lesson.cards.length, 6);
  assert.equal(decoded, 6);
  const card = lesson.cards.find((card) => card.answer === 'Żółć, łącze...v2!')!;
  assert.equal(await card.blob.text(), 'image');
  assert.equal(card.blob.type, 'image/png');
  const live = materializeLesson(lesson);
  assert.equal(live.source, 'imported');
  assert.match(live.cards[0]!.imageUrl, /^blob:/);
  releaseLesson(live);
});

test('pusty folder, brak obrazów i nieobsługiwany wybór folderu zwracają komunikat', async () => {
  await assert.rejects(prepareImport([], async () => {}), /nie zawiera grafik/);
  await assert.rejects(prepareImport([file('Lekcja/notatki.txt')], async () => {}), /nie zawiera grafik/);
  await assert.rejects(prepareImport([file('Lekcja/nested/a.png')], async () => {}), /bezpośrednio/);
  await assert.rejects(prepareImport([new File(['image'], 'a.png')], async () => {}), /nie przekazała folderu/);
});

test('uszkodzony lub nieczytelny plik przerywa cały import', async () => {
  await assert.rejects(prepareImport([file('Lekcja/a.png', '')], async () => {}), /Nie udało się odczytać grafiki/);
  await assert.rejects(prepareImport([file('Lekcja/a.png')], async () => { throw new Error('decode'); }), /nie została zaimportowana/);
  const unreadable = file('Lekcja/nieczytelny.png');
  unreadable.arrayBuffer = async () => { throw new Error('read failed'); };
  await assert.rejects(prepareImport([unreadable], async () => {}), /nieczytelny.png/);
});
