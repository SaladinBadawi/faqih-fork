"use server";

import { and, eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { pushSubscriptions } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { isLocale } from "@/lib/i18n";
import { isValidTime, isValidTimeZone } from "@/lib/reminders";

type ReminderInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  reminderTime: string; // "HH:MM"
  timeZone: string; // IANA
  locale: string;
};

const requireUser = async () => {
  const { userId } = await getAuth();
  if (!userId) throw new Error("Unauthorized.");
  return userId;
};

/** Turns on (or updates) the daily reminder for this device. */
export const saveReminder = async (input: ReminderInput) => {
  const userId = await requireUser();

  if (
    !input.endpoint.startsWith("https://") ||
    !input.p256dh ||
    !input.auth ||
    !isValidTime(input.reminderTime) ||
    !isValidTimeZone(input.timeZone) ||
    !isLocale(input.locale)
  )
    throw new Error("Invalid reminder.");

  const values = {
    userId,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    reminderTime: input.reminderTime,
    timeZone: input.timeZone,
    locale: input.locale,
    // A new time can still remind today.
    lastSentOn: null,
  };

  await db
    .insert(pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values });
};

/** Turns off the daily reminder for this device. */
export const deleteReminder = async (endpoint: string) => {
  const userId = await requireUser();

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.userId, userId)
      )
    );
};

/** This device's reminder time, if it has one. */
export const getReminder = async (endpoint: string) => {
  const userId = await requireUser();

  const row = await db.query.pushSubscriptions.findFirst({
    where: and(
      eq(pushSubscriptions.endpoint, endpoint),
      eq(pushSubscriptions.userId, userId)
    ),
    columns: { reminderTime: true },
  });

  return row ?? null;
};
