# Weryfikacja szuflad, dystrybucji offline i PWA

Data: **27.09.2026**. Środowisko: macOS 12.7.6, Node.js 24.18.0, **Google Chrome 150.0.7871.125**, Playwright z `PLAYWRIGHT_CHANNEL=chrome`.

## Wyniki wykonanych kontroli

| Kontrola | Wynik |
| --- | --- |
| TypeScript (`tsc --noEmit`) | poprawnie |
| Testy logiki sesji, importów, kopii i IndexedDB | 37 zaliczonych |
| Produkcyjna aplikacja webowa pod `/fiszki/` | 39 zaliczonych scenariuszy, komputer / telefon / tablet |
| Samodzielny HTML, `file://`, sieć wyłączona | 4 zaliczone scenariusze |
| Produkcyjny build PWA pod `/aplikacja-fiszki---python-web/` | 6 zaliczonych scenariuszy |
| Build zwykły, `build:offline`, `build:pwa` | poprawnie |
| Osadzenie danych w HTML | 2 lekcje, 354 grafiki; bajty wszystkich obrazów zgodne ze źródłem |
| Precache PWA | 364 unikalne wymagane zasoby, w tym 354 grafiki; wszystkie mieszczą się w limicie 8 MiB na plik |
| Workflow Pages | poprawny YAML; zadania budowania/testów i osobna, ręczna publikacja |

Testy wykonano na gałęzi `feat/learning-boxes`. Pełny zestaw webowy zaliczył 36 scenariuszy; po końcowych poprawkach układu, resetu i komunikatów zapisu powtórzono 15 scenariuszy, w tym 3 nowe sprawdzające niezależność obu trybów. Łącznie pokryto 39 różnych scenariuszy webowych. PWA i HTML sprawdzono na końcowych buildach.

Nie zmieniono `.github/workflows/pages.yml`, nie scalano do `main` i nie uruchamiano publikacji Pages. [Uruchomienie lokalne i lista testów ręcznych](SZUFLADY.md).

## Co sprawdzono

HTML rozpakowano z gotowego ZIP do odrębnego katalogu tymczasowego, bez innych zasobów. Otwarto adres `file://` ze spacjami i polskimi znakami w nazwie. Połączenie sieciowe kontekstu przeglądarki było wyłączone; dodatkowo każde wywołanie `fetch`, w tym lokalnego pliku, było blokowane i rejestrowane. Nie wystąpiło żadne takie wywołanie ani pobieranie zewnętrznych zasobów. Zdekodowano wszystkie 354 osadzone grafiki. Sprawdzono wybór obu lekcji, pełne 134 karty, kolejne powtórki błędów i zakończenie nauki.

Testy jednostkowe sprawdzają trzy poprawne prezentacje karty, cofnięcie po błędzie w każdej szufladzie, kolejkę FIFO, stały skład partii, brak duplikatów, mniejszą końcówkę, świadome rozpoczęcie kolejnej partii, ostatnią kartę, stare tokeny i podwójne kliknięcia. Sprawdzono wznowienie obu trybów, ukrywanie odpowiedzi oraz uzgodnienie postępów po dodaniu, usunięciu lub zmianie materiałów.

Test migracji tworzy bazę IndexedDB v1 z własną lekcją i obrazem, otwiera ją nowym kodem, zapisuje postęp, odczytuje go ponownie oraz resetuje bez usuwania materiałów. Osobne testy wymuszają abort transakcji i błąd zapisu postępów podczas importu kopii: poprzednie materiały pozostają zachowane. Nieprawidłowe postępy są pomijane z komunikatem. Kopie v1 i v2 są obsługiwane, a v2 zachowuje identyfikatory kart.

W przeglądarce sprawdzono partię 10 kart z lekcji 11-kartowej, pełne ukończenie i ostatnią partię 1-kartową, wznowienie po odświeżeniu, potwierdzenie/anulowanie resetu, przenoszenie postępów kopią JSON i niezależność trybu klasycznego od szuflad. Obejrzano zrzuty komputera i emulowanego telefonu; nie stwierdzono poziomego przewijania. Po obejrzeniu poprawiono układ wyboru trybu na wąskim ekranie.

Import i eksport kopii testowano z poprawnym IndexedDB, odmową dostępu do niego oraz błędem braku miejsca. Bez zapisu lekcje działały w bieżącej sesji, nie pojawiał się fałszywy komunikat o zapisaniu, a eksportowany JSON zawierał odpowiedzi i obrazy. Po odświeżeniu odtworzono lekcje z pliku kopii.

PWA testowano z plików produkcyjnego buildu na zwykłym serwerze statycznym pod docelową podścieżką, nie przez Vite dev. Wstrzymano pobranie jednej z grafik i potwierdzono brak komunikatu gotowości do czasu jej zapisania. Błąd HTTP pobierania można było ponowić, a celowo usunięty element cache został wykryty i naprawiony.

Po odcięciu sieci i ponownym otwarciu strony wszystkie 354 grafiki, także wcześniej nieoglądane, dawały się zdekodować. Osobny test zamknął proces przeglądarki i ponownie uruchomił go z tym samym profilem i wyłączoną siecią: PWA, własna lekcja i postęp w szufladzie 2 nadal były dostępne, a odpowiedź po wznowieniu pozostawała ukryta.

Test aktualizacji zbudował drugą wersję przez Vite, z innym pakietem JavaScript, HTML i identyfikatorem workera. Oczekiwanie na aktualizację i „Później” zachowały bieżącą kartę oraz odpowiedź. Dopiero świadome wybranie przeładowania aktywowało nową wersję. Własne lekcje i postęp w szufladach zostały zachowane, działały offline i nadal można było je eksportować. Poprzedni zasób JS pozostawał osiągalny offline z zachowanego cache dla starszych kart aplikacji.

## Ograniczenia i kontrola na telefonie

**Nie wykonywano testów na prawdziwym iPhonie ani Androidzie. Nie testowano Safari ani Firefox.** Mobilne wymiary, dotyk i sygnał standalone były emulowane w desktopowym Chrome. Nie stanowi to potwierdzenia działania na fizycznym urządzeniu.

[Checklista testu na telefonie](TESTY-MOBILNE.md) obejmuje instalację, rzeczywisty tryb samolotowy, zamknięcie aplikacji, safe area, zoom, import pliku z aplikacji Pliki, eksport, aktualizację i zachowanie danych.

Nie publikowano GitHub Release ani nowej wersji GitHub Pages. Nowe funkcje pozostają na gałęzi roboczej do lokalnego sprawdzenia. Wersja HTTPS po późniejszej publikacji wymaga osobnego sprawdzenia na urządzeniu.

Zrzuty: [menu na komputerze](screenshots/boxes-menu-desktop.png), [menu telefonu — emulacja](screenshots/boxes-menu-mobile.png), [nauka na komputerze](screenshots/boxes-study-desktop.png), [nauka na telefonie — emulacja](screenshots/boxes-study-mobile.png).
