// Which lessons a learner can open. Pure, so it can be tested without a DB.
//
// Rules:
// - Every unit (surah) is open: learners pick any surah, in any order.
// - A unit is cleared when its exam is passed or all its lessons are done.
//   Moving on to another surah without either leaves it unfinished.
// - Inside a unit that isn't cleared, lessons open one after another, and
//   the exam once they are all done: read and learn first, then be tested.
//   (A unit with no lessons, like a juz' exam, has its exam open.)
// - Once a unit is cleared, all its lessons are open to practise.

export type LessonKind = "lesson" | "exam";

export type LessonInput = {
  id: number;
  kind: LessonKind;
  completed: boolean;
};

export type LessonState = {
  locked: boolean;
  /** The next lesson to do in its unit. */
  current: boolean;
};

export type UnitState = {
  /** All lessons, including the exam, are done. */
  completed: boolean;
  /** The exam is passed or all lessons are done. */
  cleared: boolean;
  /** Cleared by passing the exam, with lessons still to learn. */
  passedExam: boolean;
};

type UnitInput = { lessons: LessonInput[] };

export type UnitProgress<U extends UnitInput> = Omit<U, "lessons"> &
  UnitState & { lessons: (U["lessons"][number] & LessonState)[] };

export const computeProgress = <U extends UnitInput>(
  units: U[]
): UnitProgress<U>[] =>
  units.map((unit) => {
    const lessons = unit.lessons.filter((l) => l.kind === "lesson");
    const exam = unit.lessons.find((l) => l.kind === "exam");
    const examPassed = !!exam?.completed;
    const lessonsDone = lessons.length > 0 && lessons.every((l) => l.completed);
    const completed =
      unit.lessons.length > 0 && unit.lessons.every((l) => l.completed);
    const cleared = examPassed || completed || (lessonsDone && !exam);

    const next = lessons.find((l) => !l.completed);
    // An exam passed before this rule stays open to retake.
    const examOpen = examPassed || lessons.every((l) => l.completed);

    return {
      ...unit,
      completed,
      cleared,
      passedExam: examPassed && !completed,
      lessons: unit.lessons.map((lesson) => {
        const current = lesson.id === next?.id;
        const open =
          cleared ||
          lesson.completed ||
          current ||
          (lesson.kind === "exam" && examOpen);
        return { ...lesson, current, locked: !open };
      }),
    };
  });

/** The lesson "Continue" opens: the next lesson of the first unit not cleared. */
export const firstOpenLesson = <L extends LessonInput & LessonState>(
  units: { cleared: boolean; lessons: L[] }[]
) =>
  units
    .filter((u) => !u.cleared)
    .flatMap((u) => u.lessons)
    .find((l) => !l.locked && !l.completed);
