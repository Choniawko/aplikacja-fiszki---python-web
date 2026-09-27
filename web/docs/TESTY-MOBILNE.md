# Ręczna weryfikacja na iPhonie i Androidzie

Tej listy nie oznaczono jako wykonanej na fizycznym urządzeniu. Testy automatyczne używają Chrome na komputerze i emulacji rozmiaru ekranu oraz dotyku. Nie zastępują Safari na iPhonie ani Chrome na prawdziwym Androidzie.

Zapisz model telefonu, wersję systemu, przeglądarki i datę testu.

## Pierwsza instalacja

- [ ] Otwórz **https://choniawko.github.io/aplikacja-fiszki---python-web/** w Safari na iPhonie lub Chrome na Androidzie. Nie otwieraj pobranego HTML w podglądzie aplikacji Pliki.
- [ ] Przy pierwszym wejściu widać postęp pobierania; „Gotowe do nauki offline” pojawia się dopiero po jego zakończeniu.
- [ ] Wyłącz internet w trakcie pobierania. Aplikacja nie deklaruje gotowości, pokazuje błąd i pozwala ponowić próbę po przywróceniu internetu.
- [ ] iPhone: Safari → Udostępnij → Do ekranu głównego → Dodaj. Android: menu Chrome → Zainstaluj aplikację / Dodaj do ekranu głównego.
- [ ] Ikona jest czytelna, a aplikacja otwiera się samodzielnie; instrukcja instalacji znika w trybie standalone.
- [ ] Ponownie poczekaj na gotowość wewnątrz aplikacji uruchomionej z ikony. Sprawdź importy — system może odseparować dane aplikacji od danych wcześniejszej karty Safari.

## Nauka bez połączenia

- [ ] Włącz tryb samolotowy i wyłącz Wi-Fi. Zamknij aplikację i uruchom ją ponownie z ekranu głównego.
- [ ] Obydwie lekcje są dostępne. Sprawdź też karty, których wcześniej nie oglądano.
- [ ] Odpowiedź jest ukryta do dotknięcia grafiki; wcześniej oba przyciski oceny są zablokowane.
- [ ] W szufladach wybierz partię 10 kart: przejdź 1 → 2 → 3 → zaliczenie, a po błędzie sprawdź powrót do 1. Po ukończeniu dopiero „Następna partia” dobiera nowe karty.
- [ ] Wybierz tryb klasyczny, przejdź pełną serię i pomyl się ponownie w powtórce. Każda kolejna runda zawiera wyłącznie błędne karty z poprzedniej.
- [ ] Po zaliczeniu wszystkich kart widać znak ✓ i komunikat końcowy. Powrót zachowuje ukończenie; potwierdzony reset pozwala rozpocząć od nowa.
- [ ] Sprawdź pion i poziom, wycięcie ekranu, dolny pasek systemowy, przewijanie i długie odpowiedzi. Nie ma poziomego przewijania ani kontrolek pod paskiem systemowym.
- [ ] Powiększ stronę gestem i zwiększ rozmiar tekstu. Sprawdź VoiceOver/TalkBack: tekst alternatywny nie ujawnia odpowiedzi.

## Własne lekcje i aktualizacja

- [ ] Przenieś plik JSON wyeksportowany na komputerze do telefonu. Wybierz „Importuj kopię lekcji”, wskaż ten plik w aplikacji Pliki i uruchom zaimportowaną lekcję offline.
- [ ] Wyeksportuj lekcje z telefonu. Zapisz plik w Plikach/Pobranych i odtwórz go na innym urządzeniu; obrazy i odpowiedzi są kompletne.
- [ ] Odśwież i ponownie uruchom aplikację. Sprawdź zachowanie importów i postępów; „Wznów naukę” odtwarza kolejkę z ukrytą odpowiedzią. Jeśli zapis jest zabroniony lub brakuje miejsca, komunikat wskazuje tryb sesyjny, a eksport nadal działa.
- [ ] Opublikuj kolejną wersję przez workflow Pages, a na telefonie pozostaw aktywną naukę. Po podłączeniu internetu naciśnij „Sprawdź aktualizacje”.
- [ ] Komunikat „Dostępna nowa wersja” nie przerywa lekcji. „Później” pozostawia odpowiedź i licznik bez zmian.
- [ ] Po „Przeładuj i zaktualizuj” nowa wersja działa offline; własne lekcje i postępy pozostają dostępne.

Usunięcie aplikacji, danych strony lub zwolnienie miejsca przez system może usunąć cache i importy. Wtedy trzeba ponownie pobrać materiały; kopia JSON pozwala odtworzyć własne lekcje. Nie zakładaj bezterminowego przechowywania danych przez iOS.
