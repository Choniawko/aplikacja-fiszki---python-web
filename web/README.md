# Fiszki — komputer, telefon i tryb offline

Aplikacja React + TypeScript + Vite zachowuje logikę i materiały oryginalnego `../fiszki.py`. Dwie wbudowane lekcje to **Symbole elektryczne popularne — 134 karty** i **Symbole elektryczne wszystkie — 220 kart**. Python i wszystkie 354 grafiki pozostają w repozytorium.

## Wybór wersji

| Sposób używania | Uruchomienie / wynik |
| --- | --- |
| iPhone i Android | PWA przez HTTPS, następnie instalacja na ekranie głównym; offline po pobraniu wszystkich materiałów |
| Komputer bez instalacji i internetu | Rozpakuj `fiszki-offline.zip` i otwórz `fiszki.html` dwuklikiem |
| Praca nad kodem | `npm run dev` — React + Vite, bez service workera |
| Zwykły hosting statyczny | `npm run build` → `dist/`, bez service workera |
| Przenośny HTML | `npm run build:offline` → `dist-offline/fiszki.html` oraz `fiszki-offline.zip` |
| Aplikacja PWA | `npm run build:pwa` → `dist-pwa/` |

**Na iPhonie podgląd HTML w aplikacji Pliki nie jest sposobem uruchamiania tej aplikacji.** Otwórz wersję HTTPS w Safari i dodaj ją do ekranu głównego. Wersja single-file pozostaje przeznaczona do przeglądarki na komputerze.

## Publikacja na Twoim GitHub Pages

Repozytorium docelowe: **Choniawko/aplikacja-fiszki---python-web**. Workflow nie tworzy PR-a ani wydania w repozytorium autora oryginału.

1. Otwórz [ustawienia Pages swojego repozytorium](https://github.com/Choniawko/aplikacja-fiszki---python-web/settings/pages).
2. Ustaw **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Jeśli w forku Actions są wyłączone, otwórz zakładkę **Actions** i włącz uruchamianie workflow.
4. Wybierz **Actions → GitHub Pages (Fiszki PWA) → Run workflow**.
5. Wskaż gałąź **main**, pozostaw zaznaczone **Publikuj sprawdzoną aplikację na GitHub Pages** i uruchom workflow.
6. Poczekaj na zielony wynik zadań **build** oraz **deploy**. Docelowy adres to **https://choniawko.github.io/aplikacja-fiszki---python-web/**. Samo istnienie kodu w repozytorium nie oznacza, że Pages zostało już opublikowane.

Kolejne wdrożenia wykonuj tym samym przyciskiem **Run workflow** na `main`. Push na `main` uruchamia weryfikację i przygotowanie artefaktu; publikacja następuje przy ręcznym uruchomieniu workflow. Nie trzeba tworzyć GitHub Release. Workflow używa `contents: read`, a zadanie publikacji dodatkowo `pages: write` oraz `id-token: write`, środowiska `github-pages` i oficjalnych akcji Pages.

Vite, manifest (`id`, `start_url`, `scope`), rejestracja workera, ikony i grafiki korzystają z tego samego prefiksu **`/aplikacja-fiszki---python-web/`**. W Actions prefiks pochodzi z nazwy repozytorium. Dla innego hostingu można ustawić `PWA_BASE_PATH=/inna-sciezka/` podczas budowania. Stabilny identyfikator aplikacji nie zmienia się pomiędzy wersjami. Publikuj cały `dist-pwa/`, bez dołączania plików z `dist-offline/`.

## Instalacja na telefonie

**iPhone:** otwórz adres HTTPS w **Safari → Udostępnij → Do ekranu głównego → Dodaj**. Uruchom Fiszki z nowej ikony. Instrukcja znika w trybie standalone.

**Android:** otwórz adres w Chrome, wybierz menu → **Zainstaluj aplikację** lub **Dodaj do ekranu głównego** i uruchom aplikację z ikony. Nazwa opcji może zależeć od przeglądarki.

Przy pierwszym uruchomieniu pozostaw połączenie z internetem. **„Gotowe do nauki offline”** pojawia się dopiero po zapisaniu całej aplikacji, danych lekcji, wszystkich grafik i ikon, aktywacji workera oraz sprawdzeniu kompletności cache. Nie trzeba wcześniej oglądać każdej karty. Po instalacji z ikony ponownie sprawdź ten komunikat — system może odseparować dane aplikacji od danych karty przeglądarki.

Błąd sieci, brak miejsca lub brak dowolnego zasobu blokuje gotowość. Przycisk **Ponów pobieranie** próbuje ponownie zainstalować brakującą wersję albo naprawić niekompletny cache. Przywrócenie aplikacji na pierwszy plan sprawdza stan materiałów. Jeśli system usunie dane strony, trzeba je pobrać ponownie. PWA wymaga HTTPS (wyjątkiem dla testów jest localhost); HTTP pod adresem IP w lokalnej sieci zwykle nie wystarcza.

## Aktualizacja PWA

Nowy build pobiera się w tle. Aplikacja pokazuje **Dostępna nowa wersja**, **Później** oraz **Przeładuj i zaktualizuj**. Nie wymusza przeładowania podczas nauki. Przeładowanie wybrane przez użytkownika kończy bieżącą sesję; własne lekcje w IndexedDB pozostają zapisane. Zamknięcie wszystkich starych okien pozwala przeglądarce aktywować gotową nową wersję przy następnym uruchomieniu.

Przycisk **Sprawdź aktualizacje** pozwala sprawdzić wersję ręcznie. Service worker utrzymuje cache aplikacji oddzielnie od IndexedDB i nigdy nie usuwa własnych lekcji. Przechowuje również poprzedni cache, aby ograniczyć problemy kart przeglądarki nadal wyświetlających wcześniejszą wersję.

## Komputer: samodzielny HTML

[Pobierz gotowy ZIP z tego repozytorium](https://github.com/Choniawko/aplikacja-fiszki---python-web/raw/refs/heads/main/web/fiszki-offline.zip), rozpakuj go i otwórz `fiszki.html` w przeglądarce. Archiwum zawiera tylko HTML i krótką `INSTRUKCJA.txt`. Użytkownik końcowy nie potrzebuje Node.js, npm, Pythona, terminala ani serwera.

HTML zawiera JavaScript, CSS, manifest danych lekcji i wszystkie grafiki jako data URL. Nie pobiera manifestu ani modułów przez `fetch`, nie używa workera, zewnętrznych fontów ani bibliotek. Sam `vite-plugin-singlefile` osadza JS/CSS; osobny krok osadza obrazy z `public/generated/`. Kontrola buildu sprawdza wszystkie karty, dokładne odpowiedzi i zgodność bajtów każdego obrazu. Polityka CSP wersji HTML dodatkowo zabrania połączeń (`connect-src 'none'`).

## Nauka

Wybierz lekcję i kliknij **Rozpocznij lekcję**. Lista jest sortowana po nazwach bez uwzględniania wielkości liter; pierwsza pozycja jest zaznaczona domyślnie. Każda nowa sesja tasuje całą lekcję.

Kliknij grafikę, aby odsłonić dokładną nazwę pliku bez ostatniego rozszerzenia. Czerwone **✗** oznacza błąd, zielone **✓** poprawną odpowiedź. Przed odsłonięciem i po zakończeniu nie można oceniać. Po rundzie powtarzane są wyłącznie jej błędne karty, ponownie potasowane. Rundy trwają aż do zaliczenia wszystkich kart. Podwójne i spóźnione zdarzenia nie pomijają kolejnych fiszek.

**Powrót do listy lekcji** przerywa sesję. Nauka nie jest zapisywana po odświeżeniu. Klawiatura: Tab / Shift+Tab, strzałki na liście, Enter / Spacja na przyciskach. Grafiki zachowują proporcje i mieszczą się w 500 × 350 px; długie odpowiedzi zawijają się. Interfejs uwzględnia safe area telefonu, ma przyciski o wysokości przynajmniej 44 px i nie blokuje powiększania strony.

## Własne lekcje, lokalny zapis i kopie

**Importuj folder lekcji** pozwala świadomie wybrać folder. Nazwa folderu staje się nazwą lekcji, nazwy plików — odpowiedziami. Obsługiwane są PNG, JPG, JPEG, BMP, GIF i WebP, także wielkimi literami. Brane są tylko obrazy bezpośrednio w folderze; podfoldery i inne pliki są pomijane. Aplikacja nie skanuje folderów obok HTML.

**Importuj kopię lekcji** pozwala wybrać pojedynczy plik JSON, także na iPhonie przez aplikację Pliki. Nie wymaga obsługi wyboru folderu. **Eksportuj kopię lekcji** pobiera JSON zawierający wszystkie własne lekcje, dokładne odpowiedzi i grafiki, również importy dostępne tylko w bieżącej sesji. Plik można przenieść na inny komputer lub telefon i odtworzyć bez dostępu do oryginalnych folderów. Wbudowane lekcje nie są powielane w kopii. Import o tej samej nazwie zastępuje poprzednią własną lekcję, zachowując pozostałe lekcje oraz materiały wbudowane.

Przed importem sprawdzane są wszystkie dane i obrazy. Uszkodzona kopia nie zastępuje wcześniejszych danych. Zapis kilku lekcji odbywa się w jednej transakcji IndexedDB (`fiszki-local-lessons`, magazyn `lessons`). Aplikacja wykonuje rzeczywistą próbę zapisu; komunikat **Zapisano lokalnie** pojawia się dopiero po zatwierdzeniu transakcji. Jeśli przeglądarka zabrania zapisu lub brakuje miejsca, import pozostaje dostępny **tylko w bieżącej sesji**. Odpowiedni dopisek jest widoczny na liście; należy wyeksportować kopię przed odświeżeniem lub zamknięciem strony.

Dane nie są wysyłane na serwer. Należą do przeglądarki, profilu i adresu strony; nie synchronizują się automatycznie. `file://` ma zależne od przeglądarki zasady przechowywania, a przeniesienie HTML może odłączyć go od poprzedniej bazy. Tryb prywatny, czyszczenie danych, usunięcie aplikacji lub odzyskiwanie miejsca przez system mogą usunąć importy. Zachowuj kopie JSON.

## Praca nad kodem i buildy

Tylko programista potrzebuje **Node.js 24+** i npm. Z głównego folderu repozytorium:

```bash
cd web
npm ci
npm run dev
```

Vite poda adres serwera, domyślnie http://127.0.0.1:5173. Dostępne polecenia:

```bash
npm run typecheck
npm test
npm run build
npm run build:offline
npm run build:pwa
npm run verify:offline
npm run verify:pwa
npm run preview:pwa
```

`preview:pwa` służy do sprawdzenia produkcyjnej wersji lokalnie. Otwórz adres podany przez Vite z dopisanym `/aplikacja-fiszki---python-web/`. Zwykły `build` ma względną bazę `./` i działa na statycznym hostingu pod dowolnym podkatalogiem. Build PWA wymaga ustalenia bazy przed budowaniem.

Dodanie folderu do `../dane/` nie wymaga edycji kodu. `dev` i wszystkie buildy generują manifest oraz kopie grafik. Po zmianie materiałów uruchom ponownie serwer albo `npm run generate:lessons` i odśwież stronę. Generowane `public/generated/`, `dist/`, `dist-offline/` i `dist-pwa/` nie są plikami źródłowymi. Gotowy ZIP jest przechowywany w repozytorium; po zmianie kodu lub materiałów zaktualizuj go przez `build:offline`.

PWA używa `vite-plugin-pwa` w trybie `injectManifest` i własnego workera. Lista precache jest kontrolowana przez `verify:pwa`: uwzględnia wszystkie obrazy, dane, JS, CSS, HTML, manifest i ikony. Limit pojedynczego zasobu wynosi **8 MiB**; build kończy się błędem, jeśli wymagany plik został pominięty lub przekracza limit. Całość materiałów i aplikacji zajmuje obecnie około 5 MB przed narzutem przeglądarki. Ikony PNG i apple-touch-icon są dołączone do źródeł; można je odtworzyć z SVG poleceniem `PLAYWRIGHT_CHANNEL=chrome node scripts/generate-icons.ts`.

## Testy przeglądarkowe

```bash
npx playwright install chromium
npm run test:e2e
npm run test:offline
npm run test:pwa
```

Na macOS 12 pobieranie obecnych przeglądarek Playwright nie jest obsługiwane. Można użyć zainstalowanego Chrome, poprzedzając każde polecenie zmienną `PLAYWRIGHT_CHANNEL=chrome`.

- `test:e2e`: build statyczny pod `/fiszki/`, pełna nauka i importy; widoki komputera, telefonu i tabletu.
- `test:offline`: HTML rozpakowany z ZIP w osobnym katalogu, adres `file://`, sieć wyłączona i `fetch` zablokowany. Sprawdzane są wszystkie 354 obrazy, pełna seria i kolejne powtórki, zakończenie nauki, kopie JSON, brak IndexedDB oraz brak miejsca.
- `test:pwa`: produkcyjny build pod rzeczywistą ścieżką repozytorium, bez serwera Vite dev. Obejmuje pełny precache, błąd i ponowienie pobierania, naprawę cache, odczyt wszystkich grafik offline, ponowne uruchomienie przeglądarki z tym samym profilem, plik kopii oraz aktualizację z drugiego produkcyjnego buildu bez utraty importów.

Zrzuty i ślady trafiają do `test-results/`, `test-results-offline/` oraz `test-results-pwa/`. Wyniki rzeczywiście wykonanych kontroli i ograniczenia zapisano w [raporcie weryfikacji](docs/WERYFIKACJA.md). Fizyczny iPhone i Android wymagają osobnego sprawdzenia według [checklisty mobilnej](docs/TESTY-MOBILNE.md).
