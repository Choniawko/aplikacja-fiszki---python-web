import type { Card, Lesson } from './lessons.ts';

export interface Session {
  id: string;
  lessonName: string;
  status: 'learning' | 'completed';
  cards: Card[];
  missed: Card[];
  index: number;
  round: number;
  turn: number;
  revealed: boolean;
}

export type SessionAction =
  | { type: 'start'; lesson: Lesson; sessionId: string }
  | { type: 'reveal'; token: string }
  | { type: 'grade'; token: string; correct: boolean }
  | { type: 'reset' };

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function cardToken(session: Session): string {
  return `${session.id}:${session.turn}`;
}

export function currentCard(session: Session): Card | undefined {
  return session.status === 'learning' ? session.cards[session.index] : undefined;
}

export function sessionReducer(
  state: Session | null,
  action: SessionAction,
  random = Math.random,
): Session | null {
  if (action.type === 'reset') return null;
  if (action.type === 'start') {
    if (!action.lesson.cards.length) return state;
    return {
      id: action.sessionId,
      lessonName: action.lesson.name,
      status: 'learning',
      cards: shuffle(action.lesson.cards, random),
      missed: [],
      index: 0,
      round: 1,
      turn: 0,
      revealed: false,
    };
  }

  // A token identifies a particular presentation, even in later repeat rounds.
  // Old and repeated events cannot reveal or grade a different card.
  if (!state || state.status !== 'learning' || action.token !== cardToken(state)) {
    return state;
  }
  if (action.type === 'reveal') {
    return state.revealed ? state : { ...state, revealed: true };
  }
  if (!state.revealed) return state;

  const card = currentCard(state)!;
  const missed = action.correct ? state.missed : [...state.missed, card];
  const next = { ...state, revealed: false, turn: state.turn + 1 };
  if (state.index + 1 < state.cards.length) {
    return { ...next, index: state.index + 1, missed };
  }
  if (missed.length) {
    return {
      ...next,
      cards: shuffle(missed, random),
      missed: [],
      index: 0,
      round: state.round + 1,
    };
  }
  return { ...next, status: 'completed', index: state.cards.length, missed: [] };
}
