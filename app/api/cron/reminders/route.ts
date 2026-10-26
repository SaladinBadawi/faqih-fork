import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import webpush from "web-push";

import db from "@/db/drizzle";
import { pushSubscriptions } from "@/db/schema";
import { isLocale, messages } from "@/lib/i18n";
import { REMINDER_URL, isDue, localNow } from "@/lib/reminders";

// Sends the daily wird reminders that are due. Called every 15 minutes by
// the "Daily wird reminders" GitHub Action, with CRON_SECRET as a bearer
// token. Public route (see proxy.ts): the secret is the protection.
export const dynamic = "force-dynamic";

// The push service says the subscription is gone (unsubscribed, expired).
const GONE = new Set([404, 410]);

export const GET = async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new NextResponse("Unauthorized.", { status: 401 });

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject)
    return new NextResponse("Push keys are not configured.", { status: 500 });
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const now = new Date();
  const due = (await db.select().from(pushSubscriptions)).filter((s) =>
    isDue(s, now)
  );

  const results = await Promise.allSettled(
    due.map(async (s) => {
      const t = messages[isLocale(s.locale) ? s.locale : "ar"].reminder;
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: t.title, body: t.body, url: REMINDER_URL }),
        { TTL: 60 * 60 }
      );
      await db
        .update(pushSubscriptions)
        .set({ lastSentOn: localNow(s.timeZone, now).date })
        .where(eq(pushSubscriptions.id, s.id));
    })
  );

  const gone = due
    .filter((_, i) => {
      const r = results[i];
      return (
        r.status === "rejected" &&
        GONE.has((r.reason as { statusCode?: number })?.statusCode ?? 0)
      );
    })
    .map((s) => s.id);
  if (gone.length)
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.id, gone));

  return NextResponse.json({
    due: due.length,
    sent: results.filter((r) => r.status === "fulfilled").length,
    removed: gone.length,
  });
};
