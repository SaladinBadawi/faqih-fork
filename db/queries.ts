import { cache } from "react";

import { and, eq, inArray } from "drizzle-orm";

import { features } from "@/config";
import { getAuth } from "@/lib/auth";
import { getLocale } from "@/lib/locale";
import { courseInMode } from "@/lib/mode";
import { getLastUnitId, getMode } from "@/lib/preferences";
import { computeProgress, firstOpenLesson } from "@/lib/progress";

import db from "./drizzle";
import {
  challengeProgress,
  courses,
  lessons,
  mistakes,
  sourceTexts,
  units,
  userProgress,
  userSubscription,
} from "./schema";

const DAY_IN_MS = 86_400_000;

// Only courses in the visitor's language, and for their mode (kids/full).
export const getCourses = cache(async () => {
  const [data, mode] = await Promise.all([
    db.query.courses.findMany({
      where: eq(courses.language, await getLocale()),
    }),
    getMode(),
  ]);

  return data.filter((course) => courseInMode(course.track, mode));
});

/** Tracks that have at least one course in the visitor's language. */
export const getAvailableTracks = cache(async () => {
  const rows = await db
    .selectDistinct({ track: courses.track })
    .from(courses)
    .where(eq(courses.language, await getLocale()));
  return new Set(rows.map((r) => r.track));
});

// Draft lessons are hidden unless features.showDrafts is on.
const visibleLessons = features.showDrafts
  ? undefined
  : eq(lessons.reviewStatus, "reviewed");

export const getUserProgress = cache(async () => {
  const { userId } = await getAuth();

  if (!userId) return null;

  const data = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
    with: {
      activeCourse: true,
    },
  });

  // A course in the other language, or for the other mode, isn't active
  // while this language and mode are chosen.
  if (
    data?.activeCourse &&
    (data.activeCourse.language !== (await getLocale()) ||
      !courseInMode(data.activeCourse.track, await getMode()))
  )
    return { ...data, activeCourse: null, activeCourseId: null };

  return data;
});

export const getUnits = cache(async () => {
  const { userId } = await getAuth();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.activeCourseId) return [];

  // Only ids and progress: the full Quran course has thousands of challenges,
  // and the learn page doesn't need their text.
  const data = await db.query.units.findMany({
    where: eq(units.courseId, userProgress.activeCourseId),
    orderBy: (units, { asc }) => [asc(units.order)],
    with: {
      lessons: {
        where: visibleLessons,
        orderBy: (lessons, { asc }) => [asc(lessons.order)],
        with: {
          challenges: {
            columns: { id: true },
            with: {
              challengeProgress: {
                columns: { completed: true },
                where: eq(challengeProgress.userId, userId),
              },
            },
          },
        },
      },
    },
  });

  const withCompletion = data.map((unit) => ({
    ...unit,
    lessons: unit.lessons.map(({ challenges, ...lesson }) => {
      const done = challenges.filter(
        (challenge) =>
          challenge.challengeProgress.length > 0 &&
          challenge.challengeProgress.every((progress) => progress.completed)
      ).length;

      return {
        ...lesson,
        completed: challenges.length > 0 && done === challenges.length,
        percentage: challenges.length
          ? Math.round((done / challenges.length) * 100)
          : 0,
      };
    }),
  }));

  return computeProgress(withCompletion);
});

export const getCourseById = cache(async (courseId: number) => {
  const data = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      units: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          lessons: {
            where: visibleLessons,
            orderBy: (lessons, { asc }) => [asc(lessons.order)],
          },
        },
      },
    },
  });

  return data;
});

export const getCourseProgress = cache(async () => {
  const [units, lastUnitId] = await Promise.all([getUnits(), getLastUnitId()]);
  // Carry on in the surah the learner was last in, unless it is cleared.
  const lastUnit = units.find((u) => u.id === lastUnitId && !u.cleared);
  const activeLesson =
    (lastUnit && firstOpenLesson([lastUnit])) ?? firstOpenLesson(units);

  return { activeLesson, activeLessonId: activeLesson?.id };
});

// A hearts review: the learner's latest mistakes (topped up with questions
// they already completed, if they have fewer), each with what the quiz needs.
const REVIEW_SIZE = 3;

export const getReviewChallenges = cache(async () => {
  const { userId } = await getAuth();
  if (!userId) return [];

  const details = {
    challengeOptions: true,
    sourceText: true,
    lesson: { columns: { reviewStatus: true } },
  } as const;

  const recent = await db.query.mistakes.findMany({
    where: eq(mistakes.userId, userId),
    orderBy: (m, { desc }) => [desc(m.lastWrongAt)],
    limit: REVIEW_SIZE,
    with: { challenge: { with: details } },
  });
  const picked = recent.map((m) => m.challenge);

  if (picked.length < REVIEW_SIZE) {
    const done = await db.query.challengeProgress.findMany({
      where: and(
        eq(challengeProgress.userId, userId),
        eq(challengeProgress.completed, true)
      ),
      orderBy: (p, { desc }) => [desc(p.id)],
      limit: REVIEW_SIZE * 2,
      with: { challenge: { with: details } },
    });
    for (const { challenge } of done)
      if (
        picked.length < REVIEW_SIZE &&
        !picked.some((c) => c.id === challenge.id)
      )
        picked.push(challenge);
  }

  return picked.map((challenge) => ({ ...challenge, completed: false }));
});

export const getLesson = cache(async (id?: number) => {
  const { userId } = await getAuth();

  if (!userId) return null;

  const courseProgress = await getCourseProgress();
  const lessonId = id || courseProgress?.activeLessonId;

  if (!lessonId) return null;

  // Only lessons of the active course that are open (see lib/progress).
  const lessonState = (await getUnits())
    .flatMap((unit) => unit.lessons)
    .find((lesson) => lesson.id === lessonId);
  if (!lessonState || lessonState.locked) return null;

  const data = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: {
      challenges: {
        orderBy: (challenges, { asc }) => [asc(challenges.order)],
        with: {
          challengeOptions: true,
          sourceText: true,
          challengeProgress: {
            where: eq(challengeProgress.userId, userId),
          },
        },
      },
    },
  });

  if (!data || !data.challenges) return null;
  if (data.reviewStatus !== "reviewed" && !features.showDrafts) return null;

  const normalizedChallenges = data.challenges.map((challenge) => {
    const completed =
      challenge.challengeProgress &&
      challenge.challengeProgress.length > 0 &&
      challenge.challengeProgress.every((progress) => progress.completed);

    return { ...challenge, completed };
  });

  // The texts to read before the questions, in the lesson's order.
  const study = data.study ?? [];
  const texts = study.length
    ? await db.query.sourceTexts.findMany({
        where: inArray(sourceTexts.key, study),
      })
    : [];
  const studyTexts = study
    .map((key) => texts.find((t) => t.key === key))
    .filter((t) => t !== undefined);

  // English mode: the meaning of each ayah shown in the lesson (questions,
  // options), shown under the Arabic. Keyed by "surah:ayah".
  const meanings: Record<string, string> = {};
  if ((await getLocale()) === "en") {
    const refs = new Set<string>();
    for (const c of data.challenges) {
      for (const ref of c.readAloud?.ayat ?? []) refs.add(ref);
      for (const o of c.challengeOptions)
        if (o.recitation?.split(":").length === 2) refs.add(o.recitation);
      if (c.sourceText?.kind === "ayah")
        refs.add(c.sourceText.key.replace(/^quran:/, ""));
    }
    if (refs.size) {
      const rows = await db.query.sourceTexts.findMany({
        where: inArray(
          sourceTexts.key,
          [...refs].map((ref) => `quran:${ref}`)
        ),
        columns: { key: true, translation: true },
      });
      for (const row of rows)
        if (row.translation)
          meanings[row.key.replace(/^quran:/, "")] = row.translation;
    }
  }

  return {
    ...data,
    challenges: normalizedChallenges,
    studyTexts,
    meanings,
  };
});

export const getUserSubscription = cache(async () => {
  const { userId } = await getAuth();

  if (!userId) return null;

  const data = await db.query.userSubscription.findFirst({
    where: eq(userSubscription.userId, userId),
  });

  if (!data) return null;

  const isActive =
    data.stripePriceId &&
    data.stripeCurrentPeriodEnd?.getTime() + DAY_IN_MS > Date.now();

  return {
    ...data,
    isActive: !!isActive,
  };
});

export const getTopTenUsers = cache(async () => {
  const { userId } = await getAuth();

  if (!userId) return [];

  const data = await db.query.userProgress.findMany({
    orderBy: (userProgress, { desc }) => [desc(userProgress.points)],
    limit: 10,
    columns: {
      userId: true,
      userName: true,
      userImageSrc: true,
      points: true,
    },
  });

  return data;
});
