import { useMeanings } from "@/components/meanings";
import { challengeOptions, challenges } from "@/db/schema";
import { LIST_TYPES } from "@/lib/exercises";
import { cn } from "@/lib/utils";

import { Card } from "./card";

type ChallengeProps = {
  options: (typeof challengeOptions.$inferSelect)[];
  onSelect: (id: number) => void;
  status: "correct" | "wrong" | "none";
  selectedOption?: number;
  disabled?: boolean;
  type: (typeof challenges.$inferSelect)["type"];
};

export const Challenge = ({
  options,
  onSelect,
  status,
  selectedOption,
  disabled,
  type,
}: ChallengeProps) => {
  const meaningOf = useMeanings();
  return (
    <div
      className={cn(
        "grid gap-2",
        LIST_TYPES.includes(type)
          ? "grid-cols-1"
          : "grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(0,1fr))]"
      )}
    >
      {options.map((option, i) => (
        <Card
          key={option.id}
          id={option.id}
          text={option.text}
          imageSrc={option.imageSrc}
          shortcut={`${i + 1}`}
          selected={selectedOption === option.id}
          onClick={() => onSelect(option.id)}
          status={status}
          audioSrc={option.audioSrc}
          recitation={option.recitation}
          meaning={meaningOf(option.recitation)}
          disabled={disabled}
          type={type}
        />
      ))}
    </div>
  );
};
