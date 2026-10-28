"use client";

import { type PropsWithChildren, createContext, useContext } from "react";

// English mode shows the meaning under the Arabic: the Quran is memorised in
// Arabic, and the meaning helps understand it. Meanings are keyed by
// "surah:ayah" and loaded with the lesson (empty in Arabic mode).
const MeaningsContext = createContext<Record<string, string>>({});

export const MeaningsProvider = ({
  meanings,
  children,
}: PropsWithChildren<{ meanings: Record<string, string> }>) => (
  <MeaningsContext.Provider value={meanings}>
    {children}
  </MeaningsContext.Provider>
);

/** The meaning of an ayah ("surah:ayah"); nothing for a word or no ref. */
export const useMeanings = () => {
  const meanings = useContext(MeaningsContext);
  return (ref: string | null | undefined) =>
    ref && ref.split(":").length === 2 ? meanings[ref] : undefined;
};

/** A meaning line under Arabic text. */
export const Meaning = ({ text }: { text?: string }) =>
  text ? (
    <span
      dir="ltr"
      lang="en"
      className="mt-1 block text-start font-sans text-sm leading-snug text-neutral-500"
    >
      {text}
    </span>
  ) : null;
