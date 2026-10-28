import type { ChallengeSpec, LessonSpec } from "./courses";
import type { SourceText } from "./sources";

// Read, then answer: a lesson goes a few ayat at a time. Each part shows
// its ayat (heard or read before its questions open), then asks only about
// them; the lesson ends with a review of all of it. Nothing is asked about
// an ayah that hasn't been read yet.

/** Ayat read together before their questions. */
export const AYAT_PER_PART = 2;

type LessonParts = Required<Pick<LessonSpec, "study" | "parts">> &
  Pick<LessonSpec, "challenges">;

/**
 * Splits a lesson into parts.
 * - `ayat`: the lesson's ayat, in order.
 * - `following`: the ayah after the lesson, if "what comes next?" asks
 *   about it for the last one.
 * - `questionsFor(i)`: the questions about `ayat[i]`.
 * - `review`: questions about the whole lesson, asked at the end.
 *
 * Each part also shows the ayah after its own, which "what comes next?"
 * asks about. The review part reads nothing new.
 */
export const lessonInParts = (
  ayat: SourceText[],
  following: SourceText | undefined,
  questionsFor: (i: number) => ChallengeSpec[],
  review: ChallengeSpec[]
): LessonParts => {
  const after = (i: number) => ayat[i] ?? following;
  const parts: string[][] = [];
  const challenges: ChallengeSpec[] = [];

  for (let from = 0; from < ayat.length; from += AYAT_PER_PART) {
    const to = Math.min(from + AYAT_PER_PART, ayat.length);
    const questions = Array.from({ length: to - from }, (_, k) =>
      questionsFor(from + k)
    ).flat();
    if (questions.length === 0) continue;
    const part = parts.length;
    const next = after(to);
    parts.push([
      ...ayat.slice(from, to).map((a) => a.key),
      ...(next ? [next.key] : []),
    ]);
    challenges.push(...questions.map((c) => ({ ...c, part })));
  }

  // One part only: its reading already covers the review.
  if (review.length > 0) {
    const part = parts.length > 1 ? parts.length : 0;
    if (parts.length !== 1) parts.push([]);
    challenges.push(...review.map((c) => ({ ...c, part })));
  }

  return {
    study: [...ayat, ...(following ? [following] : [])].map((a) => a.key),
    parts,
    challenges,
  };
};
