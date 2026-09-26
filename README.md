Prosta aplikacja stworzona na własne potrzeby.
W zakładce RELEASES są dostępne dwie wersje już skompilowane, dla linux i dla windows.

Aplikacja może zostać użyta do innych ćwiczeń. Wystarczy dodać folder z plikami graficznymi do folderu 'dane'.
- Nazwa folderu z plikami graficznymi = nazwa lekcji na ekranie głównym
- Odpowiedzi do fiszek = nazwa pliku graficznego

Instrukcja dla linuxa:
1. Pobierz .zip
2. Wypakuj pliki
3. Będąc w folderze z plikiem 'fiszki', kliknij Alt+Shift+f4 lub otwórz konsolę w tej lokalizacji
4. Wpisz w konsoli "./fiszki" i kliknij enter


Instrukcja dla windowsa:
1. Pobierz .zip
2. Wypakuj pliki
3. Uruchom 'fiszki.exe'


v0.1.0 - pierwsza wersja oprogramowania

## Wersja przeglądarkowa

W katalogu [`web/`](web/README.md) znajduje się wersja React + TypeScript + Vite,
korzystająca z tych samych materiałów w `dane/`. Oryginalna aplikacja Python pozostaje bez zmian.

```bash
cd web
npm ci
npm run dev
```

Wymagany jest Node.js 24 lub nowszy. [Instrukcja wersji webowej](web/README.md)
opisuje import folderów, lokalny zapis w IndexedDB, testy oraz budowanie na hosting statyczny.

**Telefon:** wersja PWA jest przygotowana na GitHub Pages pod adresem
`https://choniawko.github.io/aplikacja-fiszki---python-web/` po włączeniu Pages
i uruchomieniu workflow. Na iPhonie otwórz ją w Safari i wybierz
**Udostępnij → Do ekranu głównego**. Poczekaj na „Gotowe do nauki offline”.

**Komputer bez instalacji:** rozpakuj [fiszki-offline.zip](web/fiszki-offline.zip)
i otwórz `fiszki.html` w przeglądarce. Podgląd HTML w aplikacji Pliki na iPhonie
nie zastępuje wersji PWA.

[Publikacja GitHub Pages, instalacja i wszystkie tryby uruchomienia](web/README.md).
