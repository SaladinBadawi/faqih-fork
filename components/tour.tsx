"use client";

import { useState } from "react";

import { Baby, BookOpen } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useMessages } from "@/components/locale-provider";
import { useMode } from "@/components/mode-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MODE_COOKIE,
  type Mode,
  TOUR_COOKIE,
  setPreferenceCookie,
} from "@/lib/mode";
import { cn } from "@/lib/utils";

// A short welcome tour on the first visit: what Faqih is, how units,
// lessons and exams work, and kids or full mode. Skip ends it at any step;
// Settings can show it again.
export const Tour = ({ open: initiallyOpen }: { open: boolean }) => {
  const router = useRouter();
  const t = useMessages();
  const currentMode = useMode();
  const [open, setOpen] = useState(initiallyOpen);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>(currentMode);

  const steps = t.tour.steps;
  const isLast = step === steps.length - 1;

  const finish = (chosen?: Mode) => {
    setPreferenceCookie(TOUR_COOKIE, "1");
    if (chosen && chosen !== currentMode)
      setPreferenceCookie(MODE_COOKIE, chosen);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && finish()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-5 flex w-full items-center justify-center">
            <Image src="/mascot.svg" alt="" height={80} width={80} />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            {steps[step].title}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {steps[step].body}
          </DialogDescription>
        </DialogHeader>

        {isLast && (
          <div className="flex flex-col gap-y-2">
            <p className="text-center font-bold text-neutral-700">
              {t.tour.chooseMode}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["kids", Baby, t.settings.kids],
                  ["full", BookOpen, t.settings.full],
                ] as const
              ).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    "flex flex-col items-center gap-y-2 rounded-xl border-2 border-b-4 p-4 font-bold text-neutral-700 hover:bg-black/5",
                    mode === value && "border-sky-300 bg-sky-100 text-sky-600"
                  )}
                >
                  <Icon className="h-8 w-8" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step dots */}
        <div className="flex justify-center gap-x-2" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-2 rounded-full bg-neutral-300",
                i === step && "bg-green-500"
              )}
            />
          ))}
        </div>

        <DialogFooter className="mb-2">
          <div className="flex w-full items-center justify-between gap-x-2">
            <Button variant="ghost" onClick={() => finish()}>
              {t.tour.skip}
            </Button>
            <div className="flex gap-x-2">
              {step > 0 && (
                <Button
                  variant="primaryOutline"
                  onClick={() => setStep(step - 1)}
                >
                  {t.tour.back}
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => (isLast ? finish(mode) : setStep(step + 1))}
              >
                {isLast ? t.tour.done : t.tour.next}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
