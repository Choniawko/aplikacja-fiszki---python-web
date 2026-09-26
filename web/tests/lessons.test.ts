import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { answerFromFilename, compareNames, isImage } from '../src/domain/lessons.ts';
import { generateLessons } from '../scripts/generate-lessons.ts';

test('rozszerzenia, wielokropki, polskie znaki i interpunkcja są zachowane', () => {
  for (const ext of ['png', 'JPG', 'jpeg', 'BMP', 'GiF', 'WEBP']) assert.equal(isImage(`Łącze...v2.${ext}`), true);
  for (const name of ['a.svg', 'png', 'a.png.txt', 'a.PNG.bak']) assert.equal(isImage(name), false);
  assert.equal(answerFromFilename(' Żółć, łącze...v2!.PNG'), ' Żółć, łącze...v2!');
  assert.equal(answerFromFilename('.ukryty.png'), '.ukryty');
  assert.deepEqual(['beta', 'Alfa', 'alfa druga', 'Zebra'].sort(compareNames), ['Alfa', 'alfa druga', 'beta', 'Zebra']);
});

test('generator wykrywa foldery, kopiuje wszystkie formaty i odświeża manifest', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'fiszki-generator-'));
  try {
    const data = path.join(temporary, 'dane');
    const output = path.join(temporary, 'generated');
    await mkdir(path.join(data, 'beta', 'podfolder'), { recursive: true });
    await mkdir(path.join(data, 'Alfa'), { recursive: true });
    await mkdir(path.join(data, 'Pusta'), { recursive: true });
    const names = ['Żółć, łącze...v2!.PNG', 'a.JPG', 'b.jpeg', 'c.BMP', 'd.GIF', 'e.webp'];
    for (const name of names) await writeFile(path.join(data, 'beta', name), `bytes:${name}`);
    await writeFile(path.join(data, 'beta', 'podfolder', 'pomijany.png'), 'nested');
    await writeFile(path.join(data, 'beta', 'opis.txt'), 'not an image');
    const manifest = await generateLessons(data, output);
    assert.deepEqual(manifest.lessons.map((lesson) => lesson.name), ['Alfa', 'beta', 'Pusta']);
    assert.equal(manifest.lessons[0]!.cards.length, 0);
    assert.equal(manifest.lessons[1]!.cards.length, 6);
    assert.equal(manifest.dataDirectoryMissing, false);
    const card = manifest.lessons[1]!.cards.find((card) => card.answer === 'Żółć, łącze...v2!')!;
    assert.match(card.imagePath, /^generated\/images\/[a-f0-9]{64}\.png$/);
    assert.equal(await readFile(path.join(temporary, card.imagePath), 'utf8'), `bytes:${names[0]}`);
    assert.deepEqual(JSON.parse(await readFile(path.join(output, 'lessons.json'), 'utf8')), manifest);
    await rm(path.join(data, 'beta', names[0]!));
    await generateLessons(data, output);
    assert.equal((await readdir(path.join(output, 'images'))).length, 5);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('brak katalogu dane i pusty katalog są obsługiwane osobno', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'fiszki-empty-'));
  try {
    const data = path.join(temporary, 'dane');
    const output = path.join(temporary, 'generated');
    assert.deepEqual(await generateLessons(data, output), { dataDirectoryMissing: true, lessons: [] });
    await mkdir(data);
    assert.deepEqual(await generateLessons(data, output), { dataDirectoryMissing: false, lessons: [] });
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
