import { shuffle } from "@/lib/exercises";

import {
  type ChallengeSpec,
  type CourseSpec,
  type Language,
  num,
  options,
  pick,
} from "./courses";
import { spreadQuestions } from "./exams";
import { quranQuestions } from "./quran-questions";
import { type SourceText, type Surah } from "./sources";

// One broad exam per juz' (30 in all), on top of each surah's own exam. The
// questions spread over the whole juz', across every surah in it, and add
// "which surah is this ayah from?". Passing a juz' exam clears that unit.

const JUZ_COUNT = 30;
const JUZ_EXAM_SIZE = 20;
const LONG_ORDER_WORDS = 15;

export const buildJuzExams = (
  surahs: Surah[],
  ayat: SourceText[],
  lang: Language
): CourseSpec => {
  const ar = lang === "ar";
  const name = (s: Surah) => (ar ? s.name : s.englishName);
  const surahOf = new Map(surahs.map((s) => [s.number, s]));

  // Surahs each ayah text appears in: a repeated ayah can't be asked
  // "which surah", or another option could be right too.
  const surahsWith = new Map<string, Set<number>>();
  for (const a of ayat)
    surahsWith.set(
      a.arabic,
      (surahsWith.get(a.arabic) ?? new Set()).add(a.surah!)
    );

  const units = Array.from({ length: JUZ_COUNT }, (_, j) => {
    const juz = j + 1;
    const inJuz = ayat.filter((a) => a.juz === juz);
    const numbers = [...new Set(inJuz.map((a) => a.surah!))];

    // Question makers per surah part of the juz', with the rest of the juz'
    // as the pool of wrong answers.
    const parts = numbers.map((n) => {
      const part = inJuz.filter((a) => a.surah === n);
      const others = inJuz.filter((a) => a.surah !== n);
      return {
        start: inJuz.indexOf(part[0]),
        part,
        q: quranQuestions(part, others, lang, `juz${juz}`),
      };
    });
    const at = (i: number) => {
      const p = [...parts].reverse().find((x) => x.start <= i)!;
      return { ...p, local: i - p.start };
    };

    // Which surah is this ayah from? Wrong answers are other surahs of this
    // juz' (or its neighbours when the juz' has fewer than three).
    const nearby = [
      ...numbers,
      ...[numbers[0] - 1, numbers.at(-1)! + 1, numbers[0] - 2],
    ].filter((n) => surahOf.has(n));
    const whichSurah = (i: number): ChallengeSpec | null => {
      const { part, local } = at(i);
      const ayah = part[local];
      if (surahsWith.get(ayah.arabic)!.size > 1) return null;
      const correct = surahOf.get(ayah.surah!)!;
      const seed = `juz${juz}:${ayah.key}:surah:${lang}`;
      const wrong = pick(
        nearby.filter((n) => n !== correct.number).map((n) => surahOf.get(n)!),
        correct,
        2,
        seed
      );
      if (wrong.length < 2) return null;
      return {
        prompt: ar ? "من أي سورة هذه الآية؟" : "Which surah is this ayah from?",
        question: ayah.arabic,
        sourceKey: ayah.key,
        options: options(name(correct), wrong.map(name), seed),
      };
    };

    const via =
      (
        kind: (
          q: (typeof parts)[number]["q"],
          i: number
        ) => ChallengeSpec | null
      ) =>
      (i: number) => {
        const { q, local } = at(i);
        return kind(q, local);
      };
    const makers = [
      whichSurah,
      via((q, i) => q.next(i)),
      via((q, i) => (ar ? q.typedWord(i) : q.complete(i))),
      via((q, i) => q.previous(i)),
      via((q, i) => q.passageNext(i)),
      via((q, i) => q.order(i, LONG_ORDER_WORDS)),
      via((q, i) => q.completePassage(i)),
      via((q, i) => q.orderAyat(i, 4)),
      via((q, i) => q.listen(i)),
    ];

    const challenges = spreadQuestions(
      makers,
      inJuz.length,
      JUZ_EXAM_SIZE,
      `juz${juz}:exam:${lang}`
    );

    const first = surahOf.get(numbers[0])!;
    const last = surahOf.get(numbers.at(-1)!)!;
    return {
      title: ar ? `الجزء ${num(lang, juz)}` : `Juz' ${juz}`,
      description:
        first === last
          ? name(first)
          : ar
            ? `من ${name(first)} إلى ${name(last)}`
            : `${name(first)} to ${name(last)}`,
      lessons: [
        {
          kind: "exam" as const,
          title: ar ? `اختبار الجزء ${num(lang, juz)}` : `Juz' ${juz} exam`,
          // Mixed order: a juz' exam isn't read from start to end.
          challenges: shuffle(challenges, `juz${juz}:order:${lang}`),
        },
      ],
    };
  });

  return {
    slug: `quran-juz-exams-${lang}`,
    language: lang,
    track: "quran",
    title: ar ? "اختبارات الأجزاء" : "Juz' Exams",
    imageSrc: "/courses/quran.svg",
    units: units.filter((u) => u.lessons[0].challenges.length > 0),
  };
};
