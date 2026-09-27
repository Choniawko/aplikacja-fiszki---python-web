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

test('migracja bazy v1 do v2 zachowuje własne grafiki i dodaje trwałe postępy', async () => {
  const factory = new IDBFactory();
  await new Promise<void>((resolve) => {
    const request = factory.open('fiszki-local-lessons', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('lessons', { keyPath: 'id' }).put(lesson()); };
    request.onsuccess = () => { request.result.close(); resolve(); };
  });
  const { loadProgress, saveProgress, deleteLessonProgress } = await import('../src/data/storage.ts');
  const { sessionReducer, cardToken } = await import('../src/domain/session.ts');
  const { snapshot, restoreProgress } = await import('../src/domain/progress.ts');
  const { materializeLesson } = await import('../src/data/import-lessons.ts');
  const stored = (await loadImportedLessons(factory))[0]!;
  assert.equal(await stored.cards[0]!.blob.text(), 'bytes');
  const live = materializeLesson(stored);
  let session = sessionReducer(null, { type: 'start', lesson: live, sessionId: 'test' })!;
  session = sessionReducer(session, { type: 'reveal', token: cardToken(session) })!;
  session = sessionReducer(session, { type: 'grade', token: cardToken(session), correct: true })!;
  await saveProgress(snapshot(session), factory);
  const saved = (await loadProgress(factory)).records[0]!;
  assert.equal(restoreProgress(saved, live).session.boxes.one, 2);
  await deleteLessonProgress(stored.id, factory);
  assert.equal((await loadProgress(factory)).records.length, 0);
  assert.equal(await (await loadImportedLessons(factory))[0]!.cards[0]!.blob.text(), 'bytes');
});

test('błąd zapisu postępów w kopii wycofuje też zastąpienie materiałów', async (context) => {
  const { saveBackupData, loadProgress } = await import('../src/data/storage.ts');
  const { snapshot } = await import('../src/domain/progress.ts');
  const { sessionReducer } = await import('../src/domain/session.ts');
  const factory = new IDBFactory();
  await saveImportedLesson(lesson(), factory);
  const p = snapshot(sessionReducer(null, { type: 'start', sessionId: 'test', lesson: { id: 'bundled:test', name: 'Test', source: 'bundled', cards: [{ id: 'a', answer: 'A', imageUrl: 'a.png' }] } })!);
  const original = IDBObjectStore.prototype.put;
  const mock = context.mock.method(IDBObjectStore.prototype, 'put', function (this: IDBObjectStore, value: unknown) {
    if (this.name === 'progress') throw new DOMException('full', 'QuotaExceededError');
    return original.call(this, value);
  });
  await assert.rejects(saveBackupData([{ ...lesson(), name: 'Podmieniona' }], [p], factory), /Brakuje miejsca/);
  mock.mock.restore();
  assert.equal((await loadImportedLessons(factory))[0]!.name, 'Moja lekcja');
  assert.deepEqual((await loadProgress(factory)).records, []);
});

test('uszkodzone postępy są pomijane bez utraty materiałów', async () => {
  const factory = new IDBFactory();
  await saveImportedLesson(lesson(), factory);
  await new Promise<void>((resolve) => {
    const open = factory.open('fiszki-local-lessons', 2);
    open.onsuccess = () => {
      const tx = open.result.transaction('progress', 'readwrite');
      tx.objectStore('progress').put({ key: 'broken', version: 999 });
      tx.oncomplete = () => { open.result.close(); resolve(); };
    };
  });
  const { loadProgress } = await import('../src/data/storage.ts');
  assert.deepEqual(await loadProgress(factory), { records: [], invalid: 1 });
  assert.equal((await loadImportedLessons(factory)).length, 1);
});
