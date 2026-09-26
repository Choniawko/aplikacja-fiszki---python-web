# Fiszki w przeglądarce

Wersja React + TypeScript + Vite aplikacji z [repozytorium Pythona](https://github.com/Sobestian/aplikacja-fiszki---python). Zachowuje wybór lekcji, losową kolejność kart i powtarzanie wyłącznie błędnych odpowiedzi aż do zaliczenia wszystkich kart. Wygląd opiera się na prostym, jasnoszarym oknie oryginału, z dostosowaniem do telefonu i tabletu.

Oryginalny `../fiszki.py`, zależności Pythona i `../dane/` pozostają niezależne od wersji webowej. Materiały źródłowe sprawdzono na rewizji `cc8cb8e`: **Symbole elektryczne popularne — 134 grafiki**, **Symbole elektryczne wszystkie — 220 grafik**. Wszystkie 354 pliki trafiają do buildu bez zmiany zawartości. Aplikacja nie pobiera obrazów z GitHuba podczas nauki.

## Wymagania i uruchomienie

Node.js **24 lub nowszy**, npm i współczesna przeglądarka. Z głównego folderu repozytorium:

```bash
cd web
npm ci
npm run dev
```

Otwórz adres podany przez Vite, domyślnie **http://127.0.0.1:5173**. Przed uruchomieniem serwera skrypt automatycznie odczytuje `../dane/` i przygotowuje manifest oraz lokalne kopie grafik. Zatrzymaj serwer przez `Ctrl+C`.

Aby sprawdzić aplikację na telefonie w tej samej sieci, uruchom `npm run dev -- --host 0.0.0.0` i otwórz na telefonie adres IP komputera z portem podanym przez Vite.

## Nauka

1. Wybierz lekcję i naciśnij **Rozpocznij lekcję**. Pierwsza lekcja na liście jest zaznaczona domyślnie. Lista jest sortowana po nazwach bez uwzględniania wielkości liter, tak jak w Pythonie.
2. Kliknij grafikę, aby poznać odpowiedź. Odpowiedź jest nazwą pliku bez ostatniego rozszerzenia; spacje, polskie znaki, interpunkcja i wcześniejsze kropki zostają zachowane.
3. Wybierz czerwone **✗** (błąd) albo zielone **✓** (poprawna odpowiedź). Ocenianie jest dostępne dopiero po odsłonięciu odpowiedzi.
4. Po pierwszej serii aplikacja tasuje i powtarza błędne karty. Kolejne rundy zawierają tylko błędy z poprzedniej rundy.
5. **Powrót do listy lekcji** kończy bieżącą sesję. Ponowne rozpoczęcie tasuje całą lekcję od nowa. Sesja nauki nie jest zapisywana po odświeżeniu strony.

Klawiatura: **Tab / Shift+Tab** przenosi fokus, **strzałki** zmieniają lekcję na liście, **Enter / Spacja** aktywują przyciski i odkrywają grafikę. Fokus wraca do grafiki przy każdej nowej karcie. Nazwy dostępne dla czytnika ekranu i tekst alternatywny grafiki nie ujawniają odpowiedzi przed jej odkryciem. Grafiki zachowują proporcje, mieszczą się w obszarze do 500 × 350 px i nie są powiększane ponad oryginalne rozmiary.

## Dodawanie materiałów do projektu

Dodaj folder bezpośrednio do `dane/`, obok istniejących lekcji:

```text
dane/
  Moja nowa lekcja/
    Żółty przewód.png
    Łącze...wersja 2.JPG
```

Nazwa folderu jest nazwą lekcji. Obsługiwane są **PNG, JPG, JPEG, BMP, GIF i WebP**, niezależnie od wielkości liter rozszerzenia. Podfoldery wewnątrz lekcji i pozostałe pliki są pomijane, zgodnie ze sposobem odczytu materiałów w Pythonie. Puste foldery lekcji są widoczne na liście i mają odpowiedni komunikat przy próbie uruchomienia.

Nie trzeba edytować kodu ani ręcznie spisywać kart. **Uruchom ponownie `npm run dev` albo wykonaj `npm run build`** po zmianie materiałów. W trakcie działającego serwera można też wykonać `npm run generate:lessons` i odświeżyć stronę. Katalog `public/generated/` jest w całości generowany; nie edytuj go ręcznie. Brak `dane/` nie blokuje korzystania z importu przeglądarkowego.

## Import folderu w przeglądarce

Kliknij **Importuj folder lekcji** i wybierz jeden folder zawierający obrazy. Przeglądarka udostępnia tylko pliki wybrane przez użytkownika; aplikacja nie przegląda samodzielnie dysku. Foldery mogą też zawierać inne pliki, które zostaną pominięte. Grafiki muszą znajdować się bezpośrednio w wybranym folderze.

Przed zapisem aplikacja odczytuje i sprawdza każdą grafikę. Uszkodzony lub nieczytelny plik przerywa import całej lekcji. Nazwa folderu oraz odpowiedzi i kopie obrazów są zapisywane w **IndexedDB** (`fiszki-local-lessons`, magazyn `lessons`). Sukces jest pokazywany dopiero po zatwierdzeniu transakcji. Lekcja pozostaje dostępna po odświeżeniu i ponownym otwarciu strony. Ponowny import folderu o tej samej nazwie zastępuje poprzednią importowaną lekcję; wbudowana lekcja o tej nazwie pozostaje osobnym wpisem. Lokalne lekcje mają dopisek „(import)”.

Dane należą do konkretnej przeglądarki, profilu i adresu strony (protokół, domena, port); podścieżki tego samego adresu współdzielą bazę. Zmiana portu lub domeny oznacza inną bazę. Dane nie są wysyłane na serwer, nie są synchronizowane między urządzeniami i nie aktualizują się po zmianie plików na dysku — wtedy trzeba ponownie zaimportować folder.

Wyczyszczenie danych strony usuwa importy. Tryb prywatny może je usunąć po zamknięciu okna; przeglądarka może też ograniczyć lub zwolnić zajęte miejsce. Zachowaj oryginalne foldery. Niedostępny IndexedDB, brak miejsca, nieobsługiwany wybór folderu i błędy odczytu mają komunikaty w aplikacji; wbudowane lekcje nadal działają. Jeśli przeglądarka nie umożliwia wyboru folderu (np. niektóre przeglądarki mobilne), można używać wbudowanych lekcji lub dodać materiały do `dane/` przed budowaniem.

## Weryfikacja

```bash
npm run typecheck
npm test
npm run build
```

Testy używają wbudowanego test runnera Node.js oraz `fake-indexeddb`. Obejmują wszystkie poprawne odpowiedzi, mieszane odpowiedzi, kilka kolejnych powtórek, lekcję z jedną kartą, reset, nieaktywne ocenianie, wielokrotne i opóźnione zdarzenia, generowanie materiałów, import, zapis i ponowne otwarcie IndexedDB, brak miejsca oraz przerwanie transakcji.

Testy przeglądarkowe Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

Jeśli system nie jest obsługiwany przez przeglądarki dostarczane z Playwright, ale ma zainstalowany Google Chrome:

```bash
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

Testy same budują i uruchamiają aplikację pod **http://127.0.0.1:4174/fiszki/**. Port 4174 musi być wolny. Sprawdzają widoki **800 × 650**, **390 × 844** i **768 × 1024**, pełną lekcję 134 kart z dwiema powtórkami, import przez wybór folderu i odtworzenie po odświeżeniu, klawiaturę, długie odpowiedzi, błędy i blokady oceniania. Zrzuty ekranu są zapisywane w `test-results/`; w razie błędu powstaje też ślad Playwright. Emulacja telefonu/tabletu sprawdza układ i dotyk w Chromium, nie zastępuje testu na fizycznym urządzeniu ani w Safari/Firefox.

Weryfikacja wykonana 26.09.2026: TypeScript, **18 testów logiki i danych**, **27 testów przeglądarkowych** i build produkcyjny zakończyły się sukcesem. Po zmianie sposobu nadawania identyfikatorów sesji ponownie przeszły trzy testy resetu i szybkich kliknięć oraz build z kontrolą TypeScript. Środowisko: Node.js 24.18.0, macOS 12.7.6, zainstalowany Google Chrome 150.0.7871.125 (`PLAYWRIGHT_CHANNEL=chrome`). Standardowe pobieranie przeglądarek obecnego Playwright nie obsługuje tego macOS. Porównanie SHA-256 potwierdziło identyczność wszystkich 354 grafik źródłowych i kopii w buildzie. Nie przeprowadzano testów Safari ani Firefox.

Przykładowe zrzuty: [menu na komputerze](docs/screenshots/desktop-menu.png), [nauka na komputerze](docs/screenshots/desktop-study.png), [menu na telefonie](docs/screenshots/mobile-menu.png), [nauka na telefonie](docs/screenshots/mobile-study.png).

## Build i statyczny hosting

```bash
npm run build
npm run preview
```

Gotowa aplikacja znajduje się w **`web/dist/`**. Skopiuj **całą zawartość** tego katalogu na dowolny hosting statyczny — łącznie z `assets/` i `generated/`. Backend, konta i chmura nie są potrzebne.

Konfiguracja Vite ma `base: './'`, więc ten sam build działa w katalogu głównym i pod podścieżką, np. `/fiszki/`. Używaj adresu z końcowym `/` lub przekierowania serwera na taki adres. Aplikacja nie używa routingu wymagającego reguł przepisywania adresów. Uruchamiaj ją przez HTTP(S), a nie przez dwuklik `index.html` (`file://`). Aplikacja nie ma service workera ani gwarancji działania offline; do wczytania strony i materiałów wbudowanych potrzebny jest działający serwer statyczny.

## Struktura

- `src/domain/` — niezależna logika lekcji, tasowania i sesji.
- `src/data/` — odczyt materiałów, import i IndexedDB bez dodatkowej biblioteki produkcyjnej.
- `src/components/` — wybór lekcji i ekran nauki; `src/styles.css` — zwykły CSS.
- `scripts/generate-lessons.ts` — automatyczne wykrywanie i kopiowanie materiałów.
- `tests/` — testy logiki, danych i generatora; `e2e/` — testy przeglądarkowe.

Jedynymi zależnościami wykonawczymi są React i React DOM. Nie dodano backendu, kont, analityki ani zmiany algorytmu powtórek.
