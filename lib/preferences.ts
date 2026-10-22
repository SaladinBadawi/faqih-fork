import { cookies } from "next/headers";

import {
  DEFAULT_MODE,
  MODE_COOKIE,
  READ_ALOUD_COOKIE,
  TOUR_COOKIE,
  isMode,
  readAloudOn,
} from "@/lib/mode";

// Server-side: this device's kids/full mode, else the default.
export const getMode = async () => {
  const value = (await cookies()).get(MODE_COOKIE)?.value;
  return isMode(value) ? value : DEFAULT_MODE;
};

export const isTourDone = async () =>
  (await cookies()).get(TOUR_COOKIE)?.value === "1";

export const isReadAloudOn = async () =>
  readAloudOn(
    (await cookies()).get(READ_ALOUD_COOKIE)?.value,
    await getMode()
  );
