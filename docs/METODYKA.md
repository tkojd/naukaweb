# Metodyka zadań - Nauka i Zabawa

Ten dokument opisuje, jak zbudowany jest KAŻDY typ zadania w KAŻDYM z czterech
modułów (Kolory, Litery, Cyfry, Angielski). Jest to nota projektowa (design note)
opisująca faktyczne, wdrożone zachowanie aplikacji, a nie plany. Służy jako lista
kontrolna zgodności z zasadami dydaktycznymi.

## Zasady (autorytatywne)

- **A. Brak wymogu czytania dla nieczytających.** Na poziomie EARLY (ok. 3-6 lat)
  każde zadanie da się rozwiązać przez OBRAZ + DŹWIĘK. Bodziec to obrazek lub
  nagranie; odpowiedzi to obrazki, kolorowe kafelki (swatch), cyfry lub pojedyncze
  litery (glify). Tekst jako nośnik treści pojawia się tylko tam, gdzie dziecko
  ćwiczy czytanie, albo na poziomie LATE (7-10 lat, czytający).
- **C1. Odpowiedź nie jest tożsama z pytaniem.** Pytanie i poprawna odpowiedź są w
  RÓŻNYCH reprezentacjach. Silnik oznacza to znacznikami `meta.promptRep` oraz
  `meta.answerRep`; test sprawdza, że są różne.
- **C2. Obraz nie zdradza odpowiedzi.** Obrazek z pytania nie pojawia się na
  poprawnej odpowiedzi, a dystraktory różnią się wizualnie od poprawnej opcji.
- **C3. Angielski uczy związku BRZMIENIE/PISOWNIA angielska <-> ZNACZENIE.** Bodźcem
  jest zawsze słowo ANGIELSKIE (wymowa, a tekst dopiero dla czytających). Poprawna
  wymowa angielska jest odtwarzana PO poprawnej odpowiedzi. Nigdy polskie słowo ani
  polskie audio jako materiał do nauki angielskiego.
- **C4. Realna progresja.** Litery: pierwsza lekcja tylko litery bez polskich
  znaków (bez ą, ę, ó, ł, ś, ć, ń, ź, ż); układanie słów (SPELL_WORD) i litery
  diakrytyczne dopiero na wyższych etapach. Analogicznie kolejność od najprostszego
  do trudniejszego w pozostałych modułach.
- **C5. Konkretne polecenia.** Każde zadanie ma jasne polecenie nazywające wprost
  to, co widać, np. „Ile gwiazdek widzisz?” z poprawną polską odmianą
  (gwiazdka / gwiazdki / gwiazdek).

Poziomy wieku: **EARLY** = 4-6 lat (nieczytający), **LATE** = 7-10 lat (czytający).
Etap (stage) to porządek odblokowywania treści; `stage 1` = pierwsza lekcja.

---

## Kolory

| Typ zadania | Poziom / etap | Pytanie (co widać / słychać) | Odpowiedź | C1 (różne reprezentacje) | C2 (obraz nie zdradza) | Czytanie? |
|---|---|---|---|---|---|---|
| MULTIPLE_CHOICE | EARLY i LATE | Słychać nazwę koloru (pl-PL); nagłówek to ikona głośnika, BEZ kafelka w kolorze docelowym. Na LATE dodatkowo widać nazwę jako tekst. | Kolorowe kafelki (swatch), bez tekstu. | prompt = spoken, answer = swatch | W nagłówku nie ma żadnego kafelka koloru, więc poprawny kafelek nie jest kopią pytania. | Nie (nazwa mówiona; tekst tylko wspiera czytających na LATE). |
| LISTEN_CHOOSE | EARLY i LATE | Duży przycisk głośnika mówi nazwę koloru (pl-PL). | Kolorowe kafelki (swatch). | prompt = spoken, answer = swatch | Nagłówek to tylko dźwięk. | Nie. |
| MATCH_PAIRS | EARLY i LATE | Karty „dźwiękowe” (głośnik) mówiące nazwę koloru; na LATE karta pokazuje też nazwę jako tekst. | Kolorowe kafelki (swatch) do połączenia. | słowo/dźwięk vs kafelek koloru | Karta dźwiękowa nie pokazuje koloru; para rozwiązywana słuchem. | Nie na EARLY (dźwięk); tekst nazwy koloru dopiero na LATE. |
| TRUE_FALSE | LATE (wyższy etap) | Pokazany kafelek koloru; słychać (i na LATE widać) nazwę koloru; pytanie: czy pasuje? | Duże przyciski „Tak” / „Nie”. | swatch (pytanie) vs decyzja tak/nie | Kafelek pokazuje kolor, ale nie zdradza, czy wypowiedziana nazwa jest prawdziwa. | Kontrolki Tak/Nie nie są czytaniem treści; nazwa mówiona. |
| WHICH_MATCHES (znajdź kolor w scenie) | LATE (wyższy etap) | Ilustracja sceny (emoji) + nazwa szukanego koloru (mówiona; podpis „Znajdź kolor: …”). | Kolorowe kafelki (swatch) ze sceny. | spoken (pytanie) vs swatch (odpowiedź) | Poprawny kafelek nie jest pokazany w nagłówku. | Podpis wspiera; rozwiązanie możliwe słuchem (nazwa mówiona) i po kolorze. |

Naprawiony zarzut użytkownika: dawne zadanie ze słowem „jasnoniebieski” na
jasnoniebieskim tle i identycznym kafelkiem wśród odpowiedzi już nie istnieje -
nagłówek nigdy nie zawiera kafelka koloru docelowego, a łączenie w pary na EARLY
nie wymaga czytania nazwy koloru.

## Litery

| Typ zadania | Poziom / etap | Pytanie | Odpowiedź | C1 | C2 | Czytanie? |
|---|---|---|---|---|---|---|
| MULTIPLE_CHOICE | LATE (i wyższe etapy) | Słychać głoskę litery (pl-PL) + obrazek słowa-przykładu (np. 🍉 dla „A”). | Glify liter do wskazania. | picture/dźwięk vs glif litery | Obrazek słowa-przykładu przedstawia inne pojęcie niż sama litera; odpowiedź to glif w innej reprezentacji. | Rozpoznawanie pojedynczej litery, nie czytanie słów. |
| LISTEN_CHOOSE | EARLY i LATE | Głośnik mówi głoskę litery (pl-PL). | Glify liter. | spoken vs glif | Nagłówek to dźwięk. | Nie (rozpoznanie glifu). |
| MATCH_PAIRS | EARLY i LATE | Karta z pojedynczym glifem litery (cel rozpoznania) + wymowa głoski. | Obrazek słowa-przykładu do połączenia. | glif litery vs obrazek | Obrazek to słowo-przykład, nie sama litera. | Pojedynczy glif to cel rozpoznania, nie czytanie. |
| TRUE_FALSE | EARLY i LATE | Obrazek słowa-przykładu + mówione słowo; czy pasuje? | „Tak” / „Nie”. | picture vs decyzja | Obrazek nie zdradza prawdy/fałszu. | Nie (słowo mówione). |
| SPELL_WORD (układanie słowa) | Tylko LATE, wyższy etap | Obrazek/słowo-cel; zbuduj słowo z kafelków liter. | Ułożona sekwencja liter. | - (zadanie dla czytających) | - | Tak - celowo tylko dla czytających (LATE), nigdy na EARLY ani na 1. etapie liter. |

Progresja (C4): pierwszy etap liter zawiera wyłącznie litery bez polskich znaków
diakrytycznych (bez ą, ę, ó, ł, ś, ć, ń, ź, ż) i wyłącznie zadania rozpoznawcze.
Litery diakrytyczne oraz SPELL_WORD odblokowują się na wyższych etapach. Na EARLY
SPELL_WORD nie pojawia się nigdy.

## Cyfry

| Typ zadania | Poziom / etap | Pytanie | Odpowiedź | C1 | C2 | Czytanie? |
|---|---|---|---|---|---|---|
| COUNT_CHOOSE (policz i wybierz) | EARLY i LATE | Grupa policzalnych obrazków (np. ⭐⭐⭐) + konkretne polecenie „Ile gwiazdek widzisz?” (czytane na głos). | Cyfry 0-9 do wskazania. | prompt = quantity (ilość), answer = digit (cyfra) | Nagłówek pokazuje ILOŚĆ obrazków, nigdy cyfry docelowej. | Nie - polecenie czytane na głos; odpowiedzią jest cyfra. |

Naprawiony zarzut użytkownika: nie istnieje już zadanie, w którym w nagłówku widać
cyfrę „4” i wśród odpowiedzi jest ta sama cyfra „4” (lub kafelek „4 + cztery”).
Silnik odrzuca proste zadanie cyfra->cyfra (`generateMultipleChoice` zwraca `null`
dla modułu Cyfry), więc jedynym poprawnym zadaniem liczenia jest ILOŚĆ -> CYFRA.
Policzona cyfra wzmacnia realny wpis katalogowy `number_N` (0-9); dla liczb spoza
0-9 nie tworzy się sztuczny wpis postępu. Działania (dodawanie, odejmowanie) oraz
porządkowanie to treści dla wyższych etapów / LATE (dane są w katalogu; obecny
kompozytor lekcji trzyma się bezpiecznego liczenia).

## Angielski

Cel każdego zadania: połączyć angielskie BRZMIENIE/PISOWNIĘ ze ZNACZENIEM (C3).
Bodziec jest zawsze angielski. Po poprawnej odpowiedzi zawsze odtwarzana jest
poprawna wymowa angielska (nagranie MP3/OGG, a gdy go brak - synteza en-US).

| Typ zadania | Poziom / etap | Pytanie | Odpowiedź | C1 | C2 | Czytanie? |
|---|---|---|---|---|---|---|
| MULTIPLE_CHOICE | EARLY i LATE | Słychać słowo ANGIELSKIE (en-US); nagłówek bez obrazka znaczenia. Na LATE dodatkowo widać słowo angielskie jako tekst. | Obrazki znaczeń (bez tekstu). | spoken/word vs picture | Nagłówek nie pokazuje obrazka znaczenia; dystraktory mają inne obrazki niż poprawny. | Nie na EARLY (dźwięk -> obrazek); tekst angielski dopiero na LATE. |
| LISTEN_CHOOSE | EARLY i LATE | Głośnik mówi słowo ANGIELSKIE. | Obrazki znaczeń. | spoken vs picture | Nagłówek to dźwięk; dystraktory różne od poprawnego obrazka. | Nie. |
| MATCH_PAIRS | EARLY i LATE | Karta dźwiękowa mówiąca słowo ANGIELSKIE (na LATE także tekst angielski). | Obrazki znaczeń do połączenia. | dźwięk/tekst angielski vs obrazek | Karta dźwiękowa nie pokazuje obrazka; nigdy polskiego tekstu. | Nie na EARLY (dźwięk); tekst angielski dopiero na LATE. |
| TRUE_FALSE | EARLY i LATE | Obrazek znaczenia + słychać słowo ANGIELSKIE (prawdziwe albo dystraktora); czy nazywa obrazek? | „Tak” / „Nie”. | picture vs decyzja | Obrazek pokazuje znaczenie, ale nie zdradza, czy wypowiedziane słowo pasuje. | Nie - słowo angielskie mówione; na LATE tekst pomocniczy. |
| WHICH_MATCHES | LATE | Słychać słowo ANGIELSKIE. | Obrazki znaczeń. | spoken vs picture | Nagłówek to dźwięk. | Nie. |
| SPELL_WORD | Tylko LATE | Obrazek/słowo-cel; zbuduj słowo angielskie z liter. | Ułożone litery. | zadanie dla czytających | - | Tak - tylko dla czytających (LATE). |

Naprawione zarzuty użytkownika (angielski):

- „Połącz w pary słowo i obrazek, gdy słowo jest po polsku” - usunięte. Karty słów
  w module angielskiego niosą słowo ANGIELSKIE (dźwięk na EARLY, tekst na LATE),
  nigdy polski tekst.
- „Zdanie »pies jest duży« łączone z ikoną psa” - zdania angielskie są treścią
  wyłącznie dla LATE (czytających), nie parowaniem obraz-zdanie dla nieczytających.
- „Słowo »rysować« z ikoną palety i odpowiedź »draw« też z ikoną palety” - usunięte:
  nagłówek nie pokazuje obrazka (C2), a dystraktory mają inne obrazki niż poprawny.
- „Audio »ciasto« -> wybierz »cake«” - usunięte: bodźcem jest zawsze słowo
  angielskie (en-US), nigdy polskie audio jako materiał do nauki angielskiego.
- „Ikona mięsa + słowo »cztery« + audio »sistery« + prawda/fałsz” - usunięte:
  TRUE_FALSE angielski pokazuje obrazek znaczenia i wypowiada słowo ANGIELSKIE
  (poprawne lub dystraktora), a nie polskie słowo pod obrazkiem.
- „Audio »stopa« -> ikonki z angielskimi podpisami dla nieczytającego” - usunięte:
  na EARLY słychać słowo ANGIELSKIE, a odpowiedzią jest OBRAZEK (bez tekstu do
  czytania). Po poprawnej odpowiedzi odtwarzana jest wymowa angielska.

---

## Progresja i dobór zadań

Kompozytor lekcji (`buildLesson`) dobiera typy zadań zależnie od poziomu i etapu.
Na EARLY nie pojawia się żadne zadanie wymagające czytania ani układania słów
(SPELL_WORD jest dostępne tylko na LATE). Litery na pierwszym etapie są ograniczone
do liter bez znaków diakrytycznych. Dla modułu Cyfry jedynym poprawnym zadaniem
jest liczenie (ilość -> cyfra), więc lekcja wypełnia się zadaniami COUNT_CHOOSE z
konkretnymi poleceniami i poprawną odmianą.

## Zasoby (obrazki i dźwięk)

Obrazki znaczeń pochodzą z otwartego zestawu OpenMoji (SVG), a wymowa angielska z
nagrań na otwartej licencji (Free Dictionary API) z awaryjną syntezą en-US. Pełne
oznaczenie autorstwa i licencje znajdują się w pliku
[`CREDITS.md`](CREDITS.md).

## Arkusze do druku (worksheet)

Drukowane sprawdziany (`worksheet.js`) są przeznaczone do rozwiązywania na papierze
pod okiem rodzica/nauczyciela i sprawdzane z kluczem odpowiedzi, więc mogą zawierać
zadania oparte na tekście (dopasowania, tłumaczenia). Nie są to zadania
interaktywne dla nieczytającego dziecka i nie podlegają regule A w tym samym
sensie co lekcje na ekranie.
