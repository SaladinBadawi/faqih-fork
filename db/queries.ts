import { cache } from "react";

import { eq } from "drizzle-orm";

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

  return { ...data, challenges: normalizedChallenges };
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
