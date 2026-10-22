"use client";

import { useMessages } from "@/components/locale-provider";

type UnitJumpProps = {
  units: { order: number; title: string; cleared: boolean }[];
};

// Every surah is open, so learners can start anywhere: pick one and scroll
// to it. The full Quran course has 114 units, too many to scroll through.
export const UnitJump = ({ units }: UnitJumpProps) => {
  const t = useMessages();

  return (
    <label className="mb-8 flex items-center gap-x-3 text-neutral-700">
      <span className="shrink-0 font-bold">{t.learn.jumpTo}</span>
      <select
        defaultValue=""
        onChange={(event) =>
          document
            .getElementById(`unit-${event.target.value}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        className="w-full rounded-xl border-2 border-b-4 bg-white px-3 py-2 text-base"
      >
        <option value="" disabled>
          …
        </option>
        {units.map((unit) => (
          <option key={unit.order} value={unit.order}>
            {unit.cleared ? "✓ " : ""}
            {unit.title}
          </option>
        ))}
      </select>
    </label>
  );
};
