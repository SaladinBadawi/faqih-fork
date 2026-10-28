"use client";

import { Check, Crown, GraduationCap, Star } from "lucide-react";
import Link from "next/link";
import { CircularProgressbarWithChildren } from "react-circular-progressbar";

import { useMessages } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import "react-circular-progressbar/dist/styles.css";

const LessonLabel = ({
  text,
  exam,
  completed,
}: {
  text: string;
  exam?: boolean;
  completed?: boolean;
}) => (
  <span
    className={cn(
      "mt-1 block max-w-[140px] text-center text-sm font-bold leading-tight",
      exam ? "text-gold-700" : completed ? "text-brand-600" : "text-neutral-500"
    )}
  >
    {text}
  </span>
);

type LessonButtonProps = {
  id: number;
  index: number;
  totalCount: number;
  locked?: boolean;
  current?: boolean;
  completed?: boolean;
  /** The unit's exam: open once its lessons are done, see lib/progress. */
  exam?: boolean;
  percentage: number;
  /** What the lesson covers, shown under the button ("الآيات ١١–١٥"). */
  label: string;
};

export const LessonButton = ({
  id,
  index,
  totalCount,
  locked,
  current,
  completed,
  exam,
  percentage,
  label,
}: LessonButtonProps) => {
  const t = useMessages();
  const cycleLength = 8;
  const cycleIndex = index % cycleLength;

  let indentationLevel;

  if (cycleIndex <= 2) indentationLevel = cycleIndex;
  else if (cycleIndex <= 4) indentationLevel = 4 - cycleIndex;
  else if (cycleIndex <= 6) indentationLevel = 4 - cycleIndex;
  else indentationLevel = cycleIndex - 8;

  const rightPosition = indentationLevel * 40;

  const isFirst = index === 0;
  const isLast = index === totalCount;
  const isCompleted = !!completed;

  const Icon = isCompleted
    ? Check
    : exam
      ? GraduationCap
      : isLast
        ? Crown
        : Star;

  const href = `/lesson/${id}`;

  return (
    <Link
      href={href}
      aria-disabled={locked}
      aria-label={label}
      // A finished lesson can always be practised again.
      title={isCompleted ? `${label} · ${t.learn.practiseAgain}` : label}
      style={{ pointerEvents: locked ? "none" : "auto" }}
    >
      <div
        className="relative"
        style={{
          right: `${rightPosition}px`,
          marginTop: isFirst && !isCompleted ? 60 : 24,
        }}
      >
        {current ? (
          <div className="relative h-[102px] w-[102px]">
            <div className="absolute -top-6 left-2.5 z-10 animate-bounce rounded-xl border-2 bg-white px-3 py-2.5 font-bold uppercase tracking-wide text-brand-600">
              {t.learn.start}
              <div
                className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 transform border-x-8 border-t-8 border-x-transparent"
                aria-hidden
              />
            </div>
            <CircularProgressbarWithChildren
              value={Number.isNaN(percentage) ? 0 : percentage}
              styles={{
                path: {
                  stroke: "#3a62a0",
                },
                trail: {
                  stroke: "#e5e7eb",
                },
              }}
            >
              <Button
                size="rounded"
                variant={locked ? "locked" : "secondary"}
                className="h-[70px] w-[70px] border-b-8"
              >
                <Icon
                  className={cn(
                    "h-10 w-10",
                    locked
                      ? "fill-neutral-400 stroke-neutral-400 text-neutral-400"
                      : "fill-primary-foreground text-primary-foreground",
                    isCompleted && "fill-none stroke-[4]"
                  )}
                />
              </Button>
            </CircularProgressbarWithChildren>
            <LessonLabel text={label} />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-y-1">
            <Button
              size="rounded"
              variant={locked ? "locked" : "secondary"}
              className={cn(
                "h-[70px] w-[70px] border-b-8",
                exam &&
                  !locked &&
                  "border-gold-600 bg-gold-500 hover:bg-gold-500/90"
              )}
            >
              <Icon
                className={cn(
                  "h-10 w-10",
                  locked
                    ? "fill-neutral-400 stroke-neutral-400 text-neutral-400"
                    : "fill-primary-foreground text-primary-foreground",
                  isCompleted && "fill-none stroke-[4]"
                )}
              />
            </Button>
            <LessonLabel text={label} exam={exam} completed={isCompleted} />
          </div>
        )}
      </div>
    </Link>
  );
};
