// Which lessons a learner can open. Pure, so it can be tested without a DB.
//
// Rules:
// - Units (surahs) open in order. The first unit is always open.
// - The next unit opens when this one is completed, or when its exam is
//   passed. Passing the exam does NOT mark the unit's lessons as done: a
//   learner who tests out of a surah can still come back and learn it.
// - Inside an open unit, lessons open one after another, but the exam is
//   always open, so a learner who already knows the surah can test out.

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
  unlocked: boolean;
  completed: boolean;
  /** The exam was passed, but some lessons are not done yet. */
  testedOut: boolean;
};

type UnitInput = { lessons: LessonInput[] };

export type UnitProgress<U extends UnitInput> = Omit<U, "lessons"> &
  UnitState & { lessons: (U["lessons"][number] & LessonState)[] };

export const computeProgress = <U extends UnitInput>(
  units: U[]
): UnitProgress<U>[] => {
  let previousOpensNext = true;

  return units.map((unit) => {
    const unlocked = previousOpensNext;
    const completed =
      unit.lessons.length > 0 && unit.lessons.every((l) => l.completed);
    const exam = unit.lessons.find((l) => l.kind === "exam");
    const examPassed = !!exam?.completed;
    previousOpensNext = unlocked && (completed || examPassed);

    const next = unit.lessons.find((l) => l.kind === "lesson" && !l.completed);

    return {
      ...unit,
      unlocked,
      completed,
      testedOut: unlocked && examPassed && !completed,
      lessons: unit.lessons.map((lesson) => {
        const current = unlocked && lesson.id === next?.id;
        const open =
          unlocked && (lesson.completed || current || lesson.kind === "exam");
        return { ...lesson, current, locked: !open };
      }),
    };
  });
};

/** The lesson "Continue" opens: the first one still to do in an open unit. */
export const firstOpenLesson = <L extends LessonInput & LessonState>(
  units: { unlocked: boolean; lessons: L[] }[]
) =>
  units
    .filter((u) => u.unlocked)
    .flatMap((u) => u.lessons)
    .find((l) => !l.locked && !l.completed);
