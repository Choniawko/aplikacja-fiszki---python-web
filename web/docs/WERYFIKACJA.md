# Weryfikacja dystrybucji offline i PWA

Data: **27.09.2026**. Środowisko: macOS 12.7.6, Node.js 24.18.0, **Google Chrome 150.0.7871.125**, Playwright z `PLAYWRIGHT_CHANNEL=chrome`.

## Wyniki wykonanych kontroli

| Kontrola | Wynik |
| --- | --- |
| TypeScript (`tsc --noEmit`) | poprawnie |
| Testy logiki sesji, importów, kopii i IndexedDB | 24 zaliczone |
| Produkcyjna aplikacja webowa pod `/fiszki/` | 27 zaliczonych scenariuszy, komputer / telefon / tablet |
| Samodzielny HTML, `file://`, sieć wyłączona | 3 zaliczone scenariusze |
| Produkcyjny build PWA pod `/aplikacja-fiszki---python-web/` | 6 zaliczonych scenariuszy |
| Build zwykły, `build:offline`, `build:pwa` | poprawnie |
| Osadzenie danych w HTML | 2 lekcje, 354 grafiki; bajty wszystkich obrazów zgodne ze źródłem |
| Precache PWA | 364 unikalne wymagane zasoby, w tym 354 grafiki; wszystkie mieszczą się w limicie 8 MiB na plik |
| Workflow Pages | poprawny YAML; zadania budowania/testów i osobna, ręczna publikacja |

Pierwszy pełny test HTML przekroczył 120 sekund przy równoległym uruchomieniu kilku zestawów przeglądarkowych. Po ograniczeniu tego zestawu do jednego workera i zwiększeniu limitu do 240 sekund powtórzony pełny scenariusz zakończył się poprawnie w około 34 sekundy. Pozostałe dwa scenariusze HTML przeszły już w pierwszym przebiegu.

## Co sprawdzono

HTML rozpakowano z gotowego ZIP do odrębnego katalogu tymczasowego, bez innych zasobów. Otwarto adres `file://` ze spacjami i polskimi znakami w nazwie. Połączenie sieciowe kontekstu przeglądarki było wyłączone; dodatkowo każde wywołanie `fetch`, w tym lokalnego pliku, było blokowane i rejestrowane. Nie wystąpiło żadne takie wywołanie ani pobieranie zewnętrznych zasobów. Zdekodowano wszystkie 354 osadzone grafiki. Sprawdzono wybór obu lekcji, pełne 134 karty, kolejne powtórki błędów i zakończenie nauki.

Import i eksport kopii testowano z poprawnym IndexedDB, odmową dostępu do niego oraz błędem braku miejsca. Bez zapisu lekcje działały w bieżącej sesji, nie pojawiał się fałszywy komunikat o zapisaniu, a eksportowany JSON zawierał odpowiedzi i obrazy. Po odświeżeniu odtworzono lekcje z pliku kopii.

PWA testowano z plików produkcyjnego buildu na zwykłym serwerze statycznym pod docelową podścieżką, nie przez Vite dev. Wstrzymano pobranie jednej z grafik i potwierdzono brak komunikatu gotowości do czasu jej zapisania. Błąd HTTP pobierania można było ponowić, a celowo usunięty element cache został wykryty i naprawiony.

Po odcięciu sieci i ponownym otwarciu strony wszystkie 354 grafiki, także wcześniej nieoglądane, dawały się zdekodować. Osobny test zamknął proces przeglądarki i ponownie uruchomił go z tym samym profilem i wyłączoną siecią: PWA oraz własna lekcja nadal były dostępne.

Test aktualizacji zbudował drugą wersję przez Vite, z innym pakietem JavaScript, HTML i identyfikatorem workera. Oczekiwanie na aktualizację i „Później” zachowały bieżącą kartę oraz odpowiedź. Dopiero świadome wybranie przeładowania aktywowało nową wersję. Własne lekcje zostały zachowane, działały offline i nadal można było je eksportować. Poprzedni zasób JS pozostawał osiągalny offline z zachowanego cache dla starszych kart aplikacji.

## Ograniczenia i kontrola na telefonie

**Nie wykonywano testów na prawdziwym iPhonie ani Androidzie. Nie testowano Safari ani Firefox.** Mobilne wymiary, dotyk i sygnał standalone były emulowane w desktopowym Chrome. Nie stanowi to potwierdzenia działania na fizycznym urządzeniu.

[Checklista testu na telefonie](TESTY-MOBILNE.md) obejmuje instalację, rzeczywisty tryb samolotowy, zamknięcie aplikacji, safe area, zoom, import pliku z aplikacji Pliki, eksport, aktualizację i zachowanie danych.

Nie publikowano GitHub Release ani nie włączano Pages przez zmianę ustawień konta. Wdrożenie wymaga włączenia **Settings → Pages → Source: GitHub Actions** oraz ręcznego uruchomienia workflow. Adres HTTPS po publikacji wymaga osobnego sprawdzenia na urządzeniu.

Przykładowy [zrzut PWA w emulowanym widoku telefonu](screenshots/pwa-mobile.png).
