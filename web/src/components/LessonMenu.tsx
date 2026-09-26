import { useRef, useState } from 'react';
import type { Lesson } from '../domain/lessons.ts';
import { supportsDirectoryPicker } from '../data/import-lessons.ts';

interface Props {
  lessons: Lesson[];
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

export function LessonMenu({ lessons, selectedId, loading, importing, message, errors, hasImports, hasTemporaryImports, onSelect, onStart, onImport, onImportBackup, onExport }: Props) {
  const picker = useRef<HTMLInputElement>(null);
  const backupPicker = useRef<HTMLInputElement>(null);
  const [pickerError, setPickerError] = useState('');

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
      <h1 id="app-title">FISZKI</h1>
      <p id="choose-label" className="choose-label">Wybierz lekcję:</p>
      <div className="lesson-list" role="radiogroup" aria-labelledby="choose-label">
        {lessons.map((lesson) => (
          <label key={lesson.id} className={`lesson-option ${selectedId === lesson.id ? 'selected' : ''}`}>
            <input
              type="radio"
              name="lesson"
              value={lesson.id}
              checked={selectedId === lesson.id}
              onChange={() => onSelect(lesson.id)}
              disabled={loading || importing}
            />
            <span>{lesson.name}{lesson.source === 'imported' && <small> (import{lesson.temporary ? ', tylko ta sesja' : ''})</small>}</span>
          </label>
        ))}
        {!lessons.length && <p className="empty-list">{loading ? 'Wczytywanie lekcji…' : 'Nie znaleziono żadnych lekcji.'}</p>}
      </div>
      <button className="start-button" type="button" onClick={onStart} disabled={loading || importing}>Rozpocznij lekcję</button>
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
