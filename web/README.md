# Fiszki — komputer, telefon i tryb offline

**[Otwórz aplikację Fiszki](https://choniawko.github.io/aplikacja-fiszki---python-web/)** — działa w przeglądarce na komputerze, iPhonie i Androidzie.

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

## Instalacja na telefonie

**iPhone:** otwórz adres HTTPS w **Safari → Udostępnij → Do ekranu głównego → Dodaj**. Uruchom Fiszki z nowej ikony. Instrukcja znika w trybie standalone.

**Android:** otwórz adres w Chrome, wybierz menu → **Zainstaluj aplikację** lub **Dodaj do ekranu głównego** i uruchom aplikację z ikony. Nazwa opcji może zależeć od przeglądarki.

Przy pierwszym uruchomieniu pozostaw połączenie z internetem. **„Gotowe do nauki offline”** pojawia się dopiero po zapisaniu całej aplikacji, danych lekcji, wszystkich grafik i ikon, aktywacji workera oraz sprawdzeniu kompletności cache. Nie trzeba wcześniej oglądać każdej karty. Po instalacji z ikony ponownie sprawdź ten komunikat — system może odseparować dane aplikacji od danych karty przeglądarki.

Błąd sieci, brak miejsca lub brak dowolnego zasobu blokuje gotowość. Przycisk **Ponów pobieranie** próbuje ponownie zainstalować brakującą wersję albo naprawić niekompletny cache. Przywrócenie aplikacji na pierwszy plan sprawdza stan materiałów. Jeśli system usunie dane strony, trzeba je pobrać ponownie. PWA wymaga HTTPS (wyjątkiem dla testów jest localhost); HTTP pod adresem IP w lokalnej sieci zwykle nie wystarcza.

## Aktualizacja PWA

Nowy build pobiera się w tle. Aplikacja pokazuje **Dostępna nowa wersja**, **Później** oraz **Przeładuj i zaktualizuj**. Nie wymusza przeładowania podczas nauki. Przeładowanie wybrane przez użytkownika czeka na zakończenie zapisu postępów. Po ponownym uruchomieniu wybierz **Wznów naukę**; odpowiedź bieżącej karty będzie ukryta. Własne lekcje pozostają zapisane. Jeżeli zapis się nie powiódł, wyeksportuj kopię przed aktualizacją. Zamknięcie wszystkich starych okien pozwala przeglądarce aktywować gotową nową wersję przy następnym uruchomieniu.

Przycisk **Sprawdź aktualizacje** pozwala sprawdzić wersję ręcznie. Service worker utrzymuje cache aplikacji oddzielnie od IndexedDB i nigdy nie usuwa własnych lekcji. Przechowuje również poprzedni cache, aby ograniczyć problemy kart przeglądarki nadal wyświetlających wcześniejszą wersję.

## Komputer: samodzielny HTML

[Pobierz gotowy ZIP z tego repozytorium](https://github.com/Choniawko/aplikacja-fiszki---python-web/raw/refs/heads/main/web/fiszki-offline.zip), rozpakuj go i otwórz `fiszki.html` w przeglądarce. Archiwum zawiera tylko HTML i krótką `INSTRUKCJA.txt`. Użytkownik końcowy nie potrzebuje Node.js, npm, Pythona, terminala ani serwera.

HTML zawiera JavaScript, CSS, manifest danych lekcji i wszystkie grafiki jako data URL. Nie pobiera manifestu ani modułów przez `fetch`, nie używa workera, zewnętrznych fontów ani bibliotek. Sam `vite-plugin-singlefile` osadza JS/CSS; osobny krok osadza obrazy z `public/generated/`. Kontrola buildu sprawdza wszystkie karty, dokładne odpowiedzi i zgodność bajtów każdego obrazu. Polityka CSP wersji HTML dodatkowo zabrania połączeń (`connect-src 'none'`).

## Nauka w szufladach

Domyślny tryb to **Nauka w szufladach**, w partiach po **20 fiszek**. Po wybraniu lekcji możesz ustawić 10, 20, 30 lub 50 kart. Partia jest losowana bez powtórzeń spośród niezaliczonych kart. Jeżeli zostało mniej kart, używane są wszystkie pozostałe. Skład i wielkość rozpoczętej partii pozostają stałe przy wznowieniu.

1. Wybierz **Rozpocznij**. Każda karta zaczyna w szufladzie 1.
2. Przypomnij sobie odpowiedź, potem naciśnij **Pokaż odpowiedź** lub grafikę.
3. **Pamiętam** przesuwa kartę z szuflady 1 do 2, następnie do 3. Poprawna ocena w szufladzie 3 zalicza kartę.
4. **Nie pamiętam** zawsze cofa kartę do szuflady 1. Niezaliczone karty wracają na koniec kolejki, a odpowiedź następnej karty jest ukryta.
5. Po zaliczeniu całej partii wybierz **Następna partia** albo **Wróć do lekcji**. Nowe karty są dobierane dopiero na żądanie. Po ostatniej partii pojawia się ukończenie całej lekcji.

Każda karta wymaga trzech kolejnych poprawnych ocen swoich prezentacji. Błąd zeruje ten ciąg. Ostatnia karta może pojawić się ponownie, ale za każdym razem trzeba osobno odsłonić odpowiedź. To powtórki w ramach nauki, bez terminów na kolejne dni.

Liczniki pokazują rozkład aktywnej partii między szufladami i liczbę zaliczonych kart. Pasek postępu rośnie tylko przy zaliczeniu karty. Krótki komunikat po ocenie wskazuje jej efekt.

## Tryb klasyczny

W polu **Tryb nauki** możesz wybrać **Tryb klasyczny**: cała lekcja jest tasowana i pokazywana w jednej serii. Poprawna odpowiedź zalicza kartę od razu. Kolejne rundy zawierają wyłącznie błędne karty z poprzedniej rundy i trwają aż do zaliczenia wszystkich kart.

## Postępy, wznowienie i reset

Aplikacja zapisuje po każdej ocenie skład partii, kolejkę, szuflady, zaliczone karty i liczniki. Poczekaj na **Postępy zapisane lokalnie** przed zamknięciem przeglądarki. Po odświeżeniu, powrocie do menu lub ponownym uruchomieniu wybierz **Wznów naukę**. Bieżąca odpowiedź jest zawsze ukryta. Postępy szuflad i trybu klasycznego są niezależne.

W sekcji **Własne lekcje, kopie i ustawienia** znajduje się **Wyzeruj postępy lekcji**. Reset wymaga potwierdzenia, obejmuje oba tryby wybranej lekcji i zachowuje materiały. Pozwala też rozpocząć naukę od nowa z inną wielkością partii. Jeśli zapis jest niedostępny, reset działa tylko w bieżącej sesji — aplikacja informuje, że po odświeżeniu może wrócić wcześniejszy zapis.

Przy zmianie materiałów zachowywane są postępy niezmienionych kart. Usunięte karty opuszczają kolejkę, zmienione zaczynają ponownie od szuflady 1, a nowe czekają na następną partię. W trybie klasycznym nowe i zmienione karty trafiają do kolejki pozostałej do nauki. Aplikacja pokazuje komunikat o dostosowaniu postępów. Sama zmiana wersji aplikacji nie resetuje nauki.

Jeżeli przeglądarka odmawia zapisu lub zabraknie miejsca, możesz kontynuować w bieżącej sesji. Komunikat jasno wskazuje brak trwałego zapisu. Wróć do lekcji i wyeksportuj kopię **przed zamknięciem, odświeżeniem lub aktualizacją**. Dane są lokalne, nie synchronizują się między urządzeniami. Przy równoczesnej nauce w kilku kartach przeglądarki obowiązuje ostatni zapis.

Klawiatura: Tab / Shift+Tab, strzałki na liście lekcji, Enter / Spacja na przyciskach. Interfejs ma widoczny fokus, duże przyciski, uwzględnia safe area telefonu i pozwala powiększać stronę. Animacje respektują ograniczenie ruchu w ustawieniach systemu.

## Własne lekcje, lokalny zapis i kopie

W sekcji **Własne lekcje, kopie i ustawienia** przycisk **Importuj folder lekcji** pozwala świadomie wybrać folder. Nazwa folderu staje się nazwą lekcji, nazwy plików — odpowiedziami. Obsługiwane są PNG, JPG, JPEG, BMP, GIF i WebP, także wielkimi literami. Brane są tylko obrazy bezpośrednio w folderze; podfoldery i inne pliki są pomijane. Aplikacja nie skanuje folderów obok HTML.

**Importuj kopię lekcji** pozwala wybrać pojedynczy plik JSON, także na iPhonie przez aplikację Pliki. Nie wymaga obsługi wyboru folderu. **Eksportuj kopię lekcji** pobiera JSON zawierający wszystkie własne lekcje, dokładne odpowiedzi, grafiki oraz postępy obu trybów dla wszystkich lekcji — także wbudowanych. Obejmuje również dane dostępne tylko w bieżącej sesji. Plik można przenieść na inny komputer lub telefon i odtworzyć bez dostępu do oryginalnych folderów. Grafiki wbudowanych lekcji nie są powielane w kopii. Nowy format kopii (wersja 2) zachowuje identyfikatory kart i postępy; import nadal obsługuje starsze kopie (wersja 1), które zawierają same własne lekcje. Kopia zastępuje zawarte w niej postępy dla danej lekcji i trybu, pozostawiając pozostałe zapisy. Import o tej samej nazwie zastępuje poprzednią własną lekcję, zachowując pozostałe lekcje oraz materiały wbudowane.

Przed importem sprawdzane są wszystkie dane i obrazy. Uszkodzona kopia nie zastępuje wcześniejszych danych. Zapis lekcji i postępów z kopii odbywa się w jednej transakcji IndexedDB. Baza `fiszki-local-lessons` jest migrowana z wersji 1 do 2 przez dodanie magazynu `progress`; dotychczasowy magazyn `lessons` i jego grafiki pozostają zachowane. Postępy przechowują identyfikatory i sygnatury treści, bez tymczasowych blob URL. Aplikacja wykonuje rzeczywistą próbę zapisu; komunikat **Zapisano lokalnie** pojawia się dopiero po zatwierdzeniu transakcji. Jeśli przeglądarka zabrania zapisu lub brakuje miejsca, import pozostaje dostępny **tylko w bieżącej sesji**. Odpowiedni dopisek jest widoczny na liście; należy wyeksportować kopię przed odświeżeniem lub zamknięciem strony.

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
npm run preview:pwa -- --port 4176 --strictPort
```

Do lokalnego sprawdzenia tej wersji:

```bash
# Serwer developerski (bez service workera):
npm run dev -- --port 5176 --strictPort
# http://127.0.0.1:5176/

# W drugim terminalu: produkcyjny build PWA i podgląd:
npm run build:pwa
npm run preview:pwa -- --port 4176 --strictPort
# http://127.0.0.1:4176/aplikacja-fiszki---python-web/
```

`preview:pwa` służy do sprawdzenia produkcyjnej wersji lokalnie. Otwórz adres podany przez Vite z dopisanym `/aplikacja-fiszki---python-web/`. Zwykły `build` ma względną bazę `./` i działa na statycznym hostingu pod dowolnym podkatalogiem. Build PWA wymaga ustalenia bazy przed budowaniem.

Vite, manifest (`id`, `start_url`, `scope`), rejestracja workera, ikony i grafiki korzystają z tego samego prefiksu **`/aplikacja-fiszki---python-web/`**. Dla innego hostingu można ustawić `PWA_BASE_PATH=/inna-sciezka/` podczas budowania. Stabilny identyfikator aplikacji nie zmienia się pomiędzy wersjami. Publikuj cały `dist-pwa/`, bez dołączania plików z `dist-offline/`.

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

- `test:e2e`: build statyczny pod `/fiszki/`, szuflady, partie, wznawianie, reset, kopie postępów, pełna nauka klasyczna i importy; widoki komputera, telefonu i tabletu.
- `test:offline`: HTML rozpakowany z ZIP w osobnym katalogu, adres `file://`, sieć wyłączona i `fetch` zablokowany. Sprawdzane są wszystkie 354 obrazy, pełna seria i kolejne powtórki, zakończenie nauki, kopie JSON, brak IndexedDB, brak miejsca oraz wznowienie szuflad.
- `test:pwa`: produkcyjny build pod rzeczywistą ścieżką repozytorium, bez serwera Vite dev. Obejmuje pełny precache, błąd i ponowienie pobierania, naprawę cache, odczyt wszystkich grafik offline, ponowne uruchomienie przeglądarki z tym samym profilem, plik kopii oraz aktualizację z drugiego produkcyjnego buildu bez utraty importów i postępów.

Zrzuty i ślady trafiają do `test-results/`, `test-results-offline/` oraz `test-results-pwa/`. Wyniki rzeczywiście wykonanych kontroli i ograniczenia zapisano w [raporcie weryfikacji](docs/WERYFIKACJA.md). [Instrukcja lokalnego sprawdzenia szuflad](docs/SZUFLADY.md) zawiera adresy i scenariusze ręczne. Fizyczny iPhone i Android wymagają osobnego sprawdzenia według [checklisty mobilnej](docs/TESTY-MOBILNE.md).
