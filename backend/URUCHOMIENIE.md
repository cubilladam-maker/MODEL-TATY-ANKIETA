# Uruchomienie systemu ankiety

## A. Prywatny arkusz i backend

1. Utwórz nowy, prywatny Google Sheet.
2. Wybierz **Rozszerzenia → Apps Script**, usuń przykładowy kod i wklej zawartość `Code.gs`.
3. Zapisz projekt. Uruchom funkcję `setupSurvey()` i zaakceptuj uprawnienia Google. Powstaną zakładki `Kody` i `Odpowiedzi`, a `Kody` otrzyma osiem losowych kodów rodzinnych.
4. Uruchom `setAdminCodeFromPrompt()` i ustaw osobny kod administratora. Kod wpisujesz tylko w oknie Apps Script — nigdy do HTML, GitHub ani wiadomości dla rodziny.
5. W Apps Script wybierz **Wdróż → Nowe wdrożenie → Aplikacja internetowa**. Ustaw „Wykonuje: ja” oraz „Kto ma dostęp: każdy, kto ma link”. Skopiuj adres kończący się `/exec`.

## B. Podłączenie strony

W `index.html` zamień `__API_URL__` na adres `/exec`, zapisz i opublikuj stronę. Alternatywnie pozostaw placeholder i dodaj do adresu strony `?api=` oraz wklejony adres `/exec` (parametr można zakodować przez przeglądarkę).

Po podłączeniu, przy otwieraniu strony status powinien zmienić się z „Serwer ankiety nie jest jeszcze podłączony” na listę osób. Testuj jednym kodem z zakładki `Kody`; testowy zapis zużywa kod.

## C. Tworzenie i pobieranie danych

- Każdy respondent wpisuje swój kod, zaznacza odpowiedź przy każdym widoku i wysyła formularz.
- Kod jest blokowany dopiero po poprawnym zapisie wszystkich 35 odpowiedzi.
- Wpisanie kodu administratora otwiera panel bez ujawniania wcześniejszych ocen respondentowi.
- `Pobierz CSV` tworzy plik do Excela/Arkuszy Google, a `Pobierz JSON` tworzy kopię maszynową. Oba pliki są pobierane lokalnie z przeglądarki administratora.
- Dodatkową kopię można w każdej chwili zrobić bezpośrednio w prywatnym arkuszu (Plik → Pobierz).

## D. Rozwiązywanie problemów

- „Serwer ankiety nie jest jeszcze podłączony” — adres `/exec` nie został wpisany do HTML lub parametru `?api=`.
- „Nie można połączyć z serwerem” — sprawdź, czy wdrożenie jest aktywne i ma dostęp „każdy, kto ma link”.
- „Kod niedostępny” — kod został już wysłany albo nie należy do tej rundy.
- Po zmianie `Code.gs` utwórz nowe wdrożenie lub wybierz **Zarządzaj wdrożeniami → Edytuj → Nowa wersja**; adres `/exec` pozostaje ten sam.
