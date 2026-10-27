import { redirect } from "next/navigation";

import { getCourses, getReviewChallenges, getUserProgress } from "@/db/queries";
import { getLocale } from "@/lib/locale";
import { getMode } from "@/lib/preferences";

import { type Mode, ModeCards } from "./mode-cards";

// Learning modes: the ways to learn, side by side. Memorise (the lessons),
// read (read mode), review (recent mistakes) and exams (juz' exams).
const ModesPage = async () => {
  const [userProgress, courses, review, mode, locale] = await Promise.all([
    getUserProgress(),
    getCourses(),
    getReviewChallenges(),
    getMode(),
    getLocale(),
  ]);
  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  const isKids = mode === "kids";
  const active = userProgress.activeCourseId;
  const course = (slug: string) => courses.find((c) => c.slug === slug);
  const exams = course(`quran-juz-exams-${locale}`);
  const lessons = isKids
    ? course(`kids-short-surahs-${locale}`)
    : course(`quran-full-${locale}`);

  // A mode that is a course: open it, switching to it if needed.
  const open = (courseId: number | undefined) =>
    courseId === undefined || courseId === active
      ? { href: "/learn" }
      : { courseId };

  const modes: Mode[] = [
    {
      key: "memorise",
      // From the exams, back to the lessons; else the course already open.
      ...(active === exams?.id ? open(lessons?.id) : { href: "/learn" }),
    },
    { key: "read", href: "/read" },
    // Kids mode has no hearts or exams.
    ...(isKids
      ? []
      : [
          {
            key: "review",
            href: "/lesson/review",
            disabled: review.length === 0,
          } as const,
          ...(exams ? [{ key: "exams", ...open(exams.id) } as const] : []),
        ]),
  ];

  return <ModeCards modes={modes} />;
};

export default ModesPage;
