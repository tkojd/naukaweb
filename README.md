# Nauka i Zabawa (wersja webowa)

Aplikacja na żywo: [https://tkojd.github.io/naukaweb/](https://tkojd.github.io/naukaweb/)

## 1. Czym jest aplikacja

**Nauka i Zabawa** to webowa wersja natywnej aplikacji edukacyjnej dla dzieci w wieku
**4-10 lat**, z interfejsem w całości po polsku. To wierny port aplikacji na Androida
zbudowany jako lekka, statyczna strona działająca w przeglądarce, bez logowania i bez
backendu.

Dziecko uczy się poprzez krótkie, przyjazne lekcje w czterech modułach:

- **Kolory** - **20 kolorów i odcieni** z polskimi nazwami i próbką koloru, wzbogacone o
  **mieszanie kolorów** (np. żółty i niebieski dają zielony) oraz **sceny do znajdowania
  koloru** ("znajdź kolor" w obrazku).
- **Litery** - pełny polski alfabet (32 litery) wraz z **wszystkimi dziewięcioma znakami
  diakrytycznymi** (Ą, Ć, Ę, Ł, Ń, Ó, Ś, Ź, Ż), każda litera ze słowem-przykładem i emoji.
  Moduł obejmuje też **rozpoznawanie liter w słowach**, pary **wielka/mała litera** oraz
  prostą **sylabizację** (dzielenie słów na sylaby).
- **Cyfry** - cyfry od 0 do 9 z ich polskimi nazwami słownymi (zero, jeden, dwa ... dziewięć),
  a do tego **liczenie obrazków**, proste **dodawanie i odejmowanie na obrazkach** oraz
  **układanie liczb w kolejności**.
- **Angielski** - rozbudowany zestaw słownictwa (obecnie ok. **140 pozycji**) pogrupowany w
  **kategorie tematyczne** (zwierzęta, kolory, liczby, rodzina, jedzenie, ciało, ubrania, dom,
  przyroda, transport, czasowniki, przymiotniki), wraz z **powitaniami i prostymi zwrotami**
  oraz **prostymi zdaniami** dla starszych dzieci. Tłumaczenie działa **w obie strony**
  (angielski do polskiego i polski do angielskiego), a treści można **odsłuchać i rozpoznawać
  ze słuchu**.

Aplikacja obsługuje **wiele profili** (np. dla rodzeństwa), a **postęp każdego profilu jest
trwale zapisywany** w przeglądarce - punkty, gwiazdki, zdobyte odznaki oraz stan powtórek.
Każdy profil ma też przypisany **poziom trudności według wieku** (4-6 lub 7-10 lat), który
dobiera treści i typy zadań (patrz sekcje niżej).

## 2. Zasady dydaktyczne (metodyka A + C1-C5)

Wszystkie typy zadań we wszystkich czterech modułach zostały przebudowane tak, aby
realnie uczyć, a nie dawać się rozwiązać przez dopasowanie identycznych symboli albo
zgadnięcie z ikony. Pełna, tabelaryczna nota projektowa opisująca KAŻDY typ zadania w
KAŻDYM module (co jest pytaniem, co odpowiedzią i czy wymaga czytania) znajduje się w
pliku [docs/METODYKA.md](docs/METODYKA.md); poniżej jej streszczenie.

### Zasady autorytatywne

- **A. Brak wymogu czytania dla nieczytających.** Na poziomie EARLY (ok. 3-6 lat) każde
  zadanie da się rozwiązać przez OBRAZ + DŹWIĘK. Bodziec to obrazek lub nagranie, a
  odpowiedzi to obrazki, kolorowe kafelki (swatch), cyfry lub pojedyncze litery (glify).
  Tekst jako nośnik treści pojawia się tylko tam, gdzie dziecko ćwiczy czytanie, albo na
  poziomie LATE (7-10 lat, czytający).
- **C1. Odpowiedź nie jest tożsama z pytaniem.** Pytanie i poprawna odpowiedź są w RÓŻNYCH
  reprezentacjach (silnik oznacza je znacznikami `meta.promptRep` i `meta.answerRep`, a
  testy pilnują, że są różne). Nie ma już zadań typu cyfra "4" w pytaniu i ta sama cyfra
  "4" wśród odpowiedzi.
- **C2. Obraz nie zdradza odpowiedzi.** Obrazek z pytania nie pojawia się na poprawnej
  odpowiedzi, a dystraktory różnią się wizualnie od poprawnej opcji.
- **C3. Angielski uczy związku BRZMIENIE/PISOWNIA angielska do ZNACZENIA.** Bodźcem jest
  zawsze słowo ANGIELSKIE (wymowa; tekst dopiero dla czytających). Poprawna wymowa
  angielska jest odtwarzana PO poprawnej odpowiedzi. Nigdy polskie słowo ani polskie audio
  jako materiał do nauki angielskiego.
- **C4. Realna progresja.** Litery: pierwsza lekcja to tylko litery bez polskich znaków
  diakrytycznych (bez ą, ę, ó, ł, ś, ć, ń, ź, ż); układanie słów (SPELL_WORD) i litery
  diakrytyczne odblokowują się dopiero na wyższych etapach. Analogicznie w pozostałych
  modułach idziemy od najprostszego do trudniejszego.
- **C5. Konkretne polecenia.** Każde zadanie ma jasne polecenie nazywające wprost to, co
  widać, np. "Ile gwiazdek widzisz?" z poprawną polską odmianą (gwiazdka / gwiazdki /
  gwiazdek).

Poziomy wieku: **EARLY** = 4-6 lat (nieczytający, z naciskiem na ok. 3-6 lat), **LATE** =
7-10 lat (czytający). Etap (stage) to porządek odblokowywania treści; `stage 1` to pierwsza
lekcja.

### Grywalizacja

Nauka nagradza, nigdy nie karze. Za każdą poprawną odpowiedź dziecko dostaje **10 punktów
bazowych** plus **bonus za serię**: 2 punkty za każdy krok serii, maksymalnie 20 punktów
bonusu. Błędna odpowiedź daje **0 punktów** i zeruje serię, ale **nigdy nie odejmuje
punktów** - liczba punktów nie może być ujemna. To utrzymuje pozytywne nastawienie i
motywację.

Na koniec lekcji dziecko dostaje **gwiazdki** zależnie od skuteczności:

- 3 gwiazdki przy wyniku **>= 90%**,
- 2 gwiazdki przy wyniku **>= 70%**,
- 1 gwiazdka, gdy poprawna jest **przynajmniej jedna** odpowiedź (wynik > 0),
- 0 gwiazdek, gdy brak poprawnych odpowiedzi.

Dziecko zbiera też **odznaki** z polskimi tytułami:

- **Pierwsze Kroki** - pierwsza poprawna odpowiedź,
- **Mistrz Kolorów** - opanowanie wszystkich kolorów,
- **Mistrz Liter** - opanowanie wszystkich liter,
- **Mistrz Cyfr** - opanowanie wszystkich cyfr,
- **Poliglota** - opanowanie co najmniej 10 angielskich słów,
- **Tydzień Nauki** - 7 dni powtórek z rzędu.

Element opanowany to taki, który dotarł do najwyższego pudełka Leitnera (pudełko 5).

### Powtórki rozłożone w czasie (spaced repetition)

Aby wiedza była trwała, aplikacja stosuje **system pudełek Leitnera** (poziomy **1-5**).
Każdy element ma swoje pudełko i termin kolejnej powtórki. Interwały powtórek rosną wraz z
numerem pudełka:

| Pudełko | Interwał do kolejnej powtórki |
| ------- | ----------------------------- |
| 1       | 1 dzień                       |
| 2       | 2 dni                         |
| 3       | 4 dni                         |
| 4       | 7 dni                         |
| 5       | 15 dni                        |

Poprawna odpowiedź **awansuje** element o jedno pudełko wyżej (maksymalnie do pudełka 5) i
przesuwa termin powtórki dalej w przyszłość. Błędna odpowiedź **cofa** element do pudełka 1
(bez karnego, długiego oczekiwania) i zeruje serię. Dzięki temu materiał trudny wraca
częściej, a dobrze znany rzadziej. Rosnące interwały odpowiadają **krzywej zapominania
Ebbinghausa** - powtórka tuż przed spodziewanym zapomnieniem najskuteczniej utrwala wiedzę.

### Nauka multimedialna (audio-first)

Interfejs łączy obraz, kolor, emoji i dźwięk zgodnie z **zasadami nauki multimedialnej
Richarda Mayera**: łączenie słowa z obrazem uczy skuteczniej niż sam tekst. Ponieważ małe
dzieci często jeszcze nie czytają, aplikacja jest **audio-first**. Treści polskie (nazwy
kolorów, litery, liczby, polecenia) są wypowiadane przez **Web Speech API** (pl-PL). Dla
modułu Angielski bodźcem jest zawsze słowo angielskie: aplikacja odtwarza **prawdziwe
nagrania wymowy na otwartej licencji** (samodzielnie hostowane w `docs/assets/audio/en/`),
a gdy dla danego słowa nie ma pobranego nagrania, korzysta z **zapasowej syntezy Web Speech
en-US**. Obrazki znaczeń pochodzą z samodzielnie hostowanego zestawu ikon **OpenMoji**
(`docs/assets/img/`). Źródła i licencje opisano w sekcji 8 oraz w
[docs/CREDITS.md](docs/CREDITS.md).

Lekcje są podane w **krótkich porcjach: 6 pytań** na lekcję, co nie przeciąża uwagi dziecka.
Każda lekcja **miesza różne typy zadań** (opisane w sekcji 3), dobierane do poziomu wieku i
etapu dziecka, dzięki czemu nauka jest urozmaicona i zgodna z zasadami A + C1-C5.

### Metoda Montessori

Doświadczenie jest **prowadzone przez dziecko** i oparte na **wyłącznie pozytywnych
wzmocnieniach**. Poprawna odpowiedź wywołuje radosną informację zwrotną, a błędna - łagodną
zachętę do kolejnej próby, bez kar i bez punktów ujemnych. Dziecko samo wybiera moduł i
tempo, co wspiera samodzielność i poczucie sprawczości w duchu pedagogiki Montessori.

## 3. Typy zadań (co jest pytaniem, co odpowiedzią, czy trzeba czytać)

Każda lekcja losuje zadania z zestawu przyjaznych dzieciom typów. Tam, gdzie to możliwe,
zadania **działają bez klawiatury** (dziecko dotyka obrazków, kart, kafelków i przycisków).
Typy zadań są dobierane do poziomu wieku i etapu profilu (patrz sekcja 4), a każda odpowiedź
jest zapisywana przez ten sam system postępów (Leitner, punkty, seria, odznaki). Poniżej
streszczenie per moduł; pełne tabele są w [docs/METODYKA.md](docs/METODYKA.md).

### Kolory

- **Wielokrotny wybór / Słuchaj i wybierz** - słychać nazwę koloru (pl-PL); nagłówek to
  ikona głośnika, **bez kafelka w kolorze docelowym** (C2). Odpowiedzią są **kolorowe kafelki
  (swatch), bez tekstu**. Bez czytania; na LATE nazwa jest dodatkowo pokazana jako tekst.
- **Dopasowywanie w parach** - karty "dźwiękowe" mówią nazwę koloru, dziecko łączy je z
  kolorowymi kafelkami. Na EARLY rozwiązywane słuchem (bez czytania nazwy koloru); tekst
  nazwy dopiero na LATE.
- **Prawda/fałsz** (LATE, wyższy etap) - pokazany kafelek koloru, słychać nazwę; dziecko
  wybiera "Tak" / "Nie".
- **Znajdź kolor w scenie** (LATE, wyższy etap) - ilustracja sceny plus mówiona nazwa
  szukanego koloru; odpowiedzią są kolorowe kafelki (poprawny nie jest pokazany w nagłówku).

Nie istnieje już dawne zadanie ze słowem "jasnoniebieski" na jasnoniebieskim tle i
identycznym kafelkiem wśród odpowiedzi: nagłówek nigdy nie zawiera kafelka koloru docelowego,
a łączenie w pary na EARLY nie wymaga czytania.

### Litery

- **Słuchaj i wybierz** (EARLY i LATE) - głośnik mówi głoskę litery (pl-PL); odpowiedzią są
  **glify liter** do wskazania. Bez czytania (rozpoznanie glifu).
- **Wielokrotny wybór** (LATE) - słychać głoskę litery plus obrazek słowa-przykładu (np. 🍉
  dla "A"); odpowiedzią są glify liter.
- **Dopasowywanie w parach** - karta z pojedynczym glifem litery (cel rozpoznania) plus
  wymowa głoski; łączona z obrazkiem słowa-przykładu.
- **Prawda/fałsz** - obrazek słowa-przykładu plus mówione słowo; "Tak" / "Nie".
- **Ułóż słowo z liter (SPELL_WORD)** - **tylko LATE, wyższy etap**. Dziecko buduje słowo z
  kafelków liter. Celowo wyłącznie dla czytających; **nigdy na EARLY ani na 1. etapie liter**.

Progresja (C4): pierwszy etap liter zawiera **wyłącznie litery bez polskich znaków
diakrytycznych** i tylko zadania rozpoznawcze. Litery diakrytyczne oraz SPELL_WORD
odblokowują się na wyższych etapach.

### Cyfry

- **Policz i wybierz (COUNT_CHOOSE)** (EARLY i LATE) - grupa policzalnych obrazków (np.
  ⭐⭐⭐) plus konkretne polecenie "Ile gwiazdek widzisz?" (czytane na głos, z poprawną
  odmianą). Odpowiedzią jest **cyfra 0-9** (ILOŚĆ do CYFRY, C1). Nagłówek pokazuje ilość
  obrazków, **nigdy cyfry docelowej**.

Nie istnieje już zadanie, w którym w nagłówku widać cyfrę "4" i wśród odpowiedzi jest ta sama
cyfra "4": silnik odrzuca proste zadanie cyfra do cyfry, więc jedynym poprawnym zadaniem
liczenia jest ILOŚĆ do CYFRY. Działania (dodawanie, odejmowanie) i porządkowanie liczb to
treści dla wyższych etapów / LATE.

### Angielski

Cel każdego zadania: połączyć angielskie BRZMIENIE/PISOWNIĘ ze ZNACZENIEM (C3). **Bodziec
jest zawsze angielski**, a po poprawnej odpowiedzi zawsze odtwarzana jest **poprawna wymowa
angielska** (nagranie, a gdy go brak - synteza en-US).

- **Wielokrotny wybór / Słuchaj i wybierz** (EARLY i LATE) - słychać słowo ANGIELSKIE
  (en-US); nagłówek bez obrazka znaczenia (C2). Odpowiedzią są **obrazki znaczeń (bez
  tekstu)**. Na LATE dodatkowo widać słowo angielskie jako tekst.
- **Dopasowywanie w parach** - karta dźwiękowa mówi słowo ANGIELSKIE (na LATE także tekst
  angielski), łączona z obrazkami znaczeń. **Nigdy polski tekst.**
- **Prawda/fałsz** - obrazek znaczenia plus słychać słowo ANGIELSKIE (prawdziwe albo
  dystraktora); dziecko ocenia, czy nazywa obrazek.
- **Ułóż słowo z liter (SPELL_WORD)** - **tylko LATE**: zbuduj angielskie słowo z liter.

Usunięto wcześniejsze błędy dydaktyczne: parowanie POLSKIEGO słowa z obrazkiem, polskie audio
"ciasto" do wyboru "cake", ikonę palety zarazem w pytaniu i w poprawnej odpowiedzi, a także
angielskie zadania z tekstem dla nieczytających. Na EARLY słychać słowo angielskie, a
odpowiedzią jest OBRAZEK bez tekstu do czytania.

Cała **logika typów zadań jest czysta** (bez DOM, dźwięku i losowości globalnej) i mieszka w
`docs/js/logic/taskTypes.js` (generatory zadań, kompozytor `buildLesson` oraz bramkowanie
`TASK_TYPES_BY_LEVEL`). Każdy zwracany spec ma znaczniki `meta.promptRep` / `meta.answerRep`
(C1) i `correctItemId`, a losowość jest wstrzykiwana przez funkcję `rng`, dzięki czemu logikę
można w pełni testować w Node (Vitest). Warstwa widoku `docs/js/ui/lessonView.js` renderuje
kolejne typy, wyświetla prawdziwe obrazki, odtwarza wymowę (w tym replay wymowy angielskiej
po poprawnej odpowiedzi) i uruchamia stonowane animacje.

## 4. Poziomy trudności według wieku (4-6 vs 7-10)

Aby treści rosły razem z dzieckiem, aplikacja rozróżnia **dwa poziomy wieku**:

- **EARLY** - dla dzieci w wieku **4-6 lat** (z naciskiem na najmłodszych, ok. **3-6 lat**,
  nieczytających): najprostsze treści i typy zadań oparte **wyłącznie na obrazkach oraz
  dźwięku**, bez konieczności czytania czy literowania. Na tym poziomie nie pojawia się
  żadne zadanie wymagające czytania, a SPELL_WORD (układanie słów) jest niedostępne.
- **LATE** - dla dzieci w wieku **7-10 lat** (czytających): dodatkowo literowanie (ułóż
  słowo z liter), tłumaczenia EN<->PL oraz proste zdania po angielsku, a nazwy/słowa
  pojawiają się także jako tekst wspierający.

Poziom **wybiera się przy tworzeniu profilu**: pod pytaniem "Ile masz lat?" dostępne są dwa
duże przyciski, **4-6 lat** (🧸) i **7-10 lat** (🎒). Wybrany poziom jest **trwale zapisywany
w profilu** (w `localStorage`, pod kluczem `naukaweb.v1`). Starsze profile utworzone przed
wprowadzeniem poziomów są migrowane **bez utraty postępu** - domyślnie przyjmują poziom
starszy (7-10 lat).

Poziom profilu wpływa na naukę na dwa sposoby:

- **Dobór typów zadań** - stałe `TASK_TYPES_BY_LEVEL` decydują, które typy pojawiają się na
  danym poziomie. Poziom EARLY korzysta z zadań obrazkowo-dźwiękowych, a poziom LATE dodaje
  między innymi **ułóż słowo z liter**.
- **Dobór treści** - funkcja `itemsForLevel(module, level)` filtruje słownictwo do pozycji
  odpowiednich dla poziomu. Pozycje bez pola `level` są traktowane jako właściwe dla **obu**
  poziomów, więc wcześniejsze treści działają bez zmian.

### Jak treści rosną z dzieckiem (etapy, od najprostszego)

Treść odblokowuje się **etapami** (`stage`), zawsze od najłatwiejszego: `stage 1` to
pierwsza lekcja. Funkcja `itemsUpToStage` gwarantuje, że wyższe etapy zawsze obejmują
wszystko z etapów niższych (nadzbiory monotoniczne), więc dziecko nie dostaje wszystkiego
naraz. Konkretnie:

- **Litery**: pierwszy etap to litery **bez polskich znaków diakrytycznych** i tylko
  zadania rozpoznawcze; **diakrytyki** (ą, ę, ó, ł, ś, ć, ń, ź, ż) oraz **układanie słów
  (SPELL_WORD)** odblokowują się na wyższych etapach i tylko na LATE.
- **Cyfry**: najpierw liczenie (ilość do cyfry); **działania** (dodawanie/odejmowanie) i
  **porządkowanie** to treści wyższych etapów / LATE.
- **Angielski**: słownictwo wchodzi partiami po etapach; **zwroty** i **zdania** są
  zarezerwowane dla LATE, a **tekst** (pisownia) pojawia się dopiero dla czytających.

## 5. Rozbudowa angielskiego i struktura słownictwa (jak skalować do ~2000 słów)

Moduł Angielski jest głównym obszarem rozbudowy. Obecny zestaw to **reprezentatywny zestaw
startowy** (ok. 140 pozycji), a nie pełne 2000 słów. Słownictwo jest **pogrupowane w
kategorie tematyczne** i **wprowadzane etapami** (stages), tak aby dziecko nie dostawało
wszystkiego naraz.

Struktura pojedynczej pozycji treści (plik `docs/js/logic/content.js`):

```js
{
  id: 'english_cat',      // stabilny, unikalny identyfikator (NIGDY nie zmieniaj istniejących)
  moduleType: 'ENGLISH',  // jeden z LEARNING_MODULES
  prompt: 'cat',          // strona angielska
  answer: 'kot',          // strona polska
  emoji: '🐱',            // opcjonalna podpowiedź obrazkowa
  audioKey: 'audio_...',  // stabilny klucz dla warstwy dźwięku
  // --- opcjonalne pola skalowania ---
  category: 'animals',    // kategoria tematyczna
  stage: 1,               // etap wprowadzania (1 = najwcześniej)
  level: 'EARLY',         // 'EARLY' | 'LATE' | tablica; brak = oba poziomy
  kind: 'word'            // 'word' | 'phrase' | 'sentence'
}
```

Ponieważ w jednej pozycji są obecne obie strony (`prompt` po angielsku, `answer` po polsku),
**tłumaczenie w obie strony** wynika z tego samego wpisu (pomaga w tym `translationPair`),
bez duplikowania pozycji. Kategorie obejmują: **animals, colors, numbers, family, food, body,
clothes, house, nature, transport, verbs, adjectives, greetings, phrases, sentences**. Rodzaj
treści (`kind`) sięga od pojedynczych słów, przez **proste zwroty** (powitania, uprzejmości,
"How are you?"), aż po **proste zdania** (zarezerwowane dla poziomu LATE).

### Jak dodać więcej słownictwa (w kolejnych partiach)

Wszystkie wskazówki są też opisane w komentarzu na początku pliku `content.js`. W skrócie:

1. Dodaj kolejne wywołania buildera do listy `englishWords` (lub tablic kategorii, które ją
   zasilają), używając buildera `english(word, polish, emoji, opts)`. Zawsze podawaj
   `opts = { category, stage, level, kind }`.
   - **category** - jedna z kategorii tematycznych (możesz dodawać nowe).
   - **stage** - wprowadzaj słownictwo stopniowo. Etap 1 to pierwsze słowa, wyższe etapy
     odblokowują się później. Funkcja `itemsUpToStage` gwarantuje, że wyższe etapy zawsze
     obejmują wszystko z etapów niższych (nadzbiory monotoniczne).
   - **level** - `'EARLY'` (4-6), `'LATE'` (7-10) lub pominięcie (oba). Zwroty i zdania
     zarezerwuj dla `'LATE'`.
   - **kind** - `'word'` | `'phrase'` | `'sentence'` (domyślnie `word`).
2. Nowe identyfikatory (`id`) muszą być **unikalne**. Dla zwrotów i zdań podaj jawnie
   `opts.id`, aby był krótki i stabilny (np. `english_phrase_hello`).
3. **Nigdy nie zmieniaj ani nie usuwaj istniejących `id`/`audioKey`** - zapisany postęp opiera
   się na tych kluczach. Tylko **dodawaj**.
4. Dodaj testy w `tests/content.test.js` przy wprowadzaniu nowych kategorii lub etapów.

Moduły Kolory, Litery i Cyfry rozbudowuje się w ten sam, addytywny sposób. Udostępniają one
dodatkowe czyste struktury danych (mieszanie kolorów, sceny, pary wielka/mała litera, litery w
słowach, sylaby, zadania z liczeniem, proste działania i sekwencje do uporządkowania) obok
podstawowych pozycji.

## 6. Arkusze do druku (sprawdziany)

Aplikacja generuje **arkusze do druku** (sprawdziany), które można wykorzystać poza ekranem.
To narzędzie dla rodzica lub nauczyciela, dostępne **bez zalogowanego profilu**.

- **Jak otworzyć** - na ekranie głównym wybierz kafelek **🖨️ Arkusze do druku** (trasa
  `#/worksheet`).
- **Wybór zakresu** - w formularzu ustawiasz: **moduł** (Kolory, Litery, Cyfry, Angielski),
  **kategorię**, **poziom (wiek)**, **liczbę pytań** oraz pole wyboru **Dołącz klucz
  odpowiedzi**. Lista poziomów (`LEVEL_OPTIONS` w `worksheetView.js`) ma teraz dwie pozycje:
  **4-6 lat (bez czytania)** oraz **7-10 lat (dla czytających)**; nie ma już opcji "wszystkie
  poziomy". Gdy nie wybrano poziomu, generowany jest arkusz **EARLY (bez czytania)**, aby
  najmłodsze, nieczytające dziecko nigdy nie dostało zadania wymagającego czytania.
- **Arkusze EARLY (4-6 lat) - dziecko NIE czyta.** Polecenie czyta na głos dorosły, a dziecko
  odpowiada, **zakreślając obrazek, licząc ilość lub wskazując kolorowy kafelek**. Nie ma
  dopasowywania NAZWY koloru do kafelka, nie ma zadań cyfra do cyfry, a obrazek w nagłówku
  nigdy nie zdradza odpowiedzi. Kolory: "Zakreśl kolor: ..." (nazwa do swatcha). Cyfry:
  "Ile ... widzisz?" (ilość do cyfry, z poprawną odmianą). Litery: obrazek słowa-przykładu
  plus glify liter do zakreślenia (pierwszy etap bez diakrytyków). Angielski: "Posłuchaj i
  zakreśl obrazek: ..." (angielski dźwięk do obrazka; nigdy polskie słowo).
- **Arkusze LATE (7-10 lat) - dla czytających.** Zadania oparte na tekście: wybór odpowiedzi,
  dopasowanie kolumn, tłumaczenie EN<->PL, uzupełnianie luki, prawda/fałsz. Angielskie
  zadania wiążą pisownię ze znaczeniem (C3), a nagłówek nie pokazuje obrazka zdradzającego
  odpowiedź (C2).
- **Generowanie** - przycisk **📝 Generuj arkusz** wywołuje czystą funkcję
  `buildWorksheet(...)` (plik `docs/js/logic/worksheet.js`), która zwraca zadania i opcjonalny
  klucz odpowiedzi zgodne z tymi samymi zasadami A + C1-C5 co lekcje na ekranie.
- **Drukowanie** - przycisk **🖨️ Drukuj** wywołuje `window.print()`. Reguły `@media print` w
  `docs/css/styles.css` zamieniają widok na **czysty, czarno-biały arkusz** do druku.
- **Klucz odpowiedzi** - drukuje się **tylko wtedy**, gdy zaznaczono pole "Dołącz klucz
  odpowiedzi"; w przeciwnym razie arkusz pozostaje do samodzielnego wypełnienia.

## 7. Wygląd i odczucia (nowa oprawa wizualna)

Interfejs został odświeżony w duchu przyjaznych aplikacji edukacyjnych dla dzieci
(styl **Duolingo / Khan Academy Kids**), ale z umiarem - ma być nowocześnie i naprawdę
ładnie, bez maskotki i bez przytłaczania uwagi dziecka.

### Kolory, tło i przyciski

- **Miękkie, kolorowe gradienty** w tle całej strony oraz jasne, zaokrąglone karty
  (duże promienie rogów, delikatne cienie) dla czytelnej, przyjaznej kompozycji.
- **Zaokrąglone przyciski w stylu 3D** - pełny kolor akcentu z ciemniejszą dolną
  krawędzią, która "wciska się" przy dotknięciu, co daje wyraźne, satysfakcjonujące
  wrażenie kliknięcia.
- **Kolory akcentów przypisane do modułów**, spójnie użyte na kafelkach, ekranie lekcji
  i kartach postępów: Kolory `#FF6B6B`, Litery `#4D96FF`, Cyfry `#6BCB77`,
  Angielski `#FFA45B`, Postępy `#B983FF`.
- **Duże pola dotyku** (co najmniej ~72 px) i **widoczna obwódka fokusu** na każdym
  elemencie interaktywnym (kafelki, odpowiedzi, przyciski, pole imienia, wybór
  awatara, przycisk głośnika, przełącznik dźwięku), aby aplikacja była wygodna zarówno
  pod palcem, jak i z klawiatury.
- **Responsywny układ** działa czytelnie na komputerze, tablecie i telefonie - kafelki,
  siatka odpowiedzi i siatka odznak zwijają się do jednej kolumny na wąskich ekranach,
  a nic nie wychodzi poza ekran ani nie zachodzi na stały przełącznik dźwięku.

### Subtelne animacje (z umiarem)

Ruch jest delikatny i celowy, nigdy nachalny:

- **Płynne przejścia** między ekranami i pytaniami (delikatne pojawianie się z lekkim
  przesunięciem).
- **Świętowanie poprawnej odpowiedzi**: krótki "pop" na komunikacie oraz drobne
  iskierki, przy zachowaniu dokładnego tekstu `🎉 Brawo!`. Błędna odpowiedź daje
  łagodne, nienachalne "potrząśnięcie" wybranego kafelka i komunikat
  `🙂 Spróbuj jeszcze raz`.
- **Animowane liczniki** punktów (odliczanie od zera), **pasek postępu lekcji**
  wypełniający się wraz z kolejnymi pytaniami oraz **sekwencyjne pojawianie się
  gwiazdek** na ekranie podsumowania.

Wszystkie animacje **respektują ustawienie `prefers-reduced-motion`** - gdy użytkownik
poprosi system o ograniczenie ruchu, przejścia, przekształcenia i efekty są w pełni
neutralizowane (treść pozostaje od razu widoczna).

### Krótkie dźwięki efektowe i wyciszanie

- **Dźwięki efektowe** generuje **Web Audio API** (oscylatory), **bez plików audio**:
  `playCorrect()` (delikatny dwutonowy sygnał przy poprawnej odpowiedzi) oraz `playBadge()`
  (krótka radosna melodyjka przy nowej odznace i na podsumowaniu lekcji). Dźwięki są krótkie
  i stonowane - z umiarem. Dotyczy to wyłącznie efektów; **wymowa** to osobna warstwa i
  korzysta z prawdziwych **nagrań angielskich** (`docs/assets/audio/en/`) oraz syntezy Web
  Speech (patrz sekcja 8 i [docs/CREDITS.md](docs/CREDITS.md)).
- **Przełącznik dźwięku (🔊 / 🔇)** jest dostępny na każdym ekranie w rogu, ma polską
  etykietę dla czytników ekranu i **stan zapamiętywany między odświeżeniami strony**.
  Wyciszenie obejmuje **zarówno dźwięki efektowe, jak i istniejącą wymowę Web Speech**
  (obie warstwy sprawdzają ten sam przełącznik).
- Efekty dźwiękowe **degradują się bezpiecznie** (stają się no-op), gdy Web Audio API
  nie jest dostępne, i nigdy nie zgłaszają błędu.

### Zależność od czcionki i tryb offline

Nagłówki korzystają z zaokrąglonej, przyjaznej czcionki webowej **Baloo 2**, a tekst z
**Nunito** - obie z **Google Fonts**, ładowane z `preconnect` dla szybszego startu. Oba
kroje mają **komplet polskich znaków diakrytycznych** (ą, ć, ę, ł, ń, ó, ś, ź, ż oraz
wielkie Ą, Ć, Ę, Ł, Ń, Ó, Ś, Ź, Ż), więc renderują się w jednym, spójnym kroju.

Wcześniej używana była **Fredoka**, ale jej plik webowy **nie zawiera konturów większości
polskich znaków** (obecne są tylko `ó/Ó` i `ł/Ł`). Mimo deklarowanego zakresu `latin-ext`
przeglądarka podstawiała brakujące znaki, takie jak **`ś` i `ć`**, z czcionki zastępczej,
przez co wyświetlały się innym krojem. Zmiana na Baloo 2 (zweryfikowaną narzędziem
`fontTools` pod kątem wszystkich 18 polskich znaków) rozwiązuje problem u źródła; parametr
`subset=latin-ext` nie jest już potrzebny, bo Google Fonts dobiera właściwe podzbiory
automatycznie przez `unicode-range`. Jeśli sieć
lub CDN są niedostępne, aplikacja płynnie przechodzi na **zaokrągloną czcionkę systemową**
(`ui-rounded`, `Segoe UI Rounded`, `SF Pro Rounded`, `system-ui`), więc **wygląda dobrze
także offline** i nie traci swojego zaokrąglonego charakteru.

## 8. Stos technologiczny

- **Czysty, statyczny HTML/CSS/JavaScript** - moduły ES, **bez kroku budowania** i bez
  frameworka. Pliki z katalogu `docs/` są serwowane wprost jako statyczne zasoby.
- **Nagrania wymowy angielskiej** - prawdziwe pliki dźwiękowe na otwartej licencji,
  samodzielnie hostowane w `docs/assets/audio/en/`. Odtwarza je warstwa mowy, a gdy dla
  słowa nie ma nagrania, następuje płynny fallback na syntezę Web Speech en-US.
- **Web Speech API** (`window.speechSynthesis`) - synteza mowy: **pl-PL** dla treści polskich
  oraz **en-US** jako **fallback** dla angielskich słów bez pobranego nagrania. Warstwa mowy
  degraduje się łagodnie (staje się no-op), gdy API nie jest dostępne, i zawiera poprawkę na
  przycinanie początku wypowiedzi (priming/rozgrzewkę silnika).
- **Web Audio API** - krótkie **dźwięki efektowe** generowane oscylatorami (bez plików
  audio), wspólnie wyciszane z mową przez ten sam przełącznik dźwięku. Bezpieczny no-op, gdy
  API nie jest dostępne.
- **Ikony OpenMoji (SVG)** - obrazki znaczeń, samodzielnie hostowane w `docs/assets/img/`.
- **localStorage** - trwały zapis danych per profil (profile, punkty, gwiazdki, odznaki,
  stan powtórek Leitnera) oraz ustawienie wyciszenia dźwięku.
- **Vitest** - testy jednostkowe czystej logiki (harmonogram Leitnera, grywalizacja, seria
  dni). Logika domenowa w `docs/js/logic/` jest wolna od DOM i globali przeglądarki, więc
  importuje się tak samo w przeglądarce i w Node.

Struktura projektu odwzorowuje warstwy natywnej aplikacji:

```
docs/
  index.html            # punkt wejścia (czcionka Google Fonts + preconnect)
  .nojekyll             # wyłącza przetwarzanie Jekyll na GitHub Pages
  METODYKA.md           # nota projektowa: każdy typ zadania vs zasady A + C1-C5
  CREDITS.md            # źródła i licencje zasobów (OpenMoji, nagrania EN)
  css/styles.css        # style: tokeny, gradienty, przyciski 3D, animacje, fokus
  assets/
    img/                # samodzielnie hostowane ikony OpenMoji (SVG) + manifest.json
    audio/en/           # prawdziwe nagrania wymowy angielskiej (CC) + manifest.json
  js/
    app.js              # bootstrap, router widoków, stały przełącznik dźwięku
    logic/              # czysta logika domenowa (testowana Vitest)
      content.js        # katalog treści (Kolory/Litery/Cyfry/Angielski, kategorie, etapy)
      taskTypes.js      # silnik typów zadań i kompozytor lekcji (buildLesson)
      assets.js         # czysta warstwa odwzorowania treści na obrazki/nagrania
      srs.js            # harmonogram powtórek Leitnera
      gamification.js   # punkty, gwiazdki, odznaki
      streak.js         # seria dni nauki
      worksheet.js      # generator arkuszy do druku (sprawdzianów)
      models.js         # modele i stałe (m.in. poziomy wieku AGE_LEVELS)
    data/               # trwałość na localStorage
      storage.js
      progressService.js
    ui/                 # widoki i kontroler lekcji
      lessonView.js     # renderowanie typów zadań (obrazki, wymowa, animacje)
      worksheetView.js  # ekran generatora arkuszy (formularz + wydruk)
    audio/
      speech.js         # Web Speech + odtwarzanie nagrań EN (z fallbackiem, priming)
      soundEffects.js   # krótkie dźwięki Web Audio (playCorrect/playBadge)
scripts/                # jednorazowe pomocniki Node pobierające zasoby (nieużywane w runtime)
  fetch-icons.mjs       # pobiera ikony OpenMoji po codepoincie
  fetch-audio.mjs       # pobiera nagrania EN (Free Dictionary API / Wikimedia Commons)
  rebuild-audio-manifest.mjs
tests/                  # testy Vitest dla warstwy logic/
package.json            # tylko narzędzia deweloperskie (Vitest)
```

### Dlaczego waniliowe rozwiązanie bez kroku budowania

Wybór czystego HTML/CSS/JS jest **celowo najprostszy do hostowania**. Nie ma bundlera,
transpilacji ani artefaktów budowania - to, co leży w `docs/`, jest dokładnie tym, co trafia
na serwer. Dzięki temu aplikację można wdrożyć bezpośrednio na **GitHub Pages z katalogu
`docs/`**, bez pipeline'u CI, a plik można też po prostu otworzyć lokalnie w przeglądarce.
Node.js i npm są potrzebne **wyłącznie** do uruchomienia testów Vitest, a nie do działania
samej aplikacji.

### Źródła i licencje zasobów

Aplikacja korzysta z zasobów na otwartych licencjach, **hostowanych lokalnie** w
`docs/assets/`. Pełne, wymagane prawnie oznaczenie autorstwa oraz linki do licencji znajdują
się w [docs/CREDITS.md](docs/CREDITS.md) - i to on w całości spełnia wymóg atrybucji.

- **Ikony (obrazki) - OpenMoji.** Zestaw ikon SVG na licencji **CC BY-SA 4.0**, pobrany po
  kodzie Unicode i zapisany w `docs/assets/img/` przez skrypt
  [scripts/fetch-icons.mjs](scripts/fetch-icons.mjs).
- **Wymowa angielska - Wikimedia Commons / Free Dictionary API.** Prawdziwe nagrania głosu
  na licencjach **CC BY 3.0** oraz **CC BY-SA 3.0**, odnalezione przez Free Dictionary API i
  pobrane z Wikimedia Commons do `docs/assets/audio/en/` przez skrypt
  [scripts/fetch-audio.mjs](scripts/fetch-audio.mjs). Angielskie słowa bez pobranego
  nagrania są odczytywane zapasowo przez syntezę Web Speech en-US.
- **Mowa polska - Web Speech (pl-PL).** Treści polskie są syntezowane w przeglądarce; nie
  dołączamy nagrań polskich.

Skrypty z katalogu `scripts/` są uruchamiane **jednorazowo w czasie tworzenia zasobów**, a
nie w trakcie działania aplikacji ani podczas testów.

## 9. Jak uruchomić lokalnie

Aplikacja nie wymaga instalacji - to statyczne pliki. Wystarczy jeden z poniższych sposobów:

- Otworzyć plik `docs/index.html` bezpośrednio w przeglądarce, albo
- Uruchomić lokalny serwer statyczny (zalecane dla modułów ES):

  ```bash
  python3 -m http.server -d docs
  # lub
  npx serve docs
  ```

  a następnie otworzyć wskazany adres (np. `http://localhost:8000`).

### Testy

Testy jednostkowe czystej logiki uruchamia się przez Vitest:

```bash
npm install
npm test
```

## 10. Hosting

Aplikacja jest hostowana na **GitHub Pages** ze źródłem:

- **branch:** `main`
- **folder:** `/docs`
- **adres:** [https://tkojd.github.io/naukaweb/](https://tkojd.github.io/naukaweb/)

Ponieważ strona działa pod podścieżką `/naukaweb/`, **wszystkie ścieżki do zasobów są
względne** (nigdy nie zaczynają się od `/`). Dzięki temu aplikacja działa poprawnie zarówno
na GitHub Pages, jak i po otwarciu lokalnie z dysku. W katalogu `docs/` znajduje się też
pusty plik **`.nojekyll`**, który wyłącza przetwarzanie przez Jekyll i zapewnia, że pliki
są serwowane dokładnie tak, jak leżą w repozytorium.

## 11. Ograniczenia

- **Część wymowy zależy od Web Speech API.** Treści polskie są zawsze syntezowane w
  przeglądarce (pl-PL) z poprawką na przycinanie początku wypowiedzi. Wymowa angielska
  korzysta z prawdziwych nagrań tam, gdzie je pobrano; **angielskie słowa bez nagrania są
  odczytywane zapasowo przez syntezę Web Speech en-US**. Dostępność i jakość głosów zależy
  od przeglądarki i systemu - gdy dany głos jest niedostępny, warstwa mowy działa w trybie
  no-op, a aplikacja pozostaje w pełni używalna.
- **Zestaw nagrań angielskich jest ziarnem początkowym.** Free Dictionary API ma niepełne
  pokrycie i bywa niedostępne, więc dołączono nagrania tylko dla części słów; resztę pokrywa
  fallback en-US. Ponowne uruchomienie `scripts/fetch-audio.mjs` dobiera kolejne nagrania.
- **Brak kroku budowania.** To czysty, statyczny `docs/` (moduły ES, ścieżki względne),
  serwowany na GitHub Pages pod podścieżką `/naukaweb/`, z plikiem `docs/.nojekyll`. Nie ma
  bundlera ani artefaktów budowania.
- **Brak backendu.** Nie ma serwera ani konta użytkownika.
- **Działa offline** po pierwszym załadowaniu (statyczne pliki nie wymagają połączenia).
  Zaokrąglona czcionka z Google Fonts jest opcjonalna - jeśli CDN jest niedostępny,
  aplikacja korzysta z zaokrąglonej czcionki systemowej i nadal wygląda spójnie.
- **Dane trzymane lokalnie.** Postęp jest zapisywany w `localStorage` danej przeglądarki,
  więc nie przenosi się między urządzeniami ani przeglądarkami, a wyczyszczenie danych
  przeglądarki go usuwa.
- **Słownictwo angielskie to zestaw startowy.** Docelowy zakres nawet do ~2000 słów jest
  celowo wprowadzany etapami (stages), a nie od razu. Struktura treści jest przygotowana pod
  dalszą rozbudowę (patrz sekcja 5), więc dokładanie kolejnych partii słownictwa jest proste
  i addytywne.
- **Arkusze do druku to narzędzie dla rodzica lub nauczyciela.** Generator działa poza
  systemem profili i postępów, a jakość wydruku zależy od ustawień drukowania w przeglądarce.
