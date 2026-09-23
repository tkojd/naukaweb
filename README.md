# Nauka i Zabawa (wersja webowa)

Aplikacja na żywo: [https://tkojd.github.io/naukaweb/](https://tkojd.github.io/naukaweb/)

## 1. Czym jest aplikacja

**Nauka i Zabawa** to webowa wersja natywnej aplikacji edukacyjnej dla dzieci w wieku
**4-10 lat**, z interfejsem w całości po polsku. To wierny port aplikacji na Androida
zbudowany jako lekka, statyczna strona działająca w przeglądarce, bez logowania i bez
backendu.

Dziecko uczy się poprzez krótkie, przyjazne lekcje w czterech modułach:

- **Kolory** - dziesięć podstawowych kolorów z polskimi nazwami (czerwony, niebieski,
  zielony, żółty, pomarańczowy, fioletowy, różowy, brązowy, czarny, biały) i próbką koloru.
- **Litery** - pełny polski alfabet (32 litery) wraz z **wszystkimi dziewięcioma znakami
  diakrytycznymi** (Ą, Ć, Ę, Ł, Ń, Ó, Ś, Ź, Ż), każda litera ze słowem-przykładem i emoji.
- **Cyfry** - cyfry od 0 do 9 z ich polskimi nazwami słownymi (zero, jeden, dwa ... dziewięć).
- **Angielski** - startowy zestaw słownictwa (zwierzęta, kolory, liczby, rodzina, jedzenie,
  przyroda) z tłumaczeniem na polski i emoji jako podpowiedzią.

Aplikacja obsługuje **wiele profili** (np. dla rodzeństwa), a **postęp każdego profilu jest
trwale zapisywany** w przeglądarce - punkty, gwiazdki, zdobyte odznaki oraz stan powtórek.

## 2. Zaimplementowane metody nauki i dlaczego

Dobór metod odzwierciedla sprawdzone podejścia z dydaktyki wczesnoszkolnej. Każda z nich
została dobrana pod kątem małego dziecka, które dopiero uczy się czytać.

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
dzieci często jeszcze nie czytają, aplikacja jest **audio-first** - wymowa jest wypowiadana
na głos przez **Web Speech API** (po polsku dla treści polskich, po angielsku dla modułu
Angielski). Lekcje są podane w **krótkich porcjach: 6 pytań, po 4 opcje** na każde pytanie,
co nie przeciąża uwagi dziecka.

### Metoda Montessori

Doświadczenie jest **prowadzone przez dziecko** i oparte na **wyłącznie pozytywnych
wzmocnieniach**. Poprawna odpowiedź wywołuje radosną informację zwrotną, a błędna - łagodną
zachętę do kolejnej próby, bez kar i bez punktów ujemnych. Dziecko samo wybiera moduł i
tempo, co wspiera samodzielność i poczucie sprawczości w duchu pedagogiki Montessori.

## 3. Wygląd i odczucia (nowa oprawa wizualna)

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

- Aplikacja generuje **krótkie, ciche dźwięki efektowe przez Web Audio API**
  (oscylatory), bez żadnych plików audio: `playCorrect()` (delikatny dwutonowy sygnał
  przy poprawnej odpowiedzi) oraz `playBadge()` (krótka radosna melodyjka przy nowej
  odznace i na podsumowaniu lekcji). Dźwięki są krótkie i stonowane - z umiarem.
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

## 4. Stos technologiczny

- **Czysty, statyczny HTML/CSS/JavaScript** - moduły ES, **bez kroku budowania** i bez
  frameworka. Pliki z katalogu `docs/` są serwowane wprost jako statyczne zasoby.
- **Web Speech API** (`window.speechSynthesis`) - wymowa na głos (pl-PL dla treści polskich,
  en-US dla modułu Angielski). Warstwa mowy degraduje się łagodnie (staje się no-op), gdy
  API nie jest dostępne.
- **Web Audio API** - krótkie dźwięki efektowe generowane oscylatorami (bez plików audio),
  wspólnie wyciszane z mową przez ten sam przełącznik dźwięku. Bezpieczny no-op, gdy API
  nie jest dostępne.
- **localStorage** - trwały zapis danych per profil (profile, punkty, gwiazdki, odznaki,
  stan powtórek Leitnera) oraz ustawienie wyciszenia dźwięku.
- **Vitest** - testy jednostkowe czystej logiki (harmonogram Leitnera, grywalizacja, seria
  dni). Logika domenowa w `docs/js/logic/` jest wolna od DOM i globali przeglądarki, więc
  importuje się tak samo w przeglądarce i w Node.

Struktura projektu odwzorowuje warstwy natywnej aplikacji:

```
docs/
  index.html            # punkt wejścia (czcionka Google Fonts + preconnect)
  css/styles.css        # style: tokeny, gradienty, przyciski 3D, animacje, fokus
  js/
    app.js              # bootstrap, router widoków, stały przełącznik dźwięku
    logic/              # czysta logika domenowa (testowana Vitest)
      content.js        # katalog treści (Kolory/Litery/Cyfry/Angielski)
      srs.js            # harmonogram powtórek Leitnera
      gamification.js   # punkty, gwiazdki, odznaki
      streak.js         # seria dni nauki
      models.js         # modele i stałe
    data/               # trwałość na localStorage
      storage.js
      progressService.js
    ui/                 # widoki i kontroler lekcji
    audio/
      speech.js         # obsługa Web Speech API (z bezpiecznym fallbackiem)
      soundEffects.js   # krótkie dźwięki Web Audio (playCorrect/playBadge)
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

## 5. Jak uruchomić lokalnie

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

## 6. Hosting

Aplikacja jest hostowana na **GitHub Pages** ze źródłem:

- **branch:** `main`
- **folder:** `/docs`
- **adres:** [https://tkojd.github.io/naukaweb/](https://tkojd.github.io/naukaweb/)

Ponieważ strona działa pod podścieżką `/naukaweb/`, **wszystkie ścieżki do zasobów są
względne** (nigdy nie zaczynają się od `/`). Dzięki temu aplikacja działa poprawnie zarówno
na GitHub Pages, jak i po otwarciu lokalnie z dysku. W katalogu `docs/` znajduje się też
pusty plik **`.nojekyll`**, który wyłącza przetwarzanie przez Jekyll i zapewnia, że pliki
są serwowane dokładnie tak, jak leżą w repozytorium.

## 7. Ograniczenia

- **Głosy Web Speech API zależą od przeglądarki i systemu operacyjnego.** Dostępność i
  jakość głosów (w tym głosu pl-PL) różni się między urządzeniami - na niektórych systemach
  głos polski może być niedostępny. Warstwa mowy działa wtedy w trybie no-op, a aplikacja
  pozostaje w pełni używalna.
- **Brak backendu.** Nie ma serwera ani konta użytkownika.
- **Działa offline** po pierwszym załadowaniu (statyczne pliki nie wymagają połączenia).
  Zaokrąglona czcionka z Google Fonts jest opcjonalna - jeśli CDN jest niedostępny,
  aplikacja korzysta z zaokrąglonej czcionki systemowej i nadal wygląda spójnie.
- **Dane trzymane lokalnie.** Postęp jest zapisywany w `localStorage` danej przeglądarki,
  więc nie przenosi się między urządzeniami ani przeglądarkami, a wyczyszczenie danych
  przeglądarki go usuwa.
