"use client";

import { useState } from "react";

import { useMessages } from "@/components/locale-provider";
import { useReadAloud } from "@/components/read-aloud";
import { type Answer, type ExerciseStatus, shuffle } from "@/lib/exercises";
import { isArabic } from "@/lib/utils";

import { WordChip } from "./word-chip";

type OrderExerciseProps = {
  words: string[]; // in the correct order
  /** Recitation per word ("s:a:w") or ayah ("s:a"), played when tapped. */
  recitations?: (string | null)[];
  seed: number;
  status: ExerciseStatus;
  onAnswer: (answer: Answer) => void;
};

// Tap the words of an ayah in order. Tapping a placed word puts it back.
export const OrderExercise = ({
  words,
  recitations,
  seed,
  status,
  onAnswer,
}: OrderExerciseProps) => {
  const t = useMessages();
  const readAloud = useReadAloud();

  // Hear the word (or ayah) on the chip as recitation, if read-aloud is on.
  const recite = (i: number) => {
    const ref = recitations?.[i];
    if (readAloud.enabled && ref) readAloud.play([{ kind: "recite", ref }]);
  };

  // Word positions, shuffled. Never start in the right order.
  const [bank] = useState(() => {
    const order = shuffle(
      words.map((_, i) => i),
      seed
    );
    const solved = order.every((i, n) => words[i] === words[n]);
    return solved && words.length > 1 ? [...order.slice(1), order[0]] : order;
  });
  const [placed, setPlaced] = useState<number[]>([]);

  const locked = status !== "none";
  const dir = isArabic(words[0] ?? "") ? "rtl" : "ltr";

  const update = (next: number[]) => {
    setPlaced(next);
    onAnswer({
      ready: next.length === words.length,
      // Compare words, not positions: an ayah can repeat a word.
      correct: next.map((i) => words[i]).join(" ") === words.join(" "),
    });
  };

  return (
    <div className="flex flex-col gap-y-6">
      <div
        dir={dir}
        aria-label={t.lesson.tapToRemove}
        className="flex min-h-[64px] flex-wrap items-center gap-2 border-b-2 pb-3"
      >
        {placed.map((i) => (
          <WordChip
            key={i}
            text={words[i]}
            tone={status}
            disabled={locked}
            onClick={() => {
              recite(i);
              update(placed.filter((p) => p !== i));
            }}
          />
        ))}
      </div>

      <div dir={dir} className="flex flex-wrap justify-center gap-2">
        {bank.map((i) => (
          <WordChip
            key={i}
            text={words[i]}
            invisible={placed.includes(i)}
            disabled={locked}
            onClick={() => {
              recite(i);
              update([...placed, i]);
            }}
          />
        ))}
      </div>
    </div>
  );
};
