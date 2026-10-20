import { shuffle } from "@/lib/exercises";

import {
  type ChallengeSpec,
  type CourseSpec,
  type Language,
  type LessonSpec,
} from "./courses";
import { type QuranQuestions, present } from "./quran-questions";

// Every unit ends with an exam. Passing it opens the next unit without
// marking this unit's lessons as done (see lib/progress).

const EXAM_SIZE = 8;

const examTitle = (lang: Language) =>
  lang === "ar" ? "اختبار الوحدة" : "Unit exam";

// Spread questions over the whole surah: positions in a fixed shuffled order.
const positions = (count: number, seed: string) =>
  shuffle(
    Array.from({ length: count }, (_, i) => i),
    seed
  );

/**
 * A surah's exam. Most questions span more than one ayah: what comes after a
 * two-ayah passage, how a passage ends, three ayat in order, ayat to their
 * numbers. Arabic exams also include listening.
 */
export const quranExam = (
  q: QuranQuestions,
  ayahCount: number,
  lang: Language,
  seed: string
): LessonSpec | null => {
  const at = positions(ayahCount, seed);
  const first = <T>(make: (i: number) => T | null, n: number) =>
    at
      .map(make)
      .filter((c): c is T => c !== null)
      .slice(0, n);

  const challenges: ChallengeSpec[] = [
    ...first(q.passageNext, 3),
    ...first(q.completePassage, 2),
    ...first((i) => q.orderAyat(i), 1),
    q.match(at.slice(0, 8).sort((a, b) => a - b)),
    ...(lang === "ar" ? first(q.listen, 1) : first(q.trueFalse, 1)),
  ].filter(present);

  if (challenges.length === 0) return null;

  return {
    kind: "exam",
    title: examTitle(lang),
    challenges: shuffle(challenges, `${seed}:order`).slice(0, EXAM_SIZE),
  };
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
