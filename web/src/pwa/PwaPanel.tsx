import { useEffect, useRef, useState } from 'react';
declare const __PWA_BUILD_ID__: string;

function askWorker(worker: ServiceWorker, type: 'CHECK_OFFLINE' | 'REPAIR_OFFLINE') {
  return new Promise<{ ready: boolean; version?: string; count?: number }>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => { channel.port1.close(); reject(new Error('Brak odpowiedzi.')); }, type === 'REPAIR_OFFLINE' ? 120000 : 10000);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data);
    };
    worker.postMessage({ type }, [channel.port2]);
  });
}

export function PwaPanel({ studying }: { studying: boolean }) {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState('Pobieranie aplikacji i materiałów do nauki offline…');
  const [error, setError] = useState('');
  const [update, setUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const acceptedUpdate = useRef(false);
  const retry = useRef<() => Promise<void>>(async () => {});
  const check = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let disposed = false;
    const display = matchMedia('(display-mode: standalone)');
    const updateDisplay = () => setStandalone(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    updateDisplay();
    display.addEventListener('change', updateDisplay);
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      setError('Tryb offline wymaga przeglądarki obsługującej aplikacje PWA i adresu HTTPS.');
      return () => display.removeEventListener('change', updateDisplay);
    }

    async function verify(repair = false) {
      const worker = navigator.serviceWorker.controller;
      if (!worker || worker.state !== 'activated') return;
      try {
        const result = await askWorker(worker, repair ? 'REPAIR_OFFLINE' : 'CHECK_OFFLINE');
        if (disposed) return;
        setReady(result.ready);
        setError(result.ready ? '' : 'Brakuje części materiałów offline. Połącz się z internetem i ponów pobieranie.');
      } catch {
        if (!disposed) { setReady(false); setError('Nie udało się sprawdzić materiałów offline. Spróbuj ponownie.'); }
      }
    }

    function watch(worker: ServiceWorker | null) {
      if (!worker) return;
      const changed = () => {
        if (disposed) return;
        if (worker.state === 'installed' && navigator.serviceWorker.controller) { setUpdate(true); setDismissed(false); }
        if (worker.state === 'activated') void verify();
        if (worker.state === 'redundant') setError('Nie udało się pobrać wszystkich materiałów. Sprawdź połączenie i wolne miejsce, a następnie ponów pobieranie.');
      };
      worker.addEventListener('statechange', changed);
      changed();
    }

    async function register() {
      try {
        setError('');
        const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' });
        if (disposed) return;
        registration.current = reg;
        reg.onupdatefound = () => watch(reg.installing);
        watch(reg.installing);
        if (reg.waiting) { setUpdate(true); setDismissed(false); }
        if (navigator.serviceWorker.controller) await verify();
      } catch {
        if (!disposed) setError('Nie udało się przygotować aplikacji offline. Sprawdź połączenie i ponów pobieranie.');
      }
    }

    const onController = () => {
      if (acceptedUpdate.current) window.location.reload();
      else void verify();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OFFLINE_PROGRESS') setProgress(`Pobieranie materiałów offline: ${event.data.finished} / ${event.data.total}`);
      if (event.data?.type === 'OFFLINE_FAILED') setError('Nie udało się pobrać wszystkich materiałów. Sprawdź połączenie i wolne miejsce, a następnie ponów pobieranie.');
    };
    check.current = async () => {
      await verify();
      if (!navigator.onLine) return;
      try {
        await registration.current?.update();
        if (registration.current?.waiting) { setUpdate(true); setDismissed(false); }
      } catch { setError('Nie udało się sprawdzić nowej wersji. Zapisane materiały nadal są dostępne.'); }
    };
    retry.current = async () => {
      setError('');
      if (navigator.serviceWorker.controller) await verify(true);
      await register();
      try { await registration.current?.update(); } catch { setError('Pobieranie nie powiodło się. Połącz się z internetem i spróbuj ponownie.'); }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void check.current(); };
    navigator.serviceWorker.addEventListener('controllerchange', onController);
    navigator.serviceWorker.addEventListener('message', onMessage);
    document.addEventListener('visibilitychange', onVisible);
    void register();
    return () => {
      disposed = true;
      display.removeEventListener('change', updateDisplay);
      navigator.serviceWorker.removeEventListener('controllerchange', onController);
      navigator.serviceWorker.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onVisible);
      if (registration.current) registration.current.onupdatefound = null;
    };
  }, []);

  return (
    <aside className="pwa-panel" aria-label="Instalacja i tryb offline" data-build={__PWA_BUILD_ID__}>
      <p role="status" data-testid="offline-state">{ready ? 'Gotowe do nauki offline' : error ? 'Materiały offline nie są jeszcze gotowe' : progress}</p>
      {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => { void retry.current(); }}>Ponów pobieranie</button></div>}
      {update && !dismissed && <div className="update-notice" role="status">
        <strong>Dostępna nowa wersja</strong>
        <p>{studying ? 'Przeładowanie zakończy bieżącą naukę. ' : ''}Własne lekcje i kopie zapisane w przeglądarce pozostaną dostępne.</p>
        <button type="button" onClick={() => {
          const waiting = registration.current?.waiting;
          if (waiting) { acceptedUpdate.current = true; waiting.postMessage({ type: 'SKIP_WAITING' }); }
          else { acceptedUpdate.current = true; window.location.reload(); }
        }}>Przeładuj i zaktualizuj</button>
        <button type="button" onClick={() => setDismissed(true)}>Później</button>
      </div>}
      {!standalone && <div className="install-instructions">
        <p><strong>iPhone:</strong> otwórz w Safari → Udostępnij → Do ekranu głównego.</p>
        <p><strong>Android:</strong> w menu przeglądarki wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.</p>
        <p>Przed odłączeniem internetu poczekaj na komunikat „Gotowe do nauki offline”.</p>
      </div>}
      <button type="button" className="check-update" onClick={() => { void check.current(); }}>Sprawdź aktualizacje</button>
    </aside>
  );
}
