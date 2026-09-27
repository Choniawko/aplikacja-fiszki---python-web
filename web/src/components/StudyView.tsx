import { useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { cardToken, currentCard } from '../domain/session.ts';
import type { Session, SessionAction } from '../domain/session.ts';

export function StudyView({ session, dispatch }: { session: Session; dispatch: Dispatch<SessionAction> }) {
  const card = currentCard(session);
  const token = cardToken(session);
  const revealButton = useRef<HTMLButtonElement>(null);
  const completion = useRef<HTMLHeadingElement>(null);
  const [imageState, setImageState] = useState<{ token: string; status: 'ready' | 'error' } | null>(null);
  const [feedbackTurn, setFeedbackTurn] = useState(-1);
  const ready = imageState?.token === token && imageState.status === 'ready';
  const failed = imageState?.token === token && imageState.status === 'error';
  const complete = session.status !== 'learning';
  const boxes = session.mode === 'boxes';
  const mastered = boxes ? session.batchIds.filter((id) => session.completedIds.includes(id)).length : session.completedIds.length;
  const total = boxes ? session.batchIds.length : session.allCards.length;

  useEffect(() => {
    if (complete) completion.current?.focus();
    else if (ready) revealButton.current?.focus({ preventScroll: true });
  }, [token, complete, ready]);
  useEffect(() => {
    setFeedbackTurn(session.turn);
    const timer = window.setTimeout(() => setFeedbackTurn(-1), 1800);
    return () => window.clearTimeout(timer);
  }, [session.turn]);
  const reveal = () => { if (ready) dispatch({ type: 'reveal', token }); };

  return (
    <section className="study" aria-labelledby="lesson-title">
      <div className="study-top">{!complete && <button className="back-button" type="button" onClick={() => dispatch({ type: 'reset' })}>Wróć do lekcji</button>}
        <span className="mode-tag">{boxes ? `Partia ${session.batchNumber}` : 'Tryb klasyczny'}</span></div>
      <h1 id="lesson-title">{session.lessonName}</h1>
      <div className="study-progress"><span data-testid="mastered">Zaliczone {mastered} z {total}</span><span>Cała lekcja: {session.completedIds.length} / {session.allCards.length}</span></div>
      <progress className="batch-progress" aria-label={boxes ? 'Postęp partii' : 'Postęp lekcji'} max={total || 1} value={mastered} />
      {boxes ? <div className="drawers" aria-label="Szuflady aktywnej partii">
        {([1, 2, 3] as const).map((box) => <div key={box} className={`drawer ${card && session.boxes[card.id] === box ? 'current' : ''}`} data-testid={`box-${box}`}>
          <span>Szuflada {box}</span><strong>{session.queue.filter((id) => session.boxes[id] === box).length}</strong>
        </div>)}
        <div className="drawer mastered"><span>Zaliczone</span><strong>{mastered}</strong></div>
      </div> : <div className="classic-counter"><span className="round-label">{session.round === 1 ? 'Pierwsza seria' : 'Powtórka błędnych'}</span>
        {!complete && <span data-testid="counter">{session.index + 1} / {session.cards.length}</span>}</div>}
      {complete ? <div className="completion-card">
        <div className="completion-mark" aria-hidden="true">✓</div>
        <h2 ref={completion} tabIndex={-1}>{session.status === 'completed' ? 'Wszystkie fiszki zaliczone!' : 'Partia ukończona!'}</h2>
        <p>{session.status === 'completed' ? 'Cała lekcja ukończona. Dobra robota!' : `Zaliczone ${mastered} fiszek z tej partii. Pozostało ${session.allCards.length - session.completedIds.length} kart w lekcji.`}</p>
        <p className="session-totals">Oceny w tej nauce: {session.correctCount} poprawnych · {session.wrongCount} błędnych</p>
        {session.status === 'batch-completed' && <button className="primary" type="button" onClick={() => dispatch({ type: 'next-batch', token })}>Następna partia</button>}
        <div><button className="back-button" type="button" onClick={() => dispatch({ type: 'reset' })}>Wróć do lekcji</button></div>
        <p className="local-note">Możesz wrócić do lekcji i kontynuować później.</p>
      </div> : <>
        <p className="current-box">{boxes ? `Bieżąca karta: szuflada ${session.boxes[card!.id]}` : `Runda ${session.round}`}</p>
        <div className="flashcard">
          <button key={token} type="button" className="image-button" aria-label="Odsłoń odpowiedź na grafice" aria-disabled={session.revealed || !ready} onClick={reveal}>
            <img src={card!.imageUrl} alt="Symbol do rozpoznania" onLoad={() => setImageState({ token, status: 'ready' })} onError={() => setImageState({ token, status: 'error' })} hidden={failed} />
            {failed && <span role="alert">Nie udało się wczytać grafiki. Wróć do lekcji i spróbuj ponownie.</span>}
          </button>
          <p id="answer" className={`answer ${session.revealed ? '' : 'answer-hint'}`} aria-live="polite">{session.revealed ? card!.answer : 'Przypomnij sobie odpowiedź'}</p>
          <button ref={revealButton} className="reveal-button" type="button" aria-disabled={session.revealed || !ready} onKeyDown={(e) => { if (e.repeat) e.preventDefault(); }} onClick={reveal}>{session.revealed ? 'Odpowiedź pokazana' : 'Pokaż odpowiedź'}</button>
        </div>
      </>}
      <div className="grade-buttons">
        <button className="grade wrong" type="button" disabled={complete || !session.revealed} onKeyDown={(e) => { if (e.repeat) e.preventDefault(); }} onClick={() => dispatch({ type: 'grade', token, correct: false })}><span aria-hidden="true">↺</span> Nie pamiętam</button>
        <button className="grade correct" type="button" disabled={complete || !session.revealed} onKeyDown={(e) => { if (e.repeat) e.preventDefault(); }} onClick={() => dispatch({ type: 'grade', token, correct: true })}><span aria-hidden="true">✓</span> Pamiętam</button>
      </div>
      <p className="grade-feedback" role="status" key={token}>{feedbackTurn === session.turn ? session.feedback : ''}</p>
    </section>
  );
}
