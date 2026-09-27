import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sessionReducer, currentCard, cardToken } from '../src/domain/session.ts';
import type { Session } from '../src/domain/session.ts';
import type { Lesson } from '../src/domain/lessons.ts';
import { snapshot, restoreProgress, isProgress } from '../src/domain/progress.ts';
import { createBackup, parseBackupData } from '../src/data/backup.ts';
import { materializeLesson, withRevisions } from '../src/data/import-lessons.ts';

const order = () => 0.999;
const lesson = (count = 3): Lesson => ({ id: 'bundled:test', name: 'Test', source: 'bundled', cards: Array.from({ length: count }, (_, i) => ({ id: `${i}`, answer: `Odpowiedź ${i}`, imageUrl: `blob:temporary-${i}`, revision: 'original' })) });
const start = (source = lesson(), mode: 'boxes' | 'classic' = 'boxes') => sessionReducer(null, { type: 'start', lesson: source, mode, batchSize: 10, sessionId: 'start' }, order)!;
function grade(s: Session, correct = true) { const token = cardToken(s); return sessionReducer(sessionReducer(s, { type: 'reveal', token }), { type: 'grade', token, correct }, order)!; }

test('szuflady: kolejka FIFO, trzy awanse i zaliczenie dopiero przy trzeciej ocenie', () => {
  let s = start();
  const batch = [...s.batchIds];
  assert.deepEqual(s.queue, ['0', '1', '2']);
  s = grade(s); assert.deepEqual(s.queue, ['1', '2', '0']); assert.equal(s.boxes['0'], 2);
  for (let i = 0; i < 5; i++) s = grade(s);
  assert.deepEqual(s.completedIds, []); assert.equal(s.boxes['0'], 3);
  s = grade(s); assert.deepEqual(s.completedIds, ['0']); assert.deepEqual(s.queue, ['1', '2']);
  s = grade(grade(s));
  assert.equal(s.status, 'completed'); assert.deepEqual(s.queue, []); assert.deepEqual(s.batchIds, batch);
  assert.equal(s.correctCount, 9); assert.equal(s.wrongCount, 0);
  assert.equal(isProgress(snapshot(s)), true);
});

test('błąd w każdej szufladzie zeruje serię i odkłada kartę na koniec', () => {
  for (const box of [1, 2, 3]) {
    let s = start(lesson(1));
    for (let i = 1; i < box; i++) s = grade(s);
    s = grade(s, false);
    assert.equal(s.boxes['0'], 1); assert.equal(s.wrongCount, 1); assert.equal(s.revealed, false);
    for (let i = 0; i < 2; i++) { s = grade(s); assert.equal(s.status, 'learning'); }
    assert.equal(grade(s).status, 'completed');
  }
});

test('ostatnia karta wymaga oddzielnego odkrycia; stare zdarzenia i podwójne oceny nie przechodzą', () => {
  let s = start(lesson(1));
  const old = cardToken(s);
  assert.equal(sessionReducer(s, { type: 'grade', token: old, correct: true }), s);
  s = grade(s);
  for (const action of [ { type: 'grade', token: old, correct: true }, { type: 'reveal', token: old }, { type: 'grade', token: cardToken(s), correct: true } ] as const) assert.equal(sessionReducer(s, action), s);
  assert.equal(s.correctCount, 1); assert.equal(s.revealed, false);
  s = grade(grade(s));
  assert.equal(sessionReducer(s, { type: 'grade', token: cardToken(s), correct: true }), s);
});

test('stała partia bez duplikatów; pozostałe karty dopiero po Następna partia; mniejsza końcówka', () => {
  let s = start(lesson(13));
  const batch = [...s.batchIds];
  assert.equal(new Set(batch).size, 10);
  for (let i = 0; i < 30; i++) { s = grade(s); assert.deepEqual(s.batchIds, batch); }
  assert.equal(s.status, 'batch-completed'); assert.equal(s.completedIds.length, 10);
  const token = cardToken(s);
  s = sessionReducer(s, { type: 'next-batch', token }, order)!;
  assert.equal(s.batchIds.length, 3); assert.equal(s.batchNumber, 2);
  assert.equal(s.batchIds.some((id) => batch.includes(id)), false);
  assert.equal(sessionReducer(s, { type: 'next-batch', token }), s);
  for (let i = 0; i < 9; i++) s = grade(s);
  assert.equal(s.status, 'completed'); assert.equal(s.completedIds.length, 13);
  assert.equal(sessionReducer(s, { type: 'next-batch', token: cardToken(s) }), s);
});

test('losowanie nie dubluje kart i nie mutuje materiałów; domyślnie szuflady i 20 kart', () => {
  const source = lesson(51);
  source.cards.push(source.cards[0]!);
  const s = sessionReducer(null, { type: 'start', lesson: source, sessionId: 'random' }, () => 0)!;
  assert.equal(s.mode, 'boxes'); assert.equal(s.batchSize, 20); assert.equal(s.batchIds.length, 20);
  assert.equal(new Set(s.batchIds).size, 20); assert.notEqual(s.batchIds[0], '0');
  assert.equal(source.cards.length, 52); assert.equal(source.cards[0]!.id, '0');
});

test('migawka obu trybów wznawia kolejkę, liczniki i ukrywa odpowiedź bez blob URL', () => {
  for (const mode of ['boxes', 'classic'] as const) {
    let s = grade(grade(start(lesson(), mode)), false);
    s = sessionReducer(s, { type: 'reveal', token: cardToken(s) })!;
    const saved = snapshot(s);
    assert.equal(isProgress(saved), true); assert.equal(JSON.stringify(saved).includes('blob:'), false);
    const restored = restoreProgress(saved, { ...lesson(), cards: lesson().cards.map((c) => ({ ...c, imageUrl: 'new-build.png' })) });
    assert.equal(restored.changed, false); assert.equal(restored.session.revealed, false);
    assert.equal(currentCard(restored.session)?.id, currentCard(s)?.id);
    assert.deepEqual(snapshot(restored.session, saved.updatedAt), saved);
    const resumed = sessionReducer(null, { type: 'resume', session: restored.session, sessionId: 'new-session' })!;
    assert.equal(sessionReducer(resumed, { type: 'reveal', token: cardToken(s) }), resumed);
  }
});

test('zmiana zestawu: usuwa brakujące, resetuje zmienione, nowe czekają na następną partię', () => {
  let s = start();
  for (let i = 0; i < 7; i++) s = grade(s);
  const modified = lesson(4); modified.cards = modified.cards.filter((c) => c.id !== '1');
  modified.cards[0]!.revision = 'new-image';
  const restored = restoreProgress(snapshot(s), modified);
  assert.equal(restored.changed, true);
  assert.deepEqual(restored.session.completedIds, []);
  assert.deepEqual(restored.session.queue, ['2', '0']);
  assert.equal(restored.session.boxes['0'], 1); assert.equal(restored.session.boxes['2'], 3);
  assert.equal(restored.session.batchIds.includes('3'), false);
  assert.equal(isProgress(snapshot(restored.session)), true);
});

test('dodanie kart do ukończonej lekcji zachowuje zaliczone i umożliwia następną partię', () => {
  let s = start(lesson(1)); for (let i = 0; i < 3; i++) s = grade(s);
  const restored = restoreProgress(snapshot(s), lesson(2)).session;
  assert.equal(restored.status, 'batch-completed'); assert.deepEqual(restored.completedIds, ['0']);
  assert.equal(isProgress(snapshot(restored)), true);
});

test('nieprawidłowe postępy nie mogą pominąć kolejki ani zaliczyć obcych kart', () => {
  const p = snapshot(start());
  for (const bad of [{ ...p, queue: ['0', '0'] }, { ...p, queue: ['missing'] }, { ...p, boxes: {} }, { ...p, status: 'completed' }, { ...p, completedIds: ['other'] }, { ...p, correctCount: -1 }, { ...p, version: 99 }]) assert.equal(isProgress(bad), false);
});

test('kopia v2 przenosi stabilne id, postępy obu trybów i grafiki; v1 nadal działa', async () => {
  const stored = await withRevisions({ id: 'imported:Moja', name: 'Moja', cards: [{ id: 'Moja/Obraz.png', answer: 'Obraz', blob: new Blob(['bytes'], { type: 'image/png' }) }] });
  const live = materializeLesson(stored);
  const p = snapshot(grade(start(live)));
  const text = await createBackup([stored], [p]);
  const parsed = await parseBackupData(text, async () => {});
  assert.equal(parsed.lessons[0]!.cards[0]!.id, stored.cards[0]!.id);
  assert.equal(restoreProgress(parsed.progress[0]!, materializeLesson(parsed.lessons[0]!)).changed, false);
  assert.deepEqual(parsed.progress, [p]);
  const old = JSON.parse(text); old.version = 1; delete old.progress; delete old.lessons[0].cards[0].id;
  const legacy = await parseBackupData(JSON.stringify(old), async () => {});
  assert.equal(legacy.lessons[0]!.cards[0]!.id, 'backup:0'); assert.deepEqual(legacy.progress, []);
  const onlyProgress = await parseBackupData(await createBackup([], [snapshot(start())]), async () => {});
  assert.equal(onlyProgress.progress.length, 1); assert.deepEqual(onlyProgress.lessons, []);
  const bad = JSON.parse(text); bad.progress[0].queue = ['absent'];
  await assert.rejects(parseBackupData(JSON.stringify(bad), async () => {}), /postępy/);
});
