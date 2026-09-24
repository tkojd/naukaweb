# Źródła i licencje zasobów (obrazki i dźwięk)

Aplikacja **Nauka i Zabawa** korzysta z zasobów na otwartych licencjach. Poniżej
znajduje się wymagane prawnie oznaczenie autorstwa oraz linki do licencji. Wszystkie
pliki są **hostowane lokalnie** w katalogu `docs/assets/` i pobrane jednorazowo za
pomocą skryptów z katalogu [`scripts/`](../scripts/) (nie są pobierane w trakcie
działania aplikacji ani podczas testów).

---

## 1. Obrazki (ikony) — OpenMoji

- **Zestaw:** [OpenMoji](https://openmoji.org/) — kolorowe ikony SVG.
- **Wersja:** `15.0.0`.
- **Licencja:** **CC BY-SA 4.0**
  ([creativecommons.org/licenses/by-sa/4.0](https://creativecommons.org/licenses/by-sa/4.0/)).
- **Autorstwo:** „All emojis designed by OpenMoji – the open-source emoji and icon
  project. License: CC BY-SA 4.0”.
- **Pochodzenie plików:** pobrane po kodzie Unicode (codepoint) z
  `https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0.0/color/svg/<CODEPOINT>.svg`.
- **Lokalizacja:** `docs/assets/img/*.svg`.
- **Pełna lista plików wraz z codepointami i adresami źródłowymi:**
  [`docs/assets/img/manifest.json`](assets/img/manifest.json).
- **Skrypt pobierający:** [`scripts/fetch-icons.mjs`](../scripts/fetch-icons.mjs)
  (uruchamiany raz, idempotentny, z ograniczeniem tempa i pomijaniem braków).

Ikony dobrano tak, aby były **jednoznaczne dla małego dziecka** i **nie zdradzały
odpowiedzi**, gdy pełnią rolę dystraktorów.

## 2. Wymowa angielska (nagrania) — Wikimedia Commons

- **Rodzaj:** prawdziwe nagrania głosu lektorów (nie synteza mowy), przede wszystkim
  w formacie Ogg Vorbis (`.ogg`).
- **Pochodzenie:** [Wikimedia Commons](https://commons.wikimedia.org/). Nagrania
  odnaleziono przez [Free Dictionary API](https://dictionaryapi.dev/)
  (`https://api.dictionaryapi.dev`), a pliki pobrano bezpośrednio z Wikimedia Commons.
- **Licencje:** **CC BY 3.0** oraz **CC BY-SA 3.0**
  ([by/3.0](https://creativecommons.org/licenses/by/3.0/),
  [by-sa/3.0](https://creativecommons.org/licenses/by-sa/3.0/)).
- **Lokalizacja:** `docs/assets/audio/en/*` (plus
  [`manifest.json`](assets/audio/en/manifest.json) z oznaczeniem źródła i licencji
  dla każdego słowa).
- **Skrypty:** [`scripts/fetch-audio.mjs`](../scripts/fetch-audio.mjs) pobiera nagrania;
  [`scripts/rebuild-audio-manifest.mjs`](../scripts/rebuild-audio-manifest.mjs)
  odtwarza manifest z plików obecnych na dysku (na wypadek przerwania pobierania).

### Uwaga o pokryciu i o zapasowym mechanizmie mowy

Darmowe API słownikowe ma **niepełne pokrycie** i bywa **niedostępne / ogranicza tempo
zapytań** (podczas pobierania część zapytań zwracała błędy HTTP 522 / limit żądań).
Dlatego zestaw prawdziwych nagrań jest **wyselekcjonowanym ziarnem początkowym**, a
angielskie słowa **bez** pobranego nagrania są odczytywane **zapasowo przez syntezę mowy
przeglądarki (Web Speech, `en-US`)**. Ponowne uruchomienie
`scripts/fetch-audio.mjs`, gdy API jest sprawne, pobierze kolejne nagrania — wystarczy
dopisać ich identyfikatory w `docs/js/logic/assets.js` (mapa `ENGLISH_AUDIO`).

Aktualnie dołączone nagrania (słowo → plik):

| Słowo | Plik |
| ----- | ---- |
| bird | `assets/audio/en/english_bird.ogg` |
| cat | `assets/audio/en/english_cat.ogg` |
| cow | `assets/audio/en/english_cow.ogg` |
| dog | `assets/audio/en/english_dog.ogg` |
| duck | `assets/audio/en/english_duck.ogg` |
| fish | `assets/audio/en/english_fish.ogg` |
| horse | `assets/audio/en/english_horse.ogg` |
| pig | `assets/audio/en/english_pig.ogg` |
| rabbit | `assets/audio/en/english_rabbit.ogg` |
| sheep | `assets/audio/en/english_sheep.ogg` |
| two | `assets/audio/en/english_two.wav` |

Wszystkie powyższe nagrania pochodzą z Wikimedia Commons na licencjach
**CC BY 3.0 / CC BY-SA 3.0**. Szczegóły dla każdego pliku (w tym adres strony
źródłowej, gdy udało się go odczytać) znajdują się w
[`docs/assets/audio/en/manifest.json`](assets/audio/en/manifest.json).

## 3. Mowa polska

Treści polskie (nazwy kolorów, litery, liczby, polecenia) są odczytywane przez
**syntezę mowy przeglądarki (Web Speech, `pl-PL`)**. Nie dołączamy tu nagrań polskich.
