import { CheckCircle2, GraduationCap, NotebookText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/locale";
import { cn } from "@/lib/utils";

type UnitBannerProps = {
  title: string;
  description: string;
  completed: boolean;
  /** Cleared by passing the exam; some lessons are still there to learn. */
  passedExam: boolean;
  continueLessonId?: number;
};

export const UnitBanner = async ({
  title,
  description,
  completed,
  passedExam,
  continueLessonId,
}: UnitBannerProps) => {
  const t = await getMessages();

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between rounded-xl p-5 text-white",
        // A cleared surah stands out, so learners see what they've finished.
        completed || passedExam ? "bg-amber-500" : "bg-green-500"
      )}
    >
      <div className="space-y-2.5">
        <h3 className="flex items-center gap-x-2 text-2xl font-bold">
          {title}
        </h3>
        <p className="text-lg">{description}</p>

        {completed && (
          <p className="flex items-center gap-x-1.5 text-sm font-bold">
            <CheckCircle2 className="h-4 w-4" />
            {t.learn.unitDone}
          </p>
        )}
        {passedExam && (
          <p className="flex items-center gap-x-1.5 text-sm font-bold">
            <GraduationCap className="h-4 w-4" />
            {t.learn.passedExam}
          </p>
        )}
      </div>

      {continueLessonId && (
        <Link href={`/lesson/${continueLessonId}`}>
          <Button
            size="lg"
            variant="secondary"
            className="hidden border-2 border-b-4 active:border-b-2 xl:flex"
          >
            <NotebookText className="me-2" />
            {t.learn.continue}
          </Button>
        </Link>
      )}
    </div>
  );
};
