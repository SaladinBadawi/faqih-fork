// Kids or full mode, chosen per device (a cookie, like the language).
//
// Kids mode: only kids courses, no hearts, no shop, leaderboard or quests,
// and bigger, simpler lesson screens. Full mode: every other course.

export const MODES = ["kids", "full"] as const;
export type Mode = (typeof MODES)[number];

export const MODE_COOKIE = "mode";
export const DEFAULT_MODE: Mode = "full";

// Set once the welcome tour is finished or skipped.
export const TOUR_COOKIE = "tour_done";

const YEAR_IN_SECONDS = 31_536_000;

export const isMode = (value: unknown): value is Mode =>
  MODES.includes(value as Mode);

/** Whether a course belongs to a mode: kids courses only in kids mode. */
export const courseInMode = (track: string | null, mode: Mode) =>
  mode === "kids" ? track === "kids" : track !== "kids";

/** Client-side: remember a preference on this device. */
export const setPreferenceCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/; max-age=${YEAR_IN_SECONDS}; samesite=lax`;
};

export const clearPreferenceCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
};
