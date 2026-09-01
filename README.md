# Strona WWW — formularz rodzinny

Neutralna ankieta do projektu „Cyfrowy model Stanisława Szukalskiego”. Respondent widzi tylko ponumerowane widoki i trzy odpowiedzi: TAK / NIE / NIE WIEM. Odpowiedzi są zapisywane w prywatnym Google Sheet, a administrator może pobrać CSV lub JSON.

## Co było przyczyną wcześniejszego problemu

W poprzednim prototypie `__API_URL__` pozostawał pustym miejscem. Strona nie miała wtedy serwera, więc każdy kod wyglądał jak nieprawidłowy. Nowa wersja wyświetla osobny komunikat o braku konfiguracji i pozwala podać adres API parametrem `?api=`.

## Pliki

- `index.html` — strona GitHub Pages; 35 dużych widoków i zapis roboczy w przeglądarce.
- `assets/faces/01.jpg`–`35.jpg` — ujednolicone, neutralne widoki.
- `backend/Code.gs` — Google Apps Script: tworzenie kodów, jednorazowy zapis, status, eksport CSV/JSON.
- `backend/URUCHOMIENIE.md` — instrukcja konfiguracji krok po kroku.

## Szybkie uruchomienie

1. Utwórz prywatny Google Sheet i otwórz w nim Apps Script.
2. Wklej `backend/Code.gs`, zapisz i uruchom `setupSurvey()` (za pierwszym razem Google poprosi o zgodę). Funkcja tworzy zakładki `Kody` i `Odpowiedzi` oraz losuje kody dla ośmiu osób. Kody jawne pozostają tylko w prywatnym arkuszu.
3. Uruchom `setAdminCodeFromPrompt()` i ustaw osobny pięciocyfrowy kod administratora. Nie wpisuj go do HTML ani do repozytorium.
4. Wdróż skrypt jako aplikację internetową (wykonuje: Ty; dostęp: każdy, kto ma link) i skopiuj adres kończący się na `/exec`.
5. W `index.html` zamień `__API_URL__` na adres `/exec`, albo otwórz stronę z dopiskiem `?api=ADRES_EXEC`.
6. Otwórz stronę i sprawdź kod testowy. Po wysłaniu kod zostaje zużyty, odpowiedź trafia do arkusza.
7. Aby pobrać dane: wpisz kod administratora, wybierz `Pobierz CSV` lub `Pobierz JSON`. Plik zostanie pobrany z przeglądarki administratora; dane nie są publiczne.

## Zarządzanie rundą

- `generateFamilyCodes()` generuje kody tylko wtedy, gdy zakładka `Kody` jest pusta.
- `resetSurveyForNewRound()` czyści odpowiedzi i kody — używaj wyłącznie przed nową rundą.
- Nie udostępniaj arkusza Google Sheet rodzinie. Rodzina otrzymuje wyłącznie stronę i własny kod.

## Neutralność i prywatność

Publiczny status pokazuje tylko „wysłano/oczekuje”, bez treści ocen. Kod administratora jest przechowywany jako hash w Script Properties, a sesja administratora działa czasowo w pamięci serwera. Pięciocyfrowe kody są wygodne, ale nie są silnym zabezpieczeniem; traktuj je jak jednorazowe zaproszenia.
