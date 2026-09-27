import { useEffect, useRef, useState } from 'react';
import { LessonMenu } from './components/LessonMenu.tsx';
import { StudyView } from './components/StudyView.tsx';
import { loadBundledLessons } from './data/bundled-lessons.ts';
import { materializeLesson, prepareImport, releaseLesson } from './data/import-lessons.ts';
import type { StoredLesson } from './data/import-lessons.ts';
import { createBackup, downloadBackup, parseBackupData } from './data/backup.ts';
import { loadImportedLessons, probeImportedStorage, loadProgress, saveProgress, saveBackupData, deleteLessonProgress } from './data/storage.ts';
import { sortLessons } from './domain/lessons.ts';
import type { Lesson } from './domain/lessons.ts';
import { sessionReducer } from './domain/session.ts';
import type { Session, SessionAction, LearningMode, BatchSize } from './domain/session.ts';
import { progressKey, restoreProgress, snapshot } from './domain/progress.ts';
import type { Progress } from './domain/progress.ts';
import { PwaPanel } from './pwa/PwaPanel.tsx';

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Nie udało się wczytać danych. Spróbuj ponownie.'; }

export default function App() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const importedResources = useRef<Lesson[]>([]);
  const storedImports = useRef(new Map<string, StoredLesson>());
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState<LearningMode>('boxes');
  const [batchSize, setBatchSize] = useState<BatchSize>(20);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const importLock = useRef(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const active = useRef<Session | null>(null);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const records = useRef<Record<string, Progress>>({});
  // Serialize writes, imports and resets so an older grade cannot overwrite a newer one.
  const writes = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);

  function replaceProgress(next: Record<string, Progress>) { records.current = next; setProgress(next); }
  function persist(record: Progress) {
    replaceProgress({ ...records.current, [record.key]: record });
    pending.current++;
    setSaveStatus('Zapisywanie postępów…');
    writes.current = writes.current.then(async () => {
      try {
        if (importedResources.current.some((lesson) => lesson.id === record.lessonId && lesson.temporary)) throw new Error('Lekcja jest dostępna tylko w tej sesji.');
        await saveProgress(record);
        if (pending.current === 1) { setSaveStatus('Postępy zapisane lokalnie'); setSaveWarning(''); }
      } catch (error) {
        setSaveStatus('Postępy tylko w tej sesji — wyeksportuj kopię przed zamknięciem.');
        setSaveWarning(`${errorMessage(error)} Nie potwierdzono trwałego zapisu postępów. Możesz kontynuować i wyeksportować kopię z menu.`);
      } finally { pending.current--; }
    });
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([loadBundledLessons(), loadImportedLessons(), probeImportedStorage(), loadProgress()]).then(([bundled, imported, storage, saved]) => {
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
          } catch { problems.push(`Nie udało się odtworzyć lekcji „${stored.name}”. Zaimportuj jej folder ponownie.`); }
        }
      } else problems.push(errorMessage(imported.reason));
      if (storage.status === 'rejected') setStorageWarning(`${errorMessage(storage.reason)} Lekcje i postępy mogą działać tylko w bieżącej sesji. Zachowaj kopię zapasową.`);
      const next: Record<string, Progress> = {};
      if (saved.status === 'fulfilled') {
        if (saved.value.invalid) problems.push('Pominięto uszkodzony zapis postępów. Materiały lekcji pozostały dostępne. Możesz odtworzyć postępy z kopii.');
        for (const record of saved.value.records) {
          const lesson = available.find((item) => item.id === record.lessonId);
          if (!lesson?.cards.length) { next[record.key] = record; continue; }
          const restored = restoreProgress(record, lesson);
          next[record.key] = snapshot(restored.session, record.updatedAt);
          if (restored.changed) problems.push(`Zmieniono materiały „${lesson.name}”. Zachowano postęp niezmienionych kart; nowe i zmienione wymagają nauki.`);
        }
      } else problems.push(errorMessage(saved.reason));
      replaceProgress(next);
      const sorted = sortLessons(available);
      const latest = Object.values(next).filter((p) => available.some((l) => l.id === p.lessonId)).sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setLessons(sorted);
      setSelectedId(latest?.lessonId ?? sorted[0]?.id ?? '');
      if (latest) { setMode(latest.mode); setBatchSize(latest.batchSize); }
      setErrors([...new Set(problems)]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      importedResources.current.forEach(releaseLesson);
      importedResources.current = [];
      storedImports.current.clear();
    };
  }, []);

  function dispatch(action: SessionAction) {
    const previous = active.current;
    const next = sessionReducer(previous, action);
    if (next === previous) return;
    active.current = next;
    setSession(next);
    if (next && action.type !== 'reveal') persist(snapshot(next));
  }

  async function acceptImports(imports: StoredLesson[], backupProgress: Progress[], fromBackup: boolean) {
    const resources: Lesson[] = [];
    try { for (const stored of imports) resources.push(materializeLesson(stored)); }
    catch (error) { resources.forEach(releaseLesson); throw error; }
    const replacedIds = new Set(resources.map((lesson) => lesson.id));
    const available = sortLessons([...lessons.filter((lesson) => !replacedIds.has(lesson.id)), ...resources]);
    const next = { ...records.current, ...Object.fromEntries(backupProgress.map((p) => [p.key, p])) };
    const changedProgress: Progress[] = [];
    let adjusted = false;
    for (const record of Object.values(next)) {
      const lesson = available.find((item) => item.id === record.lessonId);
      if (!lesson?.cards.length) { changedProgress.push(record); continue; }
      const restored = restoreProgress(record, lesson);
      adjusted ||= restored.changed;
      next[record.key] = snapshot(restored.session, record.updatedAt);
      changedProgress.push(next[record.key]!);
    }
    let saved = true;
    await writes.current;
    try { await saveBackupData(imports, changedProgress); setStorageWarning(''); setSaveWarning(''); }
    catch (error) {
      saved = false;
      setStorageWarning(`${errorMessage(error)} Wczytane dane działają tylko w bieżącej sesji. Wyeksportuj kopię przed zamknięciem lub odświeżeniem strony.`);
    }
    importedResources.current.filter((lesson) => replacedIds.has(lesson.id)).forEach(releaseLesson);
    for (const [index, resource] of resources.entries()) { resource.temporary = !saved; storedImports.current.set(resource.id, imports[index]!); }
    importedResources.current = [...importedResources.current.filter((lesson) => !replacedIds.has(lesson.id)), ...resources];
    replaceProgress(next);
    setLessons(available);
    setSelectedId(resources[0]?.id ?? backupProgress.find((record) => available.some((lesson) => lesson.id === record.lessonId))?.lessonId ?? selectedId);
    if (backupProgress[0]) { setMode(backupProgress[0].mode); setBatchSize(backupProgress[0].batchSize); }
    if (saved && !fromBackup) setMessage(`Zapisano lokalnie lekcję „${resources[0]!.name}”. Liczba fiszek: ${resources[0]!.cards.length}.${adjusted ? ' Dostosowano postępy do zmienionych materiałów.' : ''}`);
    else setMessage(`${fromBackup ? 'Wczytano kopię zapasową.' : 'Wczytano lekcję.'} ${saved ? 'Zapisano lokalnie w przeglądarce.' : 'Dostępne tylko w bieżącej sesji. Wyeksportuj kopię, aby zachować dane.'}${adjusted ? ' Dostosowano postępy do zmienionych materiałów.' : ''}`);
  }
  async function runImport(read: () => Promise<{ lessons: StoredLesson[]; progress: Progress[] }>, fromBackup = false) {
    if (importLock.current) return;
    importLock.current = true; setImporting(true); setMessage('');
    try { const data = await read(); await acceptImports(data.lessons, data.progress, fromBackup); }
    catch (error) { setMessage(errorMessage(error)); }
    finally { importLock.current = false; setImporting(false); }
  }
  async function exportLessons() {
    if (importLock.current) return;
    importLock.current = true; setImporting(true);
    try {
      downloadBackup(await createBackup([...storedImports.current.values()], Object.values(records.current).filter((p) => !p.lessonId.startsWith('imported:') || storedImports.current.has(p.lessonId))));
      setMessage('Przygotowano kopię własnych lekcji, grafik i postępów. Zachowaj pobrany plik JSON.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { importLock.current = false; setImporting(false); }
  }
  function startLesson() {
    const lesson = lessons.find((item) => item.id === selectedId);
    if (!lesson) { setMessage('Najpierw wybierz lekcję.'); return; }
    if (!lesson.cards.length) { setMessage('Ta lekcja nie zawiera grafik.'); return; }
    setMessage('');
    const saved = records.current[progressKey(selectedId, mode)];
    const sessionId = crypto.randomUUID();
    if (saved) dispatch({ type: 'resume', session: restoreProgress(saved, lesson).session, sessionId });
    else dispatch({ type: 'start', lesson, mode, batchSize, sessionId });
  }
  async function resetProgress() {
    const lesson = lessons.find((item) => item.id === selectedId);
    if (!lesson || !window.confirm(`Wyzerować postępy lekcji „${lesson.name}” w obu trybach? Materiały pozostaną dostępne.`)) return;
    setImporting(true);
    await writes.current;
    try {
      await deleteLessonProgress(lesson.id);
      setMessage('Postępy wyzerowane. Materiały lekcji pozostały dostępne.');
    } catch (error) { setMessage(`Postępy wyzerowane tylko w tej sesji. Nie udało się usunąć ich z pamięci przeglądarki; po odświeżeniu może wrócić wcześniejszy zapis. ${errorMessage(error)}`); }
    finally {
      const next = { ...records.current };
      delete next[progressKey(lesson.id, 'boxes')]; delete next[progressKey(lesson.id, 'classic')];
      replaceProgress(next); setSaveStatus(''); setSaveWarning(''); setImporting(false);
    }
  }

  return (
    <main className="app">
      {session ? <>
        <StudyView session={session} dispatch={dispatch} />
        <p className="save-status" role="status" data-testid="save-status">{saveStatus}</p>
        {(storageWarning || saveWarning) && <p className="error-message" role="alert">{saveWarning || storageWarning}</p>}
      </> : <LessonMenu
        lessons={lessons} selectedId={selectedId} loading={loading} importing={importing} message={message}
        errors={[...errors, storageWarning, saveWarning].filter(Boolean)} progress={progress} mode={mode} batchSize={batchSize}
        onMode={setMode} onBatchSize={setBatchSize} onReset={() => { void resetProgress(); }}
        hasImports={lessons.some((lesson) => lesson.source === 'imported') || Object.keys(progress).length > 0}
        hasTemporaryImports={lessons.some((lesson) => lesson.temporary)}
        onSelect={(id) => { setSelectedId(id); setMessage(''); }} onStart={startLesson}
        onImport={(files) => { void runImport(async () => ({ lessons: [await prepareImport(files)], progress: [] })); }}
        onImportBackup={(file) => { void runImport(async () => parseBackupData(await file.text()), true); }}
        onExport={() => { void exportLessons(); }}
      />}
      {import.meta.env.MODE === 'pwa' && <PwaPanel studying={session?.status === 'learning'} beforeUpdate={async () => { await writes.current; }} />}
    </main>
  );
}
