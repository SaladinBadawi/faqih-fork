import { Fragment } from "react";

import { type lessons } from "@/db/schema";
import { type LessonState } from "@/lib/progress";

import { LessonButton } from "./lesson-button";
import { UnitBanner } from "./unit-banner";

type UnitProps = {
  title: string;
  description: string;
  lessons: (typeof lessons.$inferSelect &
    LessonState & { completed: boolean; percentage: number })[];
  completed: boolean;
  passedExam: boolean;
};

export const Unit = ({
  title,
  description,
  lessons,
  completed,
  passedExam,
}: UnitProps) => {
  // Lessons first, then the exam, which closes the unit.
  const steps = lessons.filter((l) => l.kind === "lesson");
  const exam = lessons.find((l) => l.kind === "exam");
  // "Continue" opens this unit's next lesson, else its exam.
  const next =
    steps.find((l) => l.current) ?? (exam?.completed ? undefined : exam);
  // Long surahs span several hizb quarters: show a heading where each starts.
  const grouped = new Set(steps.map((l) => l.section)).size > 1;

  return (
    <>
      <UnitBanner
        title={title}
        description={description}
        completed={completed}
        passedExam={passedExam}
        continueLessonId={next?.id}
      />

      <div className="relative flex flex-col items-center">
        {steps.map((lesson, i) => (
          <Fragment key={lesson.id}>
            {grouped &&
              lesson.section &&
              lesson.section !== steps[i - 1]?.section && (
                <h4 className="mt-10 w-full border-b-2 pb-2 text-center text-sm font-bold text-neutral-500">
                  {lesson.section}
                </h4>
              )}
            <LessonButton
              id={lesson.id}
              index={i}
              totalCount={steps.length - 1}
              current={lesson.current}
              locked={lesson.locked}
              completed={lesson.completed}
              percentage={lesson.percentage}
              label={lesson.title}
            />
          </Fragment>
        ))}

        {exam && (
          <LessonButton
            id={exam.id}
            index={steps.length}
            totalCount={steps.length}
            locked={exam.locked}
            completed={exam.completed}
            percentage={exam.percentage}
            label={exam.title}
            exam
          />
        )}
      </div>
    </>
  );
};
