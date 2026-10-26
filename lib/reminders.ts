// Daily wird reminders: when one is due. Pure, so it can be tested.
//
// A device asks for a reminder at "HH:MM" in its own time zone. The cron runs
// every 15 minutes (and can run late), so a reminder is due once its local
// time has passed today, it hasn't been sent today, and it is at most
// LATE_WINDOW_MINUTES late. A missed day is skipped rather than sent hours
// late in the middle of the night.

export const LATE_WINDOW_MINUTES = 180;

/** Where a reminder opens: the learn page, with today's wird card. */
export const REMINDER_URL = "/learn?wird=1";

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isValidTime = (time: string) => TIME.test(time);

export const isValidTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
};

const minutesOf = (time: string) => {
  const [, h, m] = TIME.exec(time)!;
  return Number(h) * 60 + Number(m);
};

/** The local date ("YYYY-MM-DD") and minutes since midnight in a time zone. */
export const localNow = (timeZone: string, now: Date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

export const isDue = (
  reminder: {
    reminderTime: string;
    timeZone: string;
    lastSentOn: string | null;
  },
  now: Date
) => {
  if (
    !isValidTime(reminder.reminderTime) ||
    !isValidTimeZone(reminder.timeZone)
  )
    return false;
  const local = localNow(reminder.timeZone, now);
  const late = local.minutes - minutesOf(reminder.reminderTime);
  return (
    late >= 0 &&
    late <= LATE_WINDOW_MINUTES &&
    reminder.lastSentOn !== local.date
  );
};
