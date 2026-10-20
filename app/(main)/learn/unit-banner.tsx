import { CheckCircle2, GraduationCap, Lock, NotebookText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/locale";
import { cn } from "@/lib/utils";

type UnitBannerProps = {
  title: string;
  description: string;
  locked: boolean;
  completed: boolean;
  /** Exam passed, lessons not all done: the unit is open but not finished. */
  testedOut: boolean;
  continueLessonId?: number;
};

export const UnitBanner = async ({
  title,
  description,
  locked,
  completed,
  testedOut,
  continueLessonId,
}: UnitBannerProps) => {
  const t = await getMessages();

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between rounded-xl p-5 text-white",
        locked ? "bg-neutral-400" : "bg-green-500"
      )}
    >
      <div className="space-y-2.5">
        <h3 className="flex items-center gap-x-2 text-2xl font-bold">
          {locked && <Lock className="h-5 w-5" aria-label={t.learn.locked} />}
          {title}
        </h3>
        <p className="text-lg">{description}</p>

        {completed && (
          <p className="flex items-center gap-x-1.5 text-sm font-bold">
            <CheckCircle2 className="h-4 w-4" />
            {t.learn.unitDone}
          </p>
        )}
        {testedOut && (
          <p className="flex items-center gap-x-1.5 text-sm font-bold">
            <GraduationCap className="h-4 w-4" />
            {t.learn.testedOut}
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
