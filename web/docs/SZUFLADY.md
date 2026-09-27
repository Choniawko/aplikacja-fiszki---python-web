# Nauka w szufladach — lokalna weryfikacja

Wersja robocza: gałąź `feat/learning-boxes`. Zasady publikacji pozostają bez zmian. Ta gałąź nie publikuje zmian na GitHub Pages.

## Uruchomienie

Z głównego katalogu repozytorium:

```bash
cd web
npm ci
npm run dev -- --port 5176 --strictPort
```

Tryb developerski: **http://127.0.0.1:5176/** — bez service workera.

W drugim terminalu, również w `web/`:

```bash
npm run build:pwa
npm run preview:pwa -- --port 4176 --strictPort
```

Podgląd produkcyjnego PWA: **http://127.0.0.1:4176/aplikacja-fiszki---python-web/**.
Jeśli przeglądarka ma poprzednią lokalną wersję, rozwiń „Instalacja i aktualizacje”, sprawdź aktualizacje i zaakceptuj przeładowanie.

```bash
npm run build:offline
```

Samodzielny HTML: `dist-offline/fiszki.html`. Paczka: `fiszki-offline.zip`. Rozpakuj ZIP do osobnego folderu i otwórz HTML bez serwera. Do uruchomienia gotowego HTML użytkownik nie potrzebuje npm ani Node.js.

## Scenariusze ręczne

- [ ] Sprawdź wybór partii 10 / 20 / 30 / 50, domyślną wartość 20 oraz postępy na liście lekcji.
- [ ] Na małej własnej lekcji przeprowadź kartę przez szuflady 1 → 2 → 3 → zaliczenie. Popełnij błąd w szufladzie 3 i sprawdź powrót do 1. Ostatnią kartę odsłaniaj osobno przed każdą oceną.
- [ ] Ukończ partię. Sprawdź, że nowe karty pojawiają się dopiero po „Następna partia”, a końcówka lekcji może być mniejsza.
- [ ] Odśwież po potwierdzeniu zapisu, wróć z menu i ponownie otwórz aplikację. „Wznów naukę” powinno odtworzyć kolejkę z ukrytą odpowiedzią.
- [ ] Zmień tryb na klasyczny. Sprawdź niezależne postępy i powtarzanie wyłącznie błędów. Anuluj, a potem potwierdź reset postępów; grafiki własnej lekcji powinny pozostać.
- [ ] Wyeksportuj kopię z postępami, odtwórz ją w innym profilu i sprawdź wznowienie. Wczytaj też starszą kopię z samymi lekcjami.
- [ ] Sprawdź długie odpowiedzi, dotyk, klawiaturę, powiększenie, fokus, pion/poziom i ustawienie ograniczające animacje.
- [ ] W PWA poczekaj na „Gotowe do nauki offline”, odłącz sieć, zamknij okno i uruchom ponownie. Sprawdź także nieoglądane wcześniej grafiki.
- [ ] Przy aktualizacji pozostaw rozpoczętą naukę. „Później” nie powinno jej przerywać; po świadomym przeładowaniu sprawdź wznowienie i własne lekcje.

## Zapis i zgodność danych

Baza `fiszki-local-lessons` przechodzi z wersji 1 do 2. Migracja dodaje magazyn `progress` i zachowuje `lessons`. Postępy są oddzielne dla każdej lekcji i trybu; zawierają identyfikatory kart, kolejkę, szuflady, liczniki i sygnatury materiałów, bez adresów obrazów. Zmiana adresu buildu lub nowy blob URL nie zmienia identyfikatorów.

Zmieniona odpowiedź lub grafika resetuje tylko postęp tej karty. Usunięte karty wypadają z kolejki, a dodane czekają na następną partię. Własna lekcja zastępowana importem o tej samej nazwie jest uzgadniana według tych samych zasad. Inna nazwa folderu tworzy inną lekcję.

Kopia v2 obejmuje własne obrazy i postępy wszystkich lekcji. Kopie v1 nadal można importować. Import kopii zapisuje materiały oraz postępy atomowo. Uszkodzona kopia nie zastępuje bieżących danych. Uszkodzone rekordy postępów w bazie są pomijane z komunikatem, bez usuwania materiałów.

Zapis następuje po każdej ocenie; potwierdzenie pojawia się dopiero po zakończeniu transakcji. Zamknięcie przeglądarki przed zakończeniem zapisu lub usunięcie danych przez system może utracić ostatnią zmianę. Przy odmowie zapisu nauka działa w pamięci do zamknięcia strony i można ją wyeksportować. Równoległe okna nie synchronizują aktywnej sesji — obowiązuje ostatni zapis.

## Zakres testów urządzeń

Testy rozmiaru telefonu i tabletu są **emulacją w desktopowym Google Chrome**, nie testami na prawdziwym iPhonie lub Androidzie. Osobny test na telefonie wymaga adresu HTTPS; HTTP pod adresem IP komputera zwykle nie pozwala uruchomić service workera. Lokalny `localhost` korzysta z wyjątku dla zaufanego kontekstu.
