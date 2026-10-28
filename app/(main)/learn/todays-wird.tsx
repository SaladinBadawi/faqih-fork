import { BookOpenCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/locale";
import { cn } from "@/lib/utils";

type TodaysWirdProps = {
  lessonId: number;
  unitTitle: string;
  lessonTitle: string;
  /** Opened from the daily reminder: draw attention to the card. */
  highlight: boolean;
};

// Today's wird: the next lesson where the learner left off, one tap away.
// The daily reminder opens the learn page here.
export const TodaysWird = async ({
  lessonId,
  unitTitle,
  lessonTitle,
  highlight,
}: TodaysWirdProps) => {
  const t = await getMessages();

  return (
    <div
      className={cn(
        "mb-8 flex w-full items-center justify-between gap-x-4 rounded-xl border-2 border-b-4 p-4",
        highlight && "border-gold-400 bg-gold-50"
      )}
    >
      <div className="flex items-center gap-x-3">
        <BookOpenCheck className="h-8 w-8 shrink-0 text-gold-600" />
        <div>
          <p className="font-bold text-neutral-700">{t.learn.todaysWird}</p>
          <p className="text-sm text-neutral-500">
            {unitTitle} · {lessonTitle}
          </p>
        </div>
      </div>
      <Link href={`/lesson/${lessonId}`}>
        <Button variant="secondary" className="shrink-0">
          {t.learn.start}
        </Button>
      </Link>
    </div>
  );
};
