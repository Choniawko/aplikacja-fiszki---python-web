import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardToken, currentCard, sessionReducer, shuffle } from '../src/domain/session.ts';
import type { Session } from '../src/domain/session.ts';
import type { Lesson } from '../src/domain/lessons.ts';

const keepOrder = () => 0.999;
const lesson: Lesson = {
  id: 'test', name: 'Lekcja', source: 'bundled',
  cards: ['A', 'B', 'C'].map((id) => ({ id, answer: id, imageUrl: `${id}.png` })),
};
function start(source = lesson, id = 'session'): Session {
  return sessionReducer(null, { type: 'start', mode: 'classic', lesson: source, sessionId: id }, keepOrder)!;
}
function grade(state: Session, correct: boolean): Session {
  const token = cardToken(state);
  const revealed = sessionReducer(state, { type: 'reveal', token })!;
  return sessionReducer(revealed, { type: 'grade', token, correct }, keepOrder)!;
}

test('same poprawne odpowiedzi kończą pierwszą serię', () => {
  let state = start();
  for (let i = 0; i < 3; i++) {
    assert.equal(state.index, i);
    assert.equal(state.round, 1);
    state = grade(state, true);
  }
  assert.equal(state.status, 'completed');
  assert.equal(currentCard(state), undefined);
  assert.deepEqual(state.missed, []);
  assert.equal(state.revealed, false);
});

test('mieszane odpowiedzi powtarzają tylko błędne i czyszczą błędy na początku rundy', () => {
  let state = start();
  state = grade(state, false);
  state = grade(state, true);
  state = grade(state, false);
  assert.equal(state.round, 2);
  assert.equal(state.index, 0);
  assert.deepEqual(state.cards.map((card) => card.id), ['A', 'C']);
  assert.deepEqual(state.missed, []);
  state = grade(state, true);
  state = grade(state, false);
  assert.equal(state.round, 3);
  assert.deepEqual(state.cards.map((card) => card.id), ['C']);
  assert.deepEqual(state.missed, []);
  assert.equal(grade(state, true).status, 'completed');
});

test('jedna karta może wymagać dowolnej liczby kolejnych powtórek', () => {
  let state = start({ ...lesson, cards: [lesson.cards[0]!] });
  for (let round = 1; round <= 6; round++) {
    assert.equal(state.round, round);
    assert.equal(state.index, 0);
    assert.equal(state.cards.length, 1);
    state = grade(state, false);
    assert.deepEqual(state.missed, []);
  }
  assert.equal(grade(state, true).status, 'completed');
  assert.equal(grade(start({ ...lesson, cards: [lesson.cards[0]!] }), true).status, 'completed');
});

test('ukryta karta, podwójne kliknięcia i stare zdarzenia nie zmieniają kolejnej karty', () => {
  const state = start();
  const token = cardToken(state);
  assert.equal(sessionReducer(state, { type: 'grade', token, correct: false }), state);
  const revealed = sessionReducer(state, { type: 'reveal', token })!;
  assert.equal(sessionReducer(revealed, { type: 'reveal', token }), revealed);
  const next = sessionReducer(revealed, { type: 'grade', token, correct: false })!;
  assert.equal(next.index, 1);
  assert.equal(next.missed.length, 1);
  assert.equal(sessionReducer(next, { type: 'grade', token, correct: false }), next);
  assert.equal(sessionReducer(next, { type: 'reveal', token }), next);
  assert.equal(sessionReducer(next, { type: 'grade', token: cardToken(next), correct: true }), next);
});

test('stary token tej samej karty nie działa w nowej rundzie ani sesji', () => {
  const state = start({ ...lesson, cards: [lesson.cards[0]!] });
  const repeat = grade(state, false);
  assert.equal(sessionReducer(repeat, { type: 'reveal', token: cardToken(state) }), repeat);
  const reset = sessionReducer(repeat, { type: 'reset' });
  assert.equal(reset, null);
  const fresh = start(lesson, 'new-session');
  assert.equal(fresh.round, 1);
  assert.equal(fresh.index, 0);
  assert.equal(fresh.revealed, false);
  assert.deepEqual(fresh.missed, []);
  assert.equal(fresh.cards.length, 3);
  assert.equal(sessionReducer(fresh, { type: 'reveal', token: cardToken(state) }), fresh);
});

test('zakończona sesja blokuje odsłanianie i ocenę; pusta lekcja nie startuje', () => {
  const done = grade(start({ ...lesson, cards: [lesson.cards[0]!] }), true);
  assert.equal(sessionReducer(done, { type: 'reveal', token: cardToken(done) }), done);
  assert.equal(sessionReducer(done, { type: 'grade', token: cardToken(done), correct: false }), done);
  assert.equal(sessionReducer(done, { type: 'reset' }), null);
  assert.equal(sessionReducer(null, { type: 'reveal', token: 'missing' }), null);
  assert.equal(sessionReducer(null, { type: 'start', lesson: { ...lesson, cards: [] }, sessionId: 'empty' }), null);
});

test('tasowanie nie zmienia źródła i jest wykonywane także dla powtórek', () => {
  const original = ['A', 'B', 'C'];
  assert.deepEqual(shuffle(original, () => 0), ['B', 'C', 'A']);
  assert.deepEqual(original, ['A', 'B', 'C']);
  const state = { ...start(), index: 2, revealed: true, missed: [lesson.cards[0]!, lesson.cards[1]!] };
  const repeated = sessionReducer(state, { type: 'grade', token: cardToken(state), correct: false }, () => 0)!;
  assert.deepEqual(repeated.cards.map((card) => card.id), ['B', 'C', 'A']);
  assert.deepEqual(lesson.cards.map((card) => card.id), original);
});
