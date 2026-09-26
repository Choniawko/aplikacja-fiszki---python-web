import { useEffect, useReducer, useRef, useState } from 'react';
import { LessonMenu } from './components/LessonMenu.tsx';
import { StudyView } from './components/StudyView.tsx';
import { loadBundledLessons } from './data/bundled-lessons.ts';
import { materializeLesson, prepareImport, releaseLesson } from './data/import-lessons.ts';
import { loadImportedLessons, saveImportedLesson } from './data/storage.ts';
import { sortLessons } from './domain/lessons.ts';
import type { Lesson } from './domain/lessons.ts';
import { sessionReducer } from './domain/session.ts';
import type { Session, SessionAction } from './domain/session.ts';

const reduceSession = (state: Session | null, action: SessionAction) => sessionReducer(state, action);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Nie udało się wczytać lekcji. Spróbuj ponownie.';
}

export default function App() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const importedResources = useRef<Lesson[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const importLock = useRef(false);
  const sessionSequence = useRef(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [session, dispatch] = useReducer(reduceSession, null);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([loadBundledLessons(), loadImportedLessons()]).then(([bundled, imported]) => {
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
            available.push(lesson);
          } catch {
            problems.push(`Nie udało się odtworzyć lekcji „${stored.name}”. Zaimportuj jej folder ponownie.`);
          }
        }
      } else problems.push(errorMessage(imported.reason));
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
    };
  }, []);

  async function importFolder(files: File[]) {
    if (importLock.current) return;
    importLock.current = true;
    setImporting(true);
    setMessage('');
    let resource: Lesson | undefined;
    try {
      const stored = await prepareImport(files);
      resource = materializeLesson(stored);
      await saveImportedLesson(stored);
      const lesson = resource;
      const previous = importedResources.current.find((item) => item.id === lesson.id);
      if (previous) releaseLesson(previous);
      importedResources.current = [...importedResources.current.filter((item) => item.id !== lesson.id), lesson];
      setLessons((current) => sortLessons([...current.filter((item) => item.id !== lesson.id), lesson]));
      setSelectedId(lesson.id);
      setMessage(`Zapisano lokalnie lekcję „${lesson.name}”. Liczba fiszek: ${lesson.cards.length}.`);
      setErrors([]);
    } catch (error) {
      if (resource) releaseLesson(resource);
      setMessage(errorMessage(error));
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
          errors={errors}
          onSelect={(id) => { setSelectedId(id); setMessage(''); }}
          onStart={startLesson}
          onImport={(files) => { void importFolder(files); }}
        />
      )}
    </main>
  );
}
