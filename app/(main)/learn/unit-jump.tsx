"use client";

import { useMemo, useRef, useState } from "react";

import { CheckCircle2, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { useLocale, useMessages } from "@/components/locale-provider";
import { normalizeArabic } from "@/lib/arabic";
import { formatNumber } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type UnitJumpProps = {
  // juz: the juz' the unit starts in, when the page shows one at a time.
  units: {
    order: number;
    title: string;
    cleared: boolean;
    juz: number | null;
  }[];
};

const MAX_RESULTS = 12;

// Every surah is open, so learners can start anywhere: search for one by
// name (Arabic without diacritics, or English) or number, and scroll to it.
export const UnitJump = ({ units }: UnitJumpProps) => {
  const t = useMessages();
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return units.slice(0, MAX_RESULTS);
    const digits = q.replace(/[\u0660-\u0669]/g, (d) =>
      String(d.charCodeAt(0) - 0x0660)
    );
    const bare = normalizeArabic(q);
    const lower = q.toLowerCase();
    return units
      .filter(
        (u) =>
          String(u.order) === digits ||
          (bare && normalizeArabic(u.title).includes(bare)) ||
          u.title.toLowerCase().includes(lower)
      )
      .slice(0, MAX_RESULTS);
  }, [query, units]);

  const go = ({ order, juz }: UnitJumpProps["units"][number]) => {
    const target = document.getElementById(`unit-${order}`);
    // In another juz': open that juz' at the surah.
    if (!target && juz) router.push(`/learn?juz=${juz}#unit-${order}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    setQuery("");
    setOpen(false);
    input.current?.blur();
  };

  return (
    <div className="relative mb-8">
      <label className="flex items-center gap-x-3 rounded-xl border-2 border-b-4 bg-white px-4 py-2 focus-within:border-brand-300">
        <Search className="h-5 w-5 shrink-0 text-neutral-400" />
        <span className="sr-only">{t.learn.jumpTo}</span>
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Let a click on a result land before the list closes.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) go(results[0]);
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={`${t.learn.jumpTo}: ${t.learn.searchUnits}`}
          className="w-full bg-transparent py-1 text-base text-neutral-700 outline-none placeholder:text-neutral-400"
          role="combobox"
          aria-expanded={open}
          aria-controls="unit-jump-results"
          autoComplete="off"
        />
      </label>

      {open && (
        <ul
          id="unit-jump-results"
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border-2 border-b-4 bg-white p-2 shadow-lg"
        >
          {results.length === 0 && (
            <li className="px-3 py-2 text-sm text-neutral-500">
              {t.learn.noResults}
            </li>
          )}
          {results.map((unit) => (
            <li key={unit.order} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(unit)}
                className="flex w-full items-center gap-x-3 rounded-lg px-3 py-2 text-start hover:bg-brand-100"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold text-neutral-500">
                  {formatNumber(locale, unit.order)}
                </span>
                <span
                  className={cn(
                    "flex-1 font-bold text-neutral-700",
                    locale === "ar" && "font-arabic"
                  )}
                >
                  {unit.title}
                </span>
                {unit.cleared && (
                  <CheckCircle2 className="h-5 w-5 text-gold-500" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
