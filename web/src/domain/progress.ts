import type { Card, Lesson } from './lessons.ts';
import { batchSizes } from './session.ts';
import type { Session, LearningMode, BatchSize } from './session.ts';

export interface Progress {
  version: 1;
  key: string;
  lessonId: string;
  mode: LearningMode;
  updatedAt: number;
  cardSet: { id: string; signature: string }[];
  status: Session['status'];
  batchSize: BatchSize;
  batchNumber: number;
  batchIds: string[];
  queue: string[];
  boxes: Session['boxes'];
  completedIds: string[];
  classicIds: string[];
  missedIds: string[];
  index: number;
  round: number;
  turn: number;
  correctCount: number;
  wrongCount: number;
}
export const progressKey = (lessonId: string, mode: LearningMode) => `${mode}:${lessonId}`;
// A content fingerprint, not an image URL: portable across builds, file:// and blob URLs.
export function contentSignature(bytes: Uint8Array): string {
  let a = 2166136261, b = 5381;
  for (const byte of bytes) { a = Math.imul(a ^ byte, 16777619); b = Math.imul(b, 33) ^ byte; }
  return `${bytes.length}:${(a >>> 0).toString(16)}:${(b >>> 0).toString(16)}`;
}
const signature = (card: Card) => contentSignature(new TextEncoder().encode(`${card.answer}\u0000${card.revision ?? ''}`));
export function snapshot(session: Session, updatedAt = Date.now()): Progress {
  return {
    version: 1, key: progressKey(session.lessonId, session.mode), lessonId: session.lessonId, mode: session.mode, updatedAt,
    cardSet: session.allCards.map((card) => ({ id: card.id, signature: signature(card) })), status: session.status,
    batchSize: session.batchSize, batchNumber: session.batchNumber, batchIds: session.batchIds, queue: session.queue,
    boxes: session.boxes, completedIds: session.completedIds, classicIds: session.cards.map((card) => card.id),
    missedIds: session.missed.map((card) => card.id), index: session.index, round: session.round, turn: session.turn,
    correctCount: session.correctCount, wrongCount: session.wrongCount,
  };
}
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function ids(value: unknown): value is string[] { return Array.isArray(value) && value.every((id) => typeof id === 'string' && !!id) && new Set(value).size === value.length; }
export function isProgress(value: unknown): value is Progress {
  if (!object(value)) return false;
  const p = value as unknown as Progress;
  if (p.version !== 1 || typeof p.lessonId !== 'string' || !['boxes', 'classic'].includes(p.mode) || p.key !== progressKey(p.lessonId, p.mode) ||
      !['learning', 'batch-completed', 'completed'].includes(p.status) || !batchSizes.includes(p.batchSize) || !object(p.boxes) ||
      !Array.isArray(p.cardSet) || !p.cardSet.length || !p.cardSet.every((c) => object(c) && typeof c.id === 'string' && typeof c.signature === 'string') ||
      !ids(p.cardSet.map((c) => c.id))) return false;
  const known = new Set(p.cardSet.map((c) => c.id));
  for (const list of [p.batchIds, p.queue, p.completedIds, p.classicIds, p.missedIds]) if (!ids(list) || list.some((id) => !known.has(id))) return false;
  for (const number of [p.updatedAt, p.index, p.round, p.turn, p.correctCount, p.wrongCount, p.batchNumber]) if (!Number.isSafeInteger(number) || number < 0) return false;
  if (p.round < 1 || p.turn < p.correctCount + p.wrongCount) return false;
  const completed = new Set(p.completedIds);
  if (p.mode === 'boxes') {
    if (p.batchIds.length > p.batchSize || p.classicIds.length || p.missedIds.length || p.index !== 0) return false;
    if (p.queue.some((id) => !p.batchIds.includes(id) || completed.has(id) || ![1, 2, 3].includes(p.boxes[id]!))) return false;
    if (Object.keys(p.boxes).length !== p.queue.length || p.batchIds.some((id) => !completed.has(id) && !p.queue.includes(id))) return false;
    if ((p.status === 'learning') !== (p.queue.length > 0)) return false;
  } else {
    if (p.queue.length || p.batchIds.length || Object.keys(p.boxes).length || p.status === 'batch-completed' || p.index > p.classicIds.length) return false;
    if (p.status === 'learning' && p.index >= p.classicIds.length) return false;
    if (p.missedIds.some((id) => !p.classicIds.slice(0, p.index).includes(id) || completed.has(id))) return false;
    const pending = [...p.classicIds.slice(p.index), ...p.missedIds];
    if (pending.some((id) => completed.has(id)) || new Set([...pending, ...completed]).size !== known.size) return false;
  }
  return (p.status === 'completed') === (completed.size === known.size);
}

export function restoreProgress(progress: Progress, lesson: Lesson): { session: Session; changed: boolean } {
  const cards = new Map(lesson.cards.map((card) => [card.id, card]));
  const unchanged = new Set(progress.cardSet.filter((item) => cards.has(item.id) && signature(cards.get(item.id)!) === item.signature).map((item) => item.id));
  const changed = unchanged.size !== progress.cardSet.length || unchanged.size !== cards.size;
  const completedIds = progress.completedIds.filter((id) => unchanged.has(id));
  const completed = new Set(completedIds);
  // Keep the batch fixed. Removed cards leave it; changed cards restart in drawer 1.
  // New cards wait outside it until the user asks for the next batch.
  const batchIds = progress.batchIds.filter((id) => cards.has(id));
  const queue = progress.queue.filter((id) => cards.has(id));
  for (const id of batchIds) if (!completed.has(id) && !queue.includes(id)) queue.push(id);
  const boxes = Object.fromEntries(queue.map((id) => [id, unchanged.has(id) ? progress.boxes[id] ?? 1 : 1])) as Session['boxes'];
  let classicIds = progress.classicIds;
  let missedIds = progress.missedIds;
  let index = progress.index;
  if (changed && progress.mode === 'classic') {
    // Preserve the pending order, then append changed/new cards for this round.
    classicIds = [...new Set([...progress.classicIds.slice(progress.index), ...progress.missedIds, ...cards.keys()])]
      .filter((id) => cards.has(id) && !completed.has(id));
    missedIds = []; index = 0;
  }
  const allComplete = completed.size === cards.size;
  const status = allComplete ? 'completed' : progress.mode === 'boxes' && !queue.length ? 'batch-completed' : 'learning';
  return { changed, session: {
    id: 'restored', lessonId: lesson.id, lessonName: lesson.name, mode: progress.mode, status,
    allCards: [...cards.values()], cards: classicIds.map((id) => cards.get(id)!), missed: missedIds.map((id) => cards.get(id)!),
    index, round: progress.round, turn: progress.turn, revealed: false, batchSize: progress.batchSize,
    batchNumber: progress.batchNumber, batchIds, queue, boxes, completedIds,
    correctCount: progress.correctCount, wrongCount: progress.wrongCount, feedback: '',
  } };
}
