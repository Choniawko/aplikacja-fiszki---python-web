import type { Card, Lesson } from './lessons.ts';

export type LearningMode = 'boxes' | 'classic';
export const batchSizes = [10, 20, 30, 50] as const;
export type BatchSize = typeof batchSizes[number];
export interface Session {
  id: string;
  lessonId: string;
  lessonName: string;
  mode: LearningMode;
  status: 'learning' | 'batch-completed' | 'completed';
  allCards: Card[];
  cards: Card[];
  missed: Card[];
  index: number;
  round: number;
  turn: number;
  revealed: boolean;
  batchSize: BatchSize;
  batchNumber: number;
  batchIds: string[];
  queue: string[];
  boxes: Record<string, 1 | 2 | 3>;
  completedIds: string[];
  correctCount: number;
  wrongCount: number;
  feedback: string;
}
export type SessionAction =
  | { type: 'start'; lesson: Lesson; sessionId: string; mode?: LearningMode; batchSize?: BatchSize }
  | { type: 'resume'; session: Session; sessionId: string }
  | { type: 'next-batch'; token: string }
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
export function cardToken(session: Session): string { return `${session.id}:${session.turn}`; }
export function currentCard(session: Session): Card | undefined {
  if (session.status !== 'learning') return undefined;
  return session.mode === 'boxes' ? session.allCards.find((card) => card.id === session.queue[0]) : session.cards[session.index];
}
function nextBatch(state: Session, random: () => number): Session {
  const completed = new Set(state.completedIds);
  const batchIds = shuffle(state.allCards.filter((card) => !completed.has(card.id)), random).slice(0, state.batchSize).map((card) => card.id);
  return { ...state, batchIds, queue: batchIds, boxes: Object.fromEntries(batchIds.map((id) => [id, 1])),
    status: batchIds.length ? 'learning' : 'completed', revealed: false, feedback: '', batchNumber: state.batchNumber + 1 };
}
export function sessionReducer(state: Session | null, action: SessionAction, random = Math.random): Session | null {
  if (action.type === 'reset') return null;
  if (action.type === 'resume') return { ...action.session, id: action.sessionId, revealed: false, feedback: '' };
  if (action.type === 'start') {
    const allCards = [...new Map(action.lesson.cards.map((card) => [card.id, card])).values()];
    if (!allCards.length) return state;
    const next: Session = {
      id: action.sessionId, lessonId: action.lesson.id, lessonName: action.lesson.name,
      mode: action.mode ?? 'boxes', status: 'learning', allCards, cards: [], missed: [], index: 0, round: 1,
      turn: 0, revealed: false, batchSize: action.batchSize ?? 20, batchNumber: 0,
      batchIds: [], queue: [], boxes: {}, completedIds: [], correctCount: 0, wrongCount: 0, feedback: '',
    };
    return next.mode === 'boxes' ? nextBatch(next, random) : { ...next, cards: shuffle(allCards, random) };
  }
  // A token identifies one presentation, including repetitions of the last card.
  if (!state || action.token !== cardToken(state)) return state;
  if (action.type === 'next-batch') {
    return state.mode === 'boxes' && state.status === 'batch-completed' ? nextBatch({ ...state, turn: state.turn + 1 }, random) : state;
  }
  if (state.status !== 'learning') return state;
  if (action.type === 'reveal') return state.revealed ? state : { ...state, revealed: true };
  if (!state.revealed) return state;
  const card = currentCard(state)!;
  const next = { ...state, revealed: false, turn: state.turn + 1,
    correctCount: state.correctCount + Number(action.correct), wrongCount: state.wrongCount + Number(!action.correct) };
  if (state.mode === 'boxes') {
    const box = state.boxes[card.id]!;
    const mastered = action.correct && box === 3;
    const boxes = { ...state.boxes };
    if (mastered) delete boxes[card.id];
    else Object.defineProperty(boxes, card.id, { value: action.correct ? box + 1 : 1, enumerable: true, configurable: true, writable: true });
    const queue = mastered ? state.queue.slice(1) : [...state.queue.slice(1), card.id];
    const completedIds = mastered ? [...state.completedIds, card.id] : state.completedIds;
    return { ...next, boxes, queue, completedIds,
      feedback: mastered ? 'Karta zaliczona' : action.correct ? `Szuflada ${box + 1}` : 'Wraca do szuflady 1',
      status: queue.length ? 'learning' : completedIds.length === state.allCards.length ? 'completed' : 'batch-completed' };
  }
  const missed = action.correct ? state.missed : [...state.missed, card];
  const completedIds = action.correct ? [...state.completedIds, card.id] : state.completedIds;
  const classic = { ...next, completedIds, feedback: action.correct ? 'Karta zaliczona' : 'Wróci w powtórce' };
  if (state.index + 1 < state.cards.length) return { ...classic, index: state.index + 1, missed };
  if (missed.length) return { ...classic, cards: shuffle(missed, random), missed: [], index: 0, round: state.round + 1 };
  return { ...classic, status: 'completed', index: state.cards.length, missed: [] };
}
