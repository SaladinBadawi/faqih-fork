"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { MAX_HEARTS } from "@/constants";
import db from "@/db/drizzle";
import { getUserProgress } from "@/db/queries";
import { challengeProgress, mistakes, userProgress } from "@/db/schema";
import { getAuth } from "@/lib/auth";

/**
 * A right answer in a hearts review: one heart back, and the mistake is
 * cleared. Only for questions the learner got wrong, or (when there are no
 * mistakes to review) ones they already completed, so hearts can't be farmed
 * from questions they never saw.
 */
export const reviewAnswer = async (challengeId: number) => {
  const { userId } = await getAuth();
  if (!userId) throw new Error("Unauthorized.");

  const progress = await getUserProgress();
  if (!progress) throw new Error("User progress not found.");

  const owned = and(
    eq(mistakes.userId, userId),
    eq(mistakes.challengeId, challengeId)
  );
  const mistake = await db.query.mistakes.findFirst({ where: owned });
  const completed =
    mistake ??
    (await db.query.challengeProgress.findFirst({
      where: and(
        eq(challengeProgress.userId, userId),
        eq(challengeProgress.challengeId, challengeId),
        eq(challengeProgress.completed, true)
      ),
    }));
  if (!completed) throw new Error("Not a question to review.");

  if (mistake) await db.delete(mistakes).where(owned);

  const hearts = Math.min(progress.hearts + 1, MAX_HEARTS);
  await db
    .update(userProgress)
    .set({ hearts })
    .where(eq(userProgress.userId, userId));

  revalidatePath("/learn");
  revalidatePath("/shop");
  return { hearts };
};
