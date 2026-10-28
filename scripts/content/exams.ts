import { shuffle } from "@/lib/exercises";

import {
  type ChallengeSpec,
  type CourseSpec,
  type Language,
  type LessonSpec,
} from "./courses";
import { type QuranQuestions } from "./quran-questions";

// Every unit ends with an exam; passing it clears the unit (lib/progress).
//
// Quran exams mix question kinds. Full-mode exams add harder, exam-only ones
// the lessons never ask (type the missing word, the ayah before, passages,
// long orderings); kids exams keep to simple kinds. Both spread over the
// whole surah: it is split into equal segments, one question each, so a long
// surah like Al-Baqarah is covered from start to end.

const EXAM_SIZE = 8; // exams sampled from lessons, and kids exams
const MIN_EXAM_SIZE = 10;
const MAX_EXAM_SIZE = 25;
const AYAT_PER_QUESTION = 10;
// Short surahs: at most two questions per ayah, so the exam doesn't repeat.
const MAX_QUESTIONS_PER_AYAH = 2;
const LONG_ORDER_WORDS = 15;

const examTitle = (lang: Language) =>
  lang === "ar" ? "اختبار الوحدة" : "Unit exam";

type Make = (i: number) => ChallengeSpec | null;

/** The kinds an exam rotates through, by audience and language. */
const recipe = (q: QuranQuestions, lang: Language, kids: boolean): Make[] => {
  const ar = lang === "ar";
  if (kids)
    // Kids keep to simple kinds they already know from their lessons: one
    // ayah at a time, choosing from options. No typing, no ayah before, no
    // passages, no long orderings: those are for full mode.
    return [q.next, q.listen, q.complete, q.trueFalse, (i) => q.order(i)];
  return [
    q.next,
    ar ? q.typedWord : q.complete,
    q.previous,
    q.passageNext,
    (i) => q.order(i, LONG_ORDER_WORDS),
    q.completePassage,
    (i) => q.orderAyat(i, 4 + (i % 2)),
    q.listen,
  ];
};

/**
 * Picks `size` questions spread over ayat [0, count): slot k takes a
 * position in the k-th segment and the k-th kind (falling back to other
 * positions in its segment, then to the other kinds). Never the same kind
 * at the same ayah twice. Returned in surah order.
 */
export const spreadQuestions = (
  makers: Make[],
  count: number,
  size: number,
  seed: string
) => {
  const used = new Set<string>();
  const picked: { at: number; challenge: ChallengeSpec }[] = [];
  for (let k = 0; k < size; k++) {
    const from = Math.floor((k * count) / size);
    const to = Math.max(from + 1, Math.floor(((k + 1) * count) / size));
    const segment = shuffle(
      Array.from({ length: to - from }, (_, n) => from + n),
      `${seed}:${k}`
    );
    const kinds = makers.map((_, n) => (k + n) % makers.length);
    search: for (const kind of kinds)
      for (const at of segment) {
        if (used.has(`${kind}:${at}`)) continue;
        const challenge = makers[kind](at);
        if (!challenge) continue;
        used.add(`${kind}:${at}`);
        picked.push({ at, challenge });
        break search;
      }
  }
  return picked.sort((a, b) => a.at - b.at).map((p) => p.challenge);
};

/**
 * A surah's exam: size grows with the surah (kids exams stay short). Pass
 * question makers built with their own seed (not the lessons'), so exam
 * questions get different wrong answers from the lessons.
 */
export const quranExam = (
  q: QuranQuestions,
  ayahCount: number,
  lang: Language,
  seed: string,
  kids = false
): LessonSpec | null => {
  const size = kids
    ? EXAM_SIZE
    : Math.min(
        MAX_EXAM_SIZE,
        Math.max(
          Math.min(MIN_EXAM_SIZE, ayahCount * MAX_QUESTIONS_PER_AYAH),
          Math.ceil(ayahCount / AYAT_PER_QUESTION)
        )
      );
  const challenges = spreadQuestions(
    recipe(q, lang, kids),
    ayahCount,
    size,
    seed
  );

  if (challenges.length === 0) return null;
  return { kind: "exam", title: examTitle(lang), challenges };
};

/**
 * Adds an exam to every unit that has none, from a fixed sample of the
 * unit's own questions. Used for courses without a dedicated exam builder
 * (Al-Fatiha, an-Nawawi, adhkar).
 */
export const withExams = (course: CourseSpec): CourseSpec => ({
  ...course,
  units: course.units.map((unit, u) => {
    if (unit.lessons.some((l) => l.kind === "exam")) return unit;
    const pool = unit.lessons.flatMap((l) => l.challenges);
    if (pool.length === 0) return unit;
    return {
      ...unit,
      lessons: [
        ...unit.lessons,
        {
          kind: "exam" as const,
          title: examTitle(course.language),
          challenges: shuffle(pool, `${course.slug}:${u}:exam`).slice(
            0,
            EXAM_SIZE
          ),
        },
      ],
    };
  }),
});
