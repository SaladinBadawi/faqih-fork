"use client";

import { useState } from "react";

import {
  type Answer,
  type ExerciseStatus,
  type MatchPayload,
  shuffle,
} from "@/lib/exercises";

import { WordChip } from "./word-chip";

type MatchExerciseProps = {
  pairs: MatchPayload["pairs"];
  seed: number;
  status: ExerciseStatus;
  onAnswer: (answer: Answer) => void;
};

// Pair each item on the start side with one on the end side: tap an item,
// then its partner. Tapping a paired item on the start side unpairs it.
export const MatchExercise = ({
  pairs,
  seed,
  status,
  onAnswer,
}: MatchExerciseProps) => {
  const [ends] = useState(() =>
    shuffle(
      pairs.map((_, i) => i),
      seed
    )
  );
  const [selected, setSelected] = useState<number | null>(null);
  // start index -> end index
  const [matches, setMatches] = useState<Record<number, number>>({});

  const locked = status !== "none";
  // Compare texts, so two identical end items are interchangeable.
  const isRight = (start: number) =>
    matches[start] !== undefined &&
    pairs[matches[start]].right === pairs[start].right;

  const update = (next: Record<number, number>) => {
    setMatches(next);
    onAnswer({
      ready: Object.keys(next).length === pairs.length,
      correct: pairs.every(
        (_, i) =>
          next[i] !== undefined && pairs[next[i]].right === pairs[i].right
      ),
    });
  };

  const onStart = (i: number) => {
    if (matches[i] !== undefined) {
      update(
        Object.fromEntries(
          Object.entries(matches).filter(([start]) => Number(start) !== i)
        )
      );
      return;
    }
    setSelected(selected === i ? null : i);
  };

  const onEnd = (j: number) => {
    if (selected === null) return;
    // An end item belongs to one start item at a time.
    const rest = Object.fromEntries(
      Object.entries(matches).filter(([, end]) => end !== j)
    );
    update({ ...rest, [selected]: j });
    setSelected(null);
  };

  const startOf = (j: number) =>
    Object.entries(matches).find(([, end]) => end === j)?.[0];

  const tone = (start: number) => {
    if (status === "none") return "selected" as const;
    return isRight(start) ? ("correct" as const) : ("wrong" as const);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-3">
        {pairs.map((pair, i) => (
          <WordChip
            key={i}
            text={pair.left}
            className="w-full"
            disabled={locked}
            badge={matches[i] !== undefined ? i + 1 : undefined}
            tone={
              matches[i] !== undefined
                ? tone(i)
                : selected === i
                  ? "selected"
                  : "none"
            }
            onClick={() => onStart(i)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {ends.map((j) => {
          const start = startOf(j);
          return (
            <WordChip
              key={j}
              text={pairs[j].right}
              className="w-full"
              disabled={locked}
              badge={start !== undefined ? Number(start) + 1 : undefined}
              tone={start !== undefined ? tone(Number(start)) : "none"}
              onClick={() => onEnd(j)}
            />
          );
        })}
      </div>
    </div>
  );
};
