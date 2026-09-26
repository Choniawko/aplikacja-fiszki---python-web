import { useEffect, useReducer, useRef, useState } from 'react';
import { LessonMenu } from './components/LessonMenu.tsx';
import { StudyView } from './components/StudyView.tsx';
import { loadBundledLessons } from './data/bundled-lessons.ts';
import { materializeLesson, prepareImport, releaseLesson } from './data/import-lessons.ts';
import type { StoredLesson } from './data/import-lessons.ts';
import { createBackup, downloadBackup, parseBackup } from './data/backup.ts';
import { loadImportedLessons, probeImportedStorage, saveImportedLessons } from './data/storage.ts';
import { sortLessons } from './domain/lessons.ts';
import type { Lesson } from './domain/lessons.ts';
import { sessionReducer } from './domain/session.ts';
import type { Session, SessionAction } from './domain/session.ts';
import { PwaPanel } from './pwa/PwaPanel.tsx';

const reduceSession = (state: Session | null, action: SessionAction) => sessionReducer(state, action);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Nie udało się wczytać lekcji. Spróbuj ponownie.';
}

export default function App() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const importedResources = useRef<Lesson[]>([]);
  const storedImports = useRef(new Map<string, StoredLesson>());
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const importLock = useRef(false);
  const sessionSequence = useRef(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [session, dispatch] = useReducer(reduceSession, null);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([loadBundledLessons(), loadImportedLessons(), probeImportedStorage()]).then(([bundled, imported, storage]) => {
      if (cancelled) return;
      const available: Lesson[] = [];
      const problems: string[] = [];
      if (bundled.status === 'fulfilled') {
        available.push(...bundled.value.lessons);
        if (bundled.value.dataDirectoryMissing) problems.push("Nie znaleziono katalogu 'dane'. Możesz zaimportować własny folder.");
      } else problems.push(errorMessage(bundled.reason));
      if (imported.status === 'fulfilled') {
        for (const stored of imported.value) {
          try {
            const lesson = materializeLesson(stored);
            importedResources.current.push(lesson);
            storedImports.current.set(stored.id, stored);
            available.push(lesson);
          } catch {
            problems.push(`Nie udało się odtworzyć lekcji „${stored.name}”. Zaimportuj jej folder ponownie.`);
          }
        }
      } else problems.push(errorMessage(imported.reason));
      if (storage.status === 'rejected') setStorageWarning(`${errorMessage(storage.reason)} Nowe importy mogą działać tylko w bieżącej sesji. Zachowaj je przez eksport kopii lekcji.`);
      const sorted = sortLessons(available);
      setLessons(sorted);
      setSelectedId(sorted[0]?.id ?? '');
      setErrors(problems);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      importedResources.current.forEach(releaseLesson);
      importedResources.current = [];
      storedImports.current.clear();
    };
  }, []);

  async function acceptImports(records: StoredLesson[], fromBackup: boolean) {
    const resources: Lesson[] = [];
    try {
      for (const stored of records) resources.push(materializeLesson(stored));
    } catch (error) {
      resources.forEach(releaseLesson);
      throw error;
    }
    let saved = true;
    try {
      await saveImportedLessons(records);
      setStorageWarning('');
    } catch (error) {
      saved = false;
      setStorageWarning(`${errorMessage(error)} Importowane lekcje działają tylko w bieżącej sesji. Wyeksportuj kopię przed zamknięciem lub odświeżeniem strony.`);
    }
    const replacedIds = new Set(resources.map((lesson) => lesson.id));
    importedResources.current.filter((lesson) => replacedIds.has(lesson.id)).forEach(releaseLesson);
    for (const [index, resource] of resources.entries()) {
      resource.temporary = !saved;
      storedImports.current.set(resource.id, records[index]!);
    }
    importedResources.current = [...importedResources.current.filter((lesson) => !replacedIds.has(lesson.id)), ...resources];
    setLessons((current) => sortLessons([...current.filter((lesson) => !replacedIds.has(lesson.id)), ...resources]));
    setSelectedId(resources[0]!.id);
    if (saved && !fromBackup) {
      const lesson = resources[0]!;
      setMessage(`Zapisano lokalnie lekcję „${lesson.name}”. Liczba fiszek: ${lesson.cards.length}.`);
    } else {
      const subject = fromBackup ? `Wczytano kopię zapasową. Liczba lekcji: ${resources.length}.` : `Wczytano lekcję „${resources[0]!.name}”.`;
      setMessage(`${subject} ${saved ? 'Zapisano lokalnie w przeglądarce.' : 'Dostępne tylko w bieżącej sesji. Wyeksportuj kopię, aby zachować lekcje.'}`);
    }
  }

  async function runImport(read: () => Promise<StoredLesson[]>, fromBackup = false) {
    if (importLock.current) return;
    importLock.current = true;
    setImporting(true);
    setMessage('');
    try {
      await acceptImports(await read(), fromBackup);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      importLock.current = false;
      setImporting(false);
    }
  }

  async function exportLessons() {
    if (importLock.current) return;
    importLock.current = true;
    setImporting(true);
    try {
      downloadBackup(await createBackup([...storedImports.current.values()]));
      setMessage('Przygotowano kopię własnych lekcji wraz z grafikami. Zachowaj pobrany plik JSON.');
    } catch {
      setMessage('Nie udało się przygotować kopii lekcji. Spróbuj ponownie przed zamknięciem strony.');
    } finally {
      importLock.current = false;
      setImporting(false);
    }
  }

  function startLesson() {
    const lesson = lessons.find((item) => item.id === selectedId);
    if (!lesson) { setMessage('Najpierw wybierz lekcję.'); return; }
    if (!lesson.cards.length) { setMessage('Ta lekcja nie zawiera grafik.'); return; }
    setMessage('');
    dispatch({ type: 'start', lesson, sessionId: `session-${++sessionSequence.current}` });
  }

  return (
    <main className="app">
      {session ? <StudyView session={session} dispatch={(action) => {
        if (action.type === 'reset') setSelectedId(lessons[0]?.id ?? '');
        dispatch(action);
      }} /> : (
        <LessonMenu
          lessons={lessons}
          selectedId={selectedId}
          loading={loading}
          importing={importing}
          message={message}
          errors={storageWarning ? [...errors, storageWarning] : errors}
          hasImports={lessons.some((lesson) => lesson.source === 'imported')}
          hasTemporaryImports={lessons.some((lesson) => lesson.temporary)}
          onSelect={(id) => { setSelectedId(id); setMessage(''); }}
          onStart={startLesson}
          onImport={(files) => { void runImport(async () => [await prepareImport(files)]); }}
          onImportBackup={(file) => { void runImport(async () => {
            let contents: string;
            try { contents = await file.text(); } catch { throw new Error('Nie udało się odczytać pliku kopii zapasowej. Wybierz go ponownie.'); }
            return parseBackup(contents);
          }, true); }}
          onExport={() => { void exportLessons(); }}
        />
      )}
      {import.meta.env.MODE === 'pwa' && <PwaPanel studying={session?.status === 'learning'} />}
    </main>
  );
}
