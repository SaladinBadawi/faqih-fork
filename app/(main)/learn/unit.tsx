import { type lessons } from "@/db/schema";
import { type LessonState } from "@/lib/progress";

import { LessonButton } from "./lesson-button";
import { UnitBanner } from "./unit-banner";

type UnitProps = {
  title: string;
  description: string;
  lessons: (typeof lessons.$inferSelect &
    LessonState & { completed: boolean; percentage: number })[];
  unlocked: boolean;
  completed: boolean;
  testedOut: boolean;
};

export const Unit = ({
  title,
  description,
  lessons,
  unlocked,
  completed,
  testedOut,
}: UnitProps) => {
  // Lessons first, then the exam, which closes the unit.
  const steps = lessons.filter((l) => l.kind === "lesson");
  const exam = lessons.find((l) => l.kind === "exam");
  // "Continue" opens this unit's next lesson, else its exam.
  const next =
    steps.find((l) => l.current) ?? (exam?.completed ? undefined : exam);

  return (
    <>
      <UnitBanner
        title={title}
        description={description}
        locked={!unlocked}
        completed={completed}
        testedOut={testedOut}
        continueLessonId={unlocked ? next?.id : undefined}
      />

      <div className="relative flex flex-col items-center">
        {steps.map((lesson, i) => (
          <LessonButton
            key={lesson.id}
            id={lesson.id}
            index={i}
            totalCount={steps.length - 1}
            current={lesson.current}
            locked={lesson.locked}
            completed={lesson.completed}
            percentage={lesson.percentage}
          />
        ))}

        {exam && (
          <LessonButton
            id={exam.id}
            index={steps.length}
            totalCount={steps.length}
            locked={exam.locked}
            completed={exam.completed}
            percentage={exam.percentage}
            exam
          />
        )}
      </div>
    </>
  );
};
