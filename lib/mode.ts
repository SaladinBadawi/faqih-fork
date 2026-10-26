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

// The unit (surah) of the last lesson opened on this device, so the learn
// page and "Continue" go back to it instead of the first surah.
export const LAST_UNIT_COOKIE = "last_unit";

// Read questions and options aloud: "1" on, "0" off. Unset: on in kids mode.
export const READ_ALOUD_COOKIE = "read_aloud";

export const readAloudOn = (cookie: string | undefined, mode: Mode) =>
  cookie === undefined ? mode === "kids" : cookie === "1";

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
