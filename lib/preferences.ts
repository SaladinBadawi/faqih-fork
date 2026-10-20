import { cookies } from "next/headers";

import { DEFAULT_MODE, MODE_COOKIE, TOUR_COOKIE, isMode } from "@/lib/mode";

// Server-side: this device's kids/full mode, else the default.
export const getMode = async () => {
  const value = (await cookies()).get(MODE_COOKIE)?.value;
  return isMode(value) ? value : DEFAULT_MODE;
};

export const isTourDone = async () =>
  (await cookies()).get(TOUR_COOKIE)?.value === "1";
