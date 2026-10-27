"use client";

import { useTransition } from "react";

import {
  BookOpen,
  GraduationCap,
  type LucideIcon,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { upsertUserProgress } from "@/actions/user-progress";
import { useMessages } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

export type Mode = {
  key: "memorise" | "read" | "review" | "exams";
  disabled?: boolean;
} & ({ href: string } | { courseId: number });

const STYLE: Record<Mode["key"], { icon: LucideIcon; color: string }> = {
  memorise: { icon: Sparkles, color: "text-green-500 bg-green-100" },
  read: { icon: BookOpen, color: "text-sky-500 bg-sky-100" },
  review: { icon: RotateCcw, color: "text-rose-500 bg-rose-100" },
  exams: { icon: GraduationCap, color: "text-amber-500 bg-amber-100" },
};

export const ModeCards = ({ modes }: { modes: Mode[] }) => {
  const t = useMessages();
  const [pending, startTransition] = useTransition();

  // Switch course; the action ends by redirecting to /learn.
  const openCourse = (id: number) =>
    startTransition(() => {
      upsertUserProgress(id).catch((error) => {
        if (String(error?.digest ?? "").startsWith("NEXT_REDIRECT")) return;
        toast.error(t.error);
      });
    });

  return (
    <div className="mx-auto flex w-full max-w-[700px] flex-col gap-y-6 px-6 pb-10">
      <div className="flex flex-col items-center gap-y-2 text-center">
        <h1 className="text-2xl font-bold text-neutral-800">{t.modes.title}</h1>
        <p className="text-muted-foreground">{t.modes.description}</p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {modes.map((mode) => {
          const { icon: Icon, color } = STYLE[mode.key];
          const text = t.modes[mode.key];
          const disabled = mode.disabled || pending;
          const body = (
            <>
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl",
                  color
                )}
              >
                <Icon className="h-8 w-8" />
              </span>
              <span className="text-lg font-bold text-neutral-700">
                {text.title}
              </span>
              <span className="text-sm text-neutral-500">
                {mode.disabled ? t.modes.reviewEmpty : text.body}
              </span>
            </>
          );
          const className = cn(
            "flex h-full w-full flex-col items-center gap-y-2 rounded-xl border-2 border-b-4 p-5 text-center hover:bg-black/5 active:border-b-2",
            disabled && "pointer-events-none opacity-50"
          );

          return (
            <li key={mode.key}>
              {"href" in mode ? (
                <Link
                  href={mode.href}
                  aria-disabled={disabled}
                  className={className}
                >
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => openCourse(mode.courseId)}
                  className={className}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
