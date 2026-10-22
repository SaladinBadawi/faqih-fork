# Content

Lessons are generated from primary texts by `npm run content:import`
(`scripts/import-content.ts`). Add `-- --refresh` to re-download.

| Course                           | Source                                                                                                | Citation shown                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Kids: Short Surahs               | Same Quran source; Al-Fatiha and An-Nas to Al-Fil                                                     | `Quran s:n`, links to quran.com                                                      |
| The Whole Quran                  | Same Quran source; all 114 surahs, a lesson per 5 ayat                                                | `Quran s:n`, links to quran.com                                                      |
| Quran: Al-Fatiha                 | [alquran.cloud](https://alquran.cloud/api): Uthmani text (Tanzil), Sahih International, Alafasy audio | `Quran 1:n`, links to quran.com                                                      |
| Hadith: an-Nawawi's Forty (1–10) | [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api)                                   | `an-Nawawi's Forty Hadith #n` + takhrij (e.g. Bukhari & Muslim), links to sunnah.com |
| Adhkar: Morning & Evening        | [hisnmuslim.com API](https://www.hisnmuslim.com), Hisn al-Muslim ch. 27                               | `Hisn al-Muslim #id`, links to hisnmuslim.com                                        |

The import always loads the **full Quran** (114 surahs, 6,236 ayat) into
`source_texts` (keys `quran:<surah>:<ayah>`) and the `surahs` table, so any
course can use any ayah. The basmalah that the Uthmani edition puts before
the first ayah of each surah is removed (it is only an ayah in Al-Fatiha).

## Exercise types

Besides picking an option (`ASSIST`, `SELECT`), a challenge can be `LISTEN`,
`TRUE_FALSE`, `COMPLETE_WORD`, `COMPLETE_AYAH`, `ORDER` or `MATCH`. The
type-specific data lives in `challenges.payload` (see `lib/exercises.ts`).
The kids course generates all of them from the Quran text.

## Exams

Every unit ends with an exam (`kind: "exam"`). Quran units get their own
exam, mostly multi-ayah questions (`scripts/content/exams.ts`). Other
courses get an exam sampled from the unit's lessons. Units can be taken in
any order; passing a unit's exam clears it (see `lib/progress.ts`).

## Read aloud and recitation

Lessons can be heard as well as read (Settings → Read aloud; on by default in
kids mode).

- **Quran is only ever recited by a qari**, never by a synthetic voice.
  `scripts/content/recitations.ts` marks which text is exactly an ayah
  (`challenges.read_aloud`, `challenge_options.recitation`, ORDER
  `recitations`) or exactly one word of an ayah. Fragments (half an ayah,
  MATCH excerpts) get no audio.
- Ayah audio comes from [EveryAyah](https://www.everyayah.com) at runtime
  (`lib/recitation.ts`): al-Husary's teaching recitation (_muallim_) in kids
  mode, Alafasy in full mode. Free to use with attribution.
- Word audio is Quran.com's word-by-word recitation
  (`audio.qurancdn.com/wbw/SSS_AAA_WWW.mp3`). Word positions come from
  `ayahWords`, which matches Quran.com's word positions (checked on Al-Fatiha,
  Al-Baqarah, Al-Kahf, Ya-Sin, Al-Ikhlas and An-Nas). **Confirm the licence
  before a public launch.**
- The app's own words (instructions, "أحسنت!") use the browser's speech
  voice. With no voice for the language installed, they are skipped.

## Rules

- Every course is built twice: an Arabic course and an English course. A
  question and its options are always in one language; there are no
  translation questions.
- Every challenge links to its `source_texts` row; the app shows the citation.
- Wrong answers are always other real texts or real values from the data.
  When a surah repeats an ayah (e.g. Al-Kafirun), every equally right answer
  is kept out of the wrong options, and a question without two distinct wrong
  answers is skipped.
- Every lesson is imported as `draft`. Only a qualified reviewer sets it to `reviewed`.
- `content/cache/` is gitignored: translations and audio are copyrighted.
  Get permission or use openly licensed translations before a public launch.

## Hisn al-Muslim references

The hisnmuslim.com API does not include each dhikr's hadith reference. A
reviewer adds them from the book's footnotes to
`references/hisn-al-muslim.json`, keyed by dhikr ID:

```json
{ "77": { "en": "Muslim 2723", "ar": "رواه مسلم ٢٧٢٣" } }
```

Only add a reference after checking it against the book and the hadith
collection. Never fill it in from memory.
