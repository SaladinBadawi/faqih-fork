"use client";

import { useEffect, useState } from "react";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";

import { useLocale, useMessages } from "@/components/locale-provider";
import { formatNumber } from "@/lib/i18n";
import { LAST_JUZ_COOKIE, setPreferenceCookie } from "@/lib/mode";
import { cn } from "@/lib/utils";

type JuzPickerProps = {
  ajza: { juz: number; cleared: boolean }[];
  selected: number;
};

// The whole Quran one juz' at a time instead of one long page: the juz'
// shown, previous / next, and a grid of all of them.
export const JuzPicker = ({ ajza, selected }: JuzPickerProps) => {
  const t = useMessages();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  // Come back to this juz' next time.
  useEffect(() => {
    setPreferenceCookie(LAST_JUZ_COOKIE, String(selected));
  }, [selected]);

  const index = ajza.findIndex((j) => j.juz === selected);
  const previous = ajza[index - 1];
  const next = ajza[index + 1];
  const label = (juz: number) => t.learn.juz(formatNumber(locale, juz));

  return (
    <div className="mb-8 flex flex-col gap-y-3">
      <div className="flex items-center gap-x-2">
        <Link
          href={previous ? `/learn?juz=${previous.juz}` : "#"}
          aria-label={t.learn.previousJuz}
          aria-disabled={!previous}
          className={cn(
            "rounded-xl border-2 border-b-4 p-2 text-neutral-500 hover:bg-black/5",
            !previous && "pointer-events-none opacity-40"
          )}
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="juz-grid"
          className="flex flex-1 items-center justify-center gap-x-2 rounded-xl border-2 border-b-4 border-brand-300 bg-brand-100 py-2 font-bold text-brand-600 hover:bg-brand-200"
        >
          <LayoutGrid className="h-5 w-5" />
          {label(selected)}
        </button>
        <Link
          href={next ? `/learn?juz=${next.juz}` : "#"}
          aria-label={t.learn.nextJuz}
          aria-disabled={!next}
          className={cn(
            "rounded-xl border-2 border-b-4 p-2 text-neutral-500 hover:bg-black/5",
            !next && "pointer-events-none opacity-40"
          )}
        >
          <ChevronRight className="h-5 w-5 rtl:rotate-180" />
        </Link>
      </div>

      {open && (
        <ul
          id="juz-grid"
          aria-label={t.learn.allAjza}
          className="grid grid-cols-5 gap-2 sm:grid-cols-6"
        >
          {ajza.map(({ juz, cleared }) => (
            <li key={juz}>
              <Link
                href={`/learn?juz=${juz}`}
                onClick={() => setOpen(false)}
                aria-label={label(juz)}
                aria-current={juz === selected ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center justify-center rounded-xl border-2 border-b-4 font-bold text-neutral-600 hover:bg-black/5",
                  juz === selected && "border-brand-300 bg-brand-100 text-brand-600"
                )}
              >
                {formatNumber(locale, juz)}
                {cleared && (
                  <CheckCircle2 className="absolute -end-1.5 -top-1.5 h-4 w-4 rounded-full bg-white text-gold-500" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
