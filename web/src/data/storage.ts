import { isProgress } from '../domain/progress.ts';
import type { Progress } from '../domain/progress.ts';
import { withRevisions } from './import-lessons.ts';
import type { StoredLesson } from './import-lessons.ts';

export const databaseName = 'fiszki-local-lessons';
const storeName = 'lessons';

function browserStorage(): IDBFactory | undefined {
  try { return globalThis.indexedDB; } catch { return undefined; }
}

function storageError(error: unknown): Error {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return new Error('Brakuje miejsca w pamięci przeglądarki. Wyeksportuj kopię danych i zwolnij miejsce.');
  }
  return new Error('Nie udało się odczytać lub zapisać lokalnych lekcji. Sprawdź, czy przeglądarka zezwala na IndexedDB i przechowywanie danych tej strony.');
}

async function openDatabase(factory: IDBFactory | undefined): Promise<IDBDatabase> {
  if (!factory) throw storageError(undefined);
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, 2);
    let blocked = false;
    const timeout = setTimeout(() => {
      blocked = true;
      reject(new Error('Przeglądarka nie udostępniła lokalnego zapisu w wymaganym czasie.'));
    }, 5000);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: 'id' });
      if (!db.objectStoreNames.contains('progress')) db.createObjectStore('progress', { keyPath: 'key' });
    };
    request.onerror = () => { clearTimeout(timeout); reject(storageError(request.error)); };
    request.onblocked = () => {
      blocked = true;
      clearTimeout(timeout);
      reject(new Error('Lokalna baza lekcji jest zablokowana. Zamknij inne karty tej aplikacji i odśwież stronę.'));
    };
    request.onsuccess = () => {
      clearTimeout(timeout);
      const db = request.result;
      db.onversionchange = () => db.close();
      if (blocked) db.close();
      else resolve(db);
    };
  });
}

async function transact<T>(
  factory: IDBFactory | undefined,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
  target = storeName,
): Promise<T> {
  let db: IDBDatabase | undefined;
  try {
    db = await openDatabase(factory);
    return await new Promise<T>((resolve, reject) => {
      const transaction = db!.transaction(target, mode);
      const timeout = setTimeout(() => transaction.abort(), 5000);
      let request: IDBRequest<T>;
      transaction.oncomplete = () => { clearTimeout(timeout); resolve(request.result); };
      transaction.onabort = () => { clearTimeout(timeout); reject(storageError(transaction.error)); };
      try {
        request = operation(transaction.objectStore(target));
      } catch (error) {
        clearTimeout(timeout);
        transaction.abort();
        reject(error);
      }
    });
  } catch (error) {
    if (error instanceof Error && !(error instanceof DOMException)) throw error;
    throw storageError(error);
  } finally {
    db?.close();
  }
}

function isStoredLesson(value: unknown): value is StoredLesson {
  if (!value || typeof value !== 'object') return false;
  const lesson = value as Partial<StoredLesson>;
  return typeof lesson.id === 'string' && lesson.id.startsWith('imported:') &&
    typeof lesson.name === 'string' && Array.isArray(lesson.cards) && lesson.cards.length > 0 &&
    lesson.cards.every((card: unknown) => {
      if (!card || typeof card !== 'object') return false;
      const item = card as Partial<StoredLesson['cards'][number]>;
      return typeof item.id === 'string' && typeof item.answer === 'string' && item.blob instanceof Blob && item.blob.size > 0;
    });
}

export async function loadImportedLessons(factory: IDBFactory | undefined = browserStorage()): Promise<StoredLesson[]> {
  const records: unknown[] = await transact(factory, 'readonly', (store) => store.getAll());
  if (!records.every(isStoredLesson)) {
    throw new Error('Zapisane lekcje zawierają uszkodzone dane. Zaimportuj ponownie ich foldery.');
  }
  return Promise.all(records.map(withRevisions));
}

export async function saveImportedLessons(lessons: readonly StoredLesson[], factory: IDBFactory | undefined = browserStorage()): Promise<void> {
  if (!lessons.length) return;
  await transact(factory, 'readwrite', (store) => {
    let request: IDBRequest<IDBValidKey>;
    for (const lesson of lessons) request = store.put(lesson);
    return request!;
  });
}

export async function saveImportedLesson(lesson: StoredLesson, factory: IDBFactory | undefined = browserStorage()): Promise<void> {
  await saveImportedLessons([lesson], factory);
}

export async function probeImportedStorage(factory: IDBFactory | undefined = browserStorage()): Promise<void> {
  await transact(factory, 'readwrite', (store) => {
    const key = '__fiszki_storage_probe__';
    store.put({ id: key, blob: new Blob(['probe']) });
    return store.delete(key);
  });
}

export async function loadProgress(factory: IDBFactory | undefined = browserStorage()): Promise<{ records: Progress[]; invalid: number }> {
  const values: unknown[] = await transact(factory, 'readonly', (store) => store.getAll(), 'progress');
  const records = values.filter(isProgress);
  return { records, invalid: values.length - records.length };
}

export async function saveProgress(progress: Progress, factory: IDBFactory | undefined = browserStorage()): Promise<void> {
  if (!isProgress(progress)) throw new Error('Nieprawidłowy zapis postępów.');
  await transact(factory, 'readwrite', (store) => store.put(progress), 'progress');
}

// Lessons and their progress must either both be committed or both be rolled back.
export async function saveBackupData(lessons: readonly StoredLesson[], progress: readonly Progress[], factory: IDBFactory | undefined = browserStorage()): Promise<void> {
  if (!progress.every(isProgress)) throw new Error('Nieprawidłowy zapis postępów.');
  const db = await openDatabase(factory);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([storeName, 'progress'], 'readwrite');
      const timeout = setTimeout(() => tx.abort(), 5000);
      tx.oncomplete = () => { clearTimeout(timeout); resolve(); };
      tx.onabort = () => { clearTimeout(timeout); reject(storageError(tx.error)); };
      try {
        for (const lesson of lessons) tx.objectStore(storeName).put(lesson);
        for (const record of progress) tx.objectStore('progress').put(record);
      } catch (error) { clearTimeout(timeout); tx.abort(); reject(storageError(error)); }
    });
  } finally { db.close(); }
}

export async function deleteLessonProgress(lessonId: string, factory: IDBFactory | undefined = browserStorage()): Promise<void> {
  await transact(factory, 'readwrite', (store) => {
    store.delete(`boxes:${lessonId}`);
    return store.delete(`classic:${lessonId}`);
  }, 'progress');
}
