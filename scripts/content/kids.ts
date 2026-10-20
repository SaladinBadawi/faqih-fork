import {
  type ChallengeSpec,
  type CourseSpec,
  type Language,
  type LessonSpec,
  options,
  pick,
  words,
} from "./courses";
import { type SourceText, type Surah, surahAyat } from "./sources";

// The kids track: Al-Fatiha and the short surahs at the end of Juz Amma,
// in the order children usually memorise them (An-Nas first).
export const KIDS_SURAHS = [
  1, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105,
];

const KIDS_MIN_AGE = 5;
const KIDS_MAX_AGE = 10;
const DISTRACTORS = 2;

// Wrong answers come from the same surah first (the closest real
// alternatives), then from the other kids surahs. All of them are real ayat.
// `exclude` holds every answer that would also be correct (some surahs repeat
// an ayah, e.g. Al-Kafirun). Returns null when there aren't enough distinct
// wrong answers, so the question is skipped rather than shown with too few.
const distractors = (
  sameSurah: string[],
  otherSurahs: string[],
  exclude: string[],
  seed: string
) => {
  const own = pick(
    sameSurah.filter((t) => !exclude.includes(t)),
    exclude[0],
    DISTRACTORS,
    seed
  );
  const more = pick(
    otherSurahs.filter((t) => !exclude.includes(t) && !own.includes(t)),
    exclude[0],
    DISTRACTORS - own.length,
    `${seed}:more`
  );
  const all = [...own, ...more];
  return all.length === DISTRACTORS ? all : null;
};

const halve = (text: string) => {
  const w = words(text);
  const cut = Math.ceil(w.length / 2);
  return { start: w.slice(0, cut).join(" "), end: w.slice(cut).join(" ") };
};

const surahUnit = (
  surah: Surah,
  ayat: SourceText[],
  others: SourceText[],
  lang: Language
) => {
  const ar = lang === "ar";
  // English lessons use the English meaning; Arabic lessons the Quran text.
  const text = (a: SourceText) => (ar ? a.arabic : a.translation!);
  const own = ayat.map(text);
  const rest = others.map(text);

  const next = (
    ayah: SourceText,
    following: SourceText
  ): ChallengeSpec | null => {
    const seed = `kids:${following.key}:next:${lang}`;
    // If the question ayah appears more than once, each ayah after it is right.
    const right = ayat
      .slice(0, -1)
      .flatMap((a, i) => (text(a) === text(ayah) ? [text(ayat[i + 1])] : []));
    const wrong = distractors(own, rest, [...right, text(ayah)], seed);
    if (!wrong) return null;
    return {
      prompt: ar ? "ما الآية التالية؟" : "Which ayah comes next? (meaning)",
      question: text(ayah),
      sourceKey: following.key,
      options: options(text(following), wrong, seed),
    };
  };

  const ends = (list: SourceText[]) =>
    list.map((a) => halve(text(a)).end).filter(Boolean);

  const complete = (ayah: SourceText): ChallengeSpec | null => {
    const { start, end } = halve(text(ayah));
    if (!end) return null;
    const seed = `kids:${ayah.key}:end:${lang}`;
    // Any ayah with the same beginning makes its ending a right answer too.
    const right = [...ayat, ...others]
      .map((a) => halve(text(a)))
      .filter((h) => h.start === start)
      .map((h) => h.end);
    const wrong = distractors(ends(ayat), ends(others), [end, ...right], seed);
    if (!wrong) return null;
    return {
      prompt: ar ? "أكمل الآية" : "Complete the ayah (meaning)",
      question: `${start} …`,
      sourceKey: ayah.key,
      options: options(end, wrong, seed),
    };
  };

  const present = (c: ChallengeSpec | null): c is ChallengeSpec => c !== null;

  const lessons: LessonSpec[] = [
    {
      title: ar ? "ما الآية التالية؟" : "What comes next?",
      challenges: ayat
        .slice(0, -1)
        .map((a, i) => next(a, ayat[i + 1]))
        .filter(present),
    },
    {
      title: ar ? "أكمل الآية" : "Complete the ayah",
      challenges: ayat.map(complete).filter(present),
    },
  ];

  return {
    title: ar
      ? surah.name
      : `${surah.englishName} (${surah.englishNameTranslation})`,
    description: ar
      ? `نحفظ ${surah.name} آيةً آية`
      : `Learn ${surah.englishName} ayah by ayah`,
    // A lesson with no challenges could never be completed.
    lessons: lessons.filter((l) => l.challenges.length > 0),
  };
};

export const buildKidsShortSurahs = (
  surahs: Surah[],
  ayat: SourceText[],
  lang: Language
): CourseSpec => {
  const ar = lang === "ar";
  const kidsAyat = ayat.filter((a) => KIDS_SURAHS.includes(a.surah!));

  return {
    slug: `kids-short-surahs-${lang}`,
    language: lang,
    track: "kids",
    minAge: KIDS_MIN_AGE,
    maxAge: KIDS_MAX_AGE,
    title: ar ? "للأطفال: قصار السور" : "Kids: Short Surahs",
    imageSrc: "/mascot.svg",
    units: KIDS_SURAHS.map((number) => {
      const surah = surahs.find((s) => s.number === number);
      if (!surah) throw new Error(`Missing surah ${number}`);
      return surahUnit(
        surah,
        surahAyat(ayat, number),
        kidsAyat.filter((a) => a.surah !== number),
        lang
      );
    }),
  };
};
