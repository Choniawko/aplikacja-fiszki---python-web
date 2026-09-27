import { useRef, useState } from 'react';
import type { Lesson } from '../domain/lessons.ts';
import { progressKey } from '../domain/progress.ts';
import type { Progress } from '../domain/progress.ts';
import { batchSizes } from '../domain/session.ts';
import type { BatchSize, LearningMode } from '../domain/session.ts';
import { supportsDirectoryPicker } from '../data/import-lessons.ts';

interface Props {
  lessons: Lesson[];
  progress: Record<string, Progress>;
  mode: LearningMode;
  batchSize: BatchSize;
  onMode: (mode: LearningMode) => void;
  onBatchSize: (size: BatchSize) => void;
  onReset: () => void;
  selectedId: string;
  loading: boolean;
  importing: boolean;
  message: string;
  errors: string[];
  hasImports: boolean;
  hasTemporaryImports: boolean;
  onSelect: (id: string) => void;
  onStart: () => void;
  onImport: (files: File[]) => void;
  onImportBackup: (file: File) => void;
  onExport: () => void;
}

export function LessonMenu({ lessons, selectedId, loading, importing, message, errors, hasImports, hasTemporaryImports, progress, mode, batchSize, onMode, onBatchSize, onReset, onSelect, onStart, onImport, onImportBackup, onExport }: Props) {
  const picker = useRef<HTMLInputElement>(null);
  const backupPicker = useRef<HTMLInputElement>(null);
  const [pickerError, setPickerError] = useState('');
  const saved = progress[progressKey(selectedId, mode)];

  function chooseFolder() {
    if (!supportsDirectoryPicker()) {
      setPickerError('Ta przeglądarka nie obsługuje wyboru folderu. Możesz wczytać plik przez „Importuj kopię lekcji” lub korzystać z wbudowanych lekcji.');
      return;
    }
    setPickerError('');
    if (picker.current) {
      picker.current.webkitdirectory = true;
      picker.current.value = '';
      picker.current.click();
    }
  }

  return (
    <section className="menu" aria-labelledby="app-title" aria-busy={loading || importing}>
      <h1 id="app-title">Fiszki</h1>
      <p id="choose-label" className="choose-label">Wybierz lekcję:</p>
      <div className="lesson-list" role="radiogroup" aria-labelledby="choose-label">
        {lessons.map((lesson) => (
          <label key={lesson.id} className={`lesson-option ${selectedId === lesson.id ? 'selected' : ''}`}>
            <input
              aria-label={`${lesson.name}${lesson.source === 'imported' ? ` (import${lesson.temporary ? ', tylko ta sesja' : ''})` : ''}`}
              type="radio"
              name="lesson"
              value={lesson.id}
              checked={selectedId === lesson.id}
              onChange={() => onSelect(lesson.id)}
              disabled={loading || importing}
            />
            <span className="lesson-info"><strong>{lesson.name}</strong>
              <small>{lesson.cards.length} fiszek · Zaliczone {progress[progressKey(lesson.id, mode)]?.completedIds.length ?? 0} z {lesson.cards.length}</small>
              <progress max={lesson.cards.length || 1} value={progress[progressKey(lesson.id, mode)]?.completedIds.length ?? 0} aria-label={`Postęp lekcji ${lesson.name}`} />
              {lesson.source === 'imported' && <small>Własna lekcja{lesson.temporary ? ' · tylko ta sesja' : ''}</small>}
            </span>
          </label>
        ))}
        {!lessons.length && <p className="empty-list">{loading ? 'Wczytywanie lekcji…' : 'Nie znaleziono żadnych lekcji.'}</p>}
      </div>
      <div className="learning-options">
        <label>Tryb nauki<select aria-label="Tryb nauki" value={mode} onChange={(e) => onMode(e.target.value as LearningMode)} disabled={loading || importing}>
          <option value="boxes">Nauka w szufladach</option><option value="classic">Tryb klasyczny</option>
        </select></label>
        {mode === 'boxes' && <label>Wielkość partii<select aria-label="Wielkość partii" value={saved?.batchSize ?? batchSize} disabled={loading || importing || !!saved} onChange={(e) => onBatchSize(Number(e.target.value) as BatchSize)}>
          {batchSizes.map((size) => <option key={size} value={size}>{size} fiszek</option>)}
        </select></label>}
      </div>
      <p className="mode-description">{mode === 'boxes' ? 'Trzy kolejne poprawne oceny zaliczają kartę. Błąd cofa ją do pierwszej szuflady.' : 'Cała lekcja w jednej serii. W kolejnych rundach powtarzasz tylko błędne odpowiedzi.'}</p>
      <button className="start-button primary" type="button" onClick={onStart} disabled={loading || importing}>{saved ? saved.status === 'completed' ? 'Zobacz podsumowanie' : 'Wznów naukę' : 'Rozpocznij'}</button>
      {saved && saved.status !== 'completed' && <p className="resume-note">Wznawiasz zapisaną kolejkę z ukrytą odpowiedzią{mode === 'boxes' ? ` · partie po ${saved.batchSize} fiszek` : ''}.</p>}
      <details className="tools">
        <summary>Własne lekcje, kopie i ustawienia</summary>
        <div className="tools-content">
      <button className="import-button" type="button" onClick={chooseFolder} disabled={loading || importing}>
        {importing ? 'Importowanie…' : 'Importuj folder lekcji'}
      </button>
      <input
        ref={picker}
        data-testid="folder-input"
        type="file"
        multiple
        hidden
        onChange={(event) => onImport(Array.from(event.currentTarget.files ?? []))}
      />
      <div className="backup-buttons">
        <button type="button" disabled={loading || importing || !hasImports} onClick={onExport}>Eksportuj kopię lekcji</button>
        <button type="button" disabled={loading || importing} onClick={() => {
          if (backupPicker.current) { backupPicker.current.value = ''; backupPicker.current.click(); }
        }}>Importuj kopię lekcji</button>
      </div>
      <input ref={backupPicker} data-testid="backup-input" type="file" accept=".json,application/json" hidden onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        if (file) onImportBackup(file);
      }} />
      {Object.values(progress).some((p) => p.lessonId === selectedId) && <button className="reset-button" type="button" disabled={loading || importing} onClick={onReset}>Wyzeruj postępy lekcji</button>}
      <p className="local-note">Kopia zawiera własne grafiki i postępy w obu trybach, także we wbudowanych lekcjach. Reset usuwa postępy wybranej lekcji w obu trybach, zachowując materiały.</p>
      </div></details>
      <div className="menu-status" role="status">
        {loading ? 'Wczytywanie lekcji…' : `Znaleziono lekcji: ${lessons.length}`}
        {message && <p>{message}</p>}
      </div>
      {[...errors, pickerError].filter(Boolean).length > 0 && (
        <div className="error-message" role="alert">
          {[...errors, pickerError].filter(Boolean).map((error) => <p key={error}>{error}</p>)}
        </div>
      )}
      <p className="local-note">{hasTemporaryImports
        ? 'Część lekcji jest dostępna tylko do odświeżenia lub zamknięcia strony. Zachowaj kopię zapasową.'
        : 'Własne lekcje pozostają w tej przeglądarce, jeśli pozwala ona na zapis. Eksport kopii pozwala przenieść je na inny komputer.'}</p>
    </section>
  );
}
