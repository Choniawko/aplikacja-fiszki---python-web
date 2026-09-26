import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { loadImportedLessons, probeImportedStorage, saveImportedLesson, saveImportedLessons } from '../src/data/storage.ts';
import type { StoredLesson } from '../src/data/import-lessons.ts';

function lesson(name = 'Moja lekcja'): StoredLesson {
  return { id: `imported:${name}`, name, cards: [{ id: 'one', answer: 'Żółć...v2!', blob: new Blob(['bytes'], { type: 'image/png' }) }] };
}

test('IndexedDB zachowuje odpowiedzi i obrazy po zamknięciu oraz ponownym otwarciu', async () => {
  const factory = new IDBFactory();
  assert.deepEqual(await loadImportedLessons(factory), []);
  await saveImportedLesson(lesson(), factory);
  const restored = await loadImportedLessons(factory);
  assert.equal(restored[0]!.name, 'Moja lekcja');
  assert.equal(restored[0]!.cards[0]!.answer, 'Żółć...v2!');
  assert.equal(await restored[0]!.cards[0]!.blob.text(), 'bytes');
  assert.equal(restored[0]!.cards[0]!.blob.type, 'image/png');
});

test('ponowny import tej samej nazwy zastępuje lokalną lekcję bez duplikatów', async () => {
  const factory = new IDBFactory();
  await saveImportedLesson(lesson(), factory);
  await saveImportedLesson(lesson('Inna'), factory);
  await saveImportedLesson({ ...lesson(), cards: [{ ...lesson().cards[0]!, answer: 'Nowa odpowiedź' }] }, factory);
  const records = await loadImportedLessons(factory);
  assert.equal(records.length, 2);
  assert.equal(records.find((record) => record.name === 'Moja lekcja')!.cards[0]!.answer, 'Nowa odpowiedź');
});

test('błędy dostępu i uszkodzone zapisane dane są czytelne', async () => {
  await assert.rejects(loadImportedLessons(), /IndexedDB/);
  const denied = new IDBFactory();
  denied.open = () => { throw new DOMException('denied', 'SecurityError'); };
  await assert.rejects(loadImportedLessons(denied), /IndexedDB/);
  const factory = new IDBFactory();
  await saveImportedLesson({ ...lesson(), cards: [] }, factory);
  await assert.rejects(loadImportedLessons(factory), /uszkodzone dane/);
});

test('brak miejsca nie usuwa wcześniej zapisanej lekcji', async (context) => {
  const factory = new IDBFactory();
  await saveImportedLesson(lesson(), factory);
  const replacement = { ...lesson(), name: 'Zmiana' };
  const mock = context.mock.method(IDBObjectStore.prototype, 'put', () => { throw new DOMException('full', 'QuotaExceededError'); });
  await assert.rejects(saveImportedLesson(replacement, factory), /Brakuje miejsca/);
  mock.mock.restore();
  assert.equal((await loadImportedLessons(factory))[0]!.name, 'Moja lekcja');
});

test('zapis zakończony abortem transakcji nie zgłasza sukcesu', async (context) => {
  const factory = new IDBFactory();
  await saveImportedLesson(lesson(), factory);
  const original = IDBObjectStore.prototype.put;
  const mock = context.mock.method(IDBObjectStore.prototype, 'put', function (this: IDBObjectStore, value: unknown) {
    const request = original.call(this, value);
    this.transaction.abort();
    return request;
  });
  await assert.rejects(saveImportedLesson({ ...lesson(), name: 'Zmiana' }, factory), /lokalnych lekcji/);
  mock.mock.restore();
  assert.equal((await loadImportedLessons(factory))[0]!.name, 'Moja lekcja');
});

test('próba zapisu nie zostawia danych i wykrywa odmowę zapisu', async (context) => {
  const factory = new IDBFactory();
  await probeImportedStorage(factory);
  assert.deepEqual(await loadImportedLessons(factory), []);
  const mock = context.mock.method(IDBObjectStore.prototype, 'put', () => { throw new DOMException('denied', 'QuotaExceededError'); });
  await assert.rejects(probeImportedStorage(factory), /Brakuje miejsca/);
  mock.mock.restore();
});

test('błąd drugiego zapisu kopii wycofuje także pierwszy zapis', async (context) => {
  const factory = new IDBFactory();
  await saveImportedLesson(lesson(), factory);
  const originalPut = IDBObjectStore.prototype.put;
  let writes = 0;
  const mock = context.mock.method(IDBObjectStore.prototype, 'put', function (this: IDBObjectStore, value: unknown) {
    if (++writes === 2) throw new DOMException('full', 'QuotaExceededError');
    return originalPut.call(this, value);
  });
  await assert.rejects(saveImportedLessons([lesson('Nowa 1'), lesson('Nowa 2')], factory), /Brakuje miejsca/);
  mock.mock.restore();
  assert.deepEqual((await loadImportedLessons(factory)).map((record) => record.name), ['Moja lekcja']);
});
