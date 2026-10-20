import { normalizeArabic } from "@/lib/arabic";
import { shuffle } from "@/lib/exercises";

import {
  type ChallengeSpec,
  type CourseSpec,
  type Language,
  type LessonSpec,
  num,
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
const ORDER_MIN_WORDS = 3;
const ORDER_MAX_WORDS = 10;
const MATCH_PAIRS = 4;
const EXCERPT_WORDS = 5;

// The words of an ayah. Waqf (pause) marks that stand alone are kept with
// the word before them, so a learner never has to place a bare mark.
const ayahWords = (text: string) =>
  words(text).reduce<string[]>((out, w) => {
    if (!/\p{L}/u.test(w) && out.length > 0) out[out.length - 1] += ` ${w}`;
    else out.push(w);
    return out;
  }, []);

const excerpt = (text: string) => {
  const w = ayahWords(text);
  return w.length <= EXCERPT_WORDS
    ? text
    : `${w.slice(0, EXCERPT_WORDS).join(" ")} …`;
};

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

  // Tap the ayah's words in order.
  const order = (ayah: SourceText): ChallengeSpec | null => {
    const w = ayahWords(text(ayah));
    if (w.length < ORDER_MIN_WORDS || w.length > ORDER_MAX_WORDS) return null;
    return {
      type: "ORDER",
      payload: { words: w },
      prompt: ar ? "رتّب كلمات الآية" : "Put the words in order (meaning)",
      question: "",
      sourceKey: ayah.key,
      options: [],
    };
  };

  // Hear the recitation, pick the ayah. Arabic only: in English it would be
  // a translation question.
  const listen = (ayah: SourceText): ChallengeSpec | null => {
    if (!ar || !ayah.audioSrc) return null;
    const seed = `kids:${ayah.key}:listen`;
    const same = ayat.filter((a) => a.arabic === ayah.arabic).map(text);
    const wrong = distractors(own, rest, same, seed);
    if (!wrong) return null;
    return {
      type: "LISTEN",
      prompt: "استمع واختر الآية",
      question: "",
      sourceKey: ayah.key,
      options: options(text(ayah), wrong, seed),
    };
  };

  // One word of the ayah is missing; wrong choices are real words from other
  // ayat. Arabic only. The longest word is hidden: it is the most distinctive.
  const completeWord = (ayah: SourceText): ChallengeSpec | null => {
    if (!ar) return null;
    const w = ayahWords(ayah.arabic);
    if (w.length < ORDER_MIN_WORDS) return null;
    const lengths = w.map((x) => normalizeArabic(x).length);
    const hide = lengths.indexOf(Math.max(...lengths));
    const answer = w[hide];
    const key = normalizeArabic(answer);
    const pool = (list: SourceText[]) =>
      list
        .flatMap((a) => ayahWords(a.arabic))
        .filter((x) => normalizeArabic(x).length > 1);
    const same = [...pool(ayat), ...pool(others)].filter(
      (x) => normalizeArabic(x) === key
    );
    const seed = `kids:${ayah.key}:word`;
    const wrong = distractors(
      pool(ayat),
      pool(others),
      [answer, ...same],
      seed
    );
    // Skip if two choices would read the same without diacritics.
    if (!wrong || new Set(wrong.map(normalizeArabic)).size < wrong.length)
      return null;
    return {
      type: "COMPLETE_WORD",
      payload: {
        before: w.slice(0, hide).join(" "),
        after: w.slice(hide + 1).join(" "),
        answer,
        mode: "choose",
      },
      prompt: "أكمل الكلمة الناقصة",
      question: "",
      sourceKey: ayah.key,
      options: options(answer, wrong, seed),
    };
  };

  // Match the first ayat to their numbers. Repeated or same-looking ayat are
  // left out, so every pair is unambiguous.
  const match = (): ChallengeSpec | null => {
    const seen = new Set<string>();
    const chosen = ayat
      .filter((a) => {
        const left = excerpt(text(a));
        if (seen.has(left)) return false;
        seen.add(left);
        return true;
      })
      .slice(0, MATCH_PAIRS);
    if (chosen.length < 3) return null;
    return {
      type: "MATCH",
      payload: {
        pairs: chosen.map((a) => ({
          left: excerpt(text(a)),
          right: num(lang, a.number),
        })),
      },
      prompt: ar ? "صِل كل آية برقمها" : "Match each ayah to its number",
      question: "",
      sourceKey: chosen[0].key,
      options: [],
    };
  };

  // Does the second ayah come right after the first? Half the time it does;
  // otherwise it is another real ayah of the surah that can't follow.
  const trueFalse = (
    ayah: SourceText,
    following: SourceText
  ): ChallengeSpec | null => {
    const seed = `kids:${following.key}:tf:${lang}`;
    const right = ayat
      .slice(0, -1)
      .flatMap((a, i) => (text(a) === text(ayah) ? [text(ayat[i + 1])] : []));
    const [wrongNext] = pick(
      own.filter((t) => !right.includes(t) && t !== text(ayah)),
      text(following),
      1,
      seed
    );
    const isTrue = !wrongNext || shuffle([true, false], seed)[0];
    if (!isTrue && !wrongNext) return null;
    const second = isTrue ? text(following) : wrongNext;
    return {
      type: "TRUE_FALSE",
      prompt: ar
        ? "هل تأتي الآية الثانية بعد الأولى مباشرة؟"
        : "Does the second ayah come right after the first? (meaning)",
      question: `${text(ayah)}\n⬇\n${second}`,
      sourceKey: following.key,
      // Always in this order: true, then false.
      options: [
        { text: ar ? "صح" : "True", correct: isTrue },
        { text: ar ? "خطأ" : "False", correct: !isTrue },
      ],
    };
  };

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
    {
      title: ar ? "استمع واختر" : "Listen and choose",
      challenges: ayat.map(listen).filter(present),
    },
    {
      title: ar ? "الكلمة الناقصة" : "The missing word",
      challenges: ayat.map(completeWord).filter(present),
    },
    {
      title: ar ? "رتّب الكلمات" : "Word order",
      challenges: ayat.map(order).filter(present),
    },
    {
      title: ar ? "صح أم خطأ" : "True or false",
      challenges: ayat
        .slice(0, -1)
        .map((a, i) => trueFalse(a, ayat[i + 1]))
        .filter(present),
    },
    {
      title: ar ? "أرقام الآيات" : "Ayah numbers",
      challenges: [match()].filter(present),
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
