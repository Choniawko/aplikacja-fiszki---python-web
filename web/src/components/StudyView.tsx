import { useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { cardToken, currentCard } from '../domain/session.ts';
import type { Session, SessionAction } from '../domain/session.ts';

export function StudyView({ session, dispatch }: { session: Session; dispatch: Dispatch<SessionAction> }) {
  const card = currentCard(session);
  const token = cardToken(session);
  const revealButton = useRef<HTMLButtonElement>(null);
  const completion = useRef<HTMLParagraphElement>(null);
  const [imageState, setImageState] = useState<{ token: string; status: 'ready' | 'error' } | null>(null);
  const ready = imageState?.token === token && imageState.status === 'ready';
  const failed = imageState?.token === token && imageState.status === 'error';
  const complete = session.status === 'completed';

  useEffect(() => {
    if (complete) completion.current?.focus();
    else if (ready) revealButton.current?.focus();
  }, [token, complete, ready]);

  return (
    <section className="study" aria-labelledby="lesson-title">
      <h1 id="lesson-title">Lekcja: {session.lessonName}</h1>
      <p className="round-label">{session.round === 1 ? 'Pierwsza seria' : 'Powtórka błędnych'}</p>
      {!complete && <p className="counter" aria-live="polite" data-testid="counter">{session.index + 1} / {session.cards.length}</p>}
      {complete ? (
        <>
          <div className="image-area completion-mark" aria-hidden="true">✓</div>
          <p ref={completion} tabIndex={-1} className="answer completion-message">Wszystkie fiszki zaliczone!</p>
        </>
      ) : (
        <>
          <div className="image-area">
            <button
              key={token}
              ref={revealButton}
              type="button"
              className="reveal-button"
              aria-label={session.revealed ? 'Odpowiedź odkryta' : 'Pokaż odpowiedź'}
              aria-describedby="answer"
              aria-disabled={session.revealed || !ready}
              onClick={() => { if (ready) dispatch({ type: 'reveal', token }); }}
            >
              <img
                src={card!.imageUrl}
                alt="Symbol do rozpoznania"
                onLoad={() => setImageState({ token, status: 'ready' })}
                onError={() => setImageState({ token, status: 'error' })}
                hidden={failed}
              />
              {failed && <span role="alert">Nie udało się wczytać grafiki.<br />Wróć do listy i uruchom lekcję ponownie.</span>}
            </button>
          </div>
          <p id="answer" className={`answer ${session.revealed ? '' : 'answer-hint'}`} aria-live="polite">
            {session.revealed ? card!.answer : 'Kliknij symbol, aby zobaczyć odpowiedź'}
          </p>
        </>
      )}
      <div className="grade-buttons">
        <button
          className="grade wrong"
          type="button"
          aria-label="Błędna odpowiedź"
          disabled={complete || !session.revealed}
          onClick={() => dispatch({ type: 'grade', token, correct: false })}
        >✗</button>
        <button
          className="grade correct"
          type="button"
          aria-label="Poprawna odpowiedź"
          disabled={complete || !session.revealed}
          onClick={() => dispatch({ type: 'grade', token, correct: true })}
        >✓</button>
      </div>
      <button className="back-button" type="button" onClick={() => dispatch({ type: 'reset' })}>Powrót do listy lekcji</button>
    </section>
  );
}
