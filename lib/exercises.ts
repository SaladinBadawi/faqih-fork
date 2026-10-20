// Exercise types beyond picking one option, and the data each one needs.
// Kept free of server imports: the lesson UI (client) and the content
// importer (script) both use it.

export const CHALLENGE_TYPES = [
  "SELECT", // pick one option (short options, grid)
  "ASSIST", // pick one option (long options, list)
  "LISTEN", // play the ayah's recitation, pick the ayah
  "TRUE_FALSE", // judge a statement, two options
  "COMPLETE_WORD", // fill one missing word: choose from options, or type it
  "COMPLETE_AYAH", // type the rest of an ayah
  "ORDER", // tap the words of an ayah in order
  "MATCH", // pair items from two columns
] as const;

export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

/** Types answered by picking one of the challenge's options. */
export const OPTION_TYPES: readonly ChallengeType[] = [
  "SELECT",
  "ASSIST",
  "LISTEN",
  "TRUE_FALSE",
];

/** Option types whose options are long texts, shown one per row. */
export const LIST_TYPES: readonly ChallengeType[] = ["ASSIST", "LISTEN"];

export type OrderPayload = { words: string[] }; // in the correct order
export type CompleteWordPayload = {
  before: string;
  after: string;
  answer: string;
  mode: "choose" | "type"; // "choose" uses the challenge's options
};
export type CompleteAyahPayload = { answer: string };
export type MatchPayload = { pairs: { left: string; right: string }[] };

export type ChallengePayload =
  | OrderPayload
  | CompleteWordPayload
  | CompleteAyahPayload
  | MatchPayload;

export type ExerciseStatus = "correct" | "wrong" | "none";

/** What an exercise reports to the lesson after every change. */
export type Answer = { ready: boolean; correct: boolean };

/** Whether a challenge is answered by picking one of its options. */
export const usesOptions = (
  type: ChallengeType,
  payload: ChallengePayload | null
) =>
  OPTION_TYPES.includes(type) ||
  (type === "COMPLETE_WORD" &&
    (payload as CompleteWordPayload | null)?.mode !== "type");

// Deterministic shuffle, so a challenge looks the same on every visit and on
// the server and client renders.
export const shuffle = <T>(items: T[], seed: string | number) => {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };

  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
