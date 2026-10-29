import type { NeonQueryFunction } from "@neondatabase/serverless";
import { eq, inArray } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";

// Re-importing a course replaces its lessons and questions with new rows,
// and progress points at the old ones. So, before a course is replaced, its
// learners' progress is saved by what it is about, not by row id:
// - a question: its lesson, type, source text and wording;
// - a finished lesson: its course, unit, place and title.
// Once the new course is in, progress is put back on the matching rows:
// - every question of a lesson the learner had finished counts as done,
//   even if the lesson's questions changed (asked in parts, reworded...);
// - any other question answered before is done again if it still exists;
// - mistakes waiting for review come back the same way.
// Something that no longer exists (a lesson removed or renamed) is dropped.

type Sql = NeonQueryFunction<false, false>;
type Db = NeonHttpDatabase<typeof schema>;

type Row = Record<string, unknown>;

/** A lesson, the same across imports. */
const lessonKey = (r: Row) => `${r.slug}|${r.unit}|${r.lesson}|${r.title}`;

/** A question, the same across imports. */
const challengeKey = (r: Row) =>
  `${lessonKey(r)}|${r.type}|${r.source_text_id}|${r.q}`;

export type SavedProgress = {
  /** Learner → course slug they were on. */
  active: Map<string, string>;
  /** Per course slug. */
  courses: Map<
    string,
    {
      done: { userId: string; challenge: string }[];
      finished: { userId: string; lesson: string }[];
      mistakes: { userId: string; challenge: string; lastWrongAt: Date }[];
    }
  >;
};

// What a question row is matched by. md5: questions can be whole ayat, and
// only equality matters.
const WHERE_IT_IS = `
  co.slug, u."order" as unit, l."order" as lesson, l.title,
  ch.type, ch.source_text_id, md5(ch.question) as q
`;
const FROM_CHALLENGES = `
  challenges ch
  join lessons l on l.id = ch.lesson_id
  join units u on u.id = l.unit_id
  join courses co on co.id = u.course_id
`;

/** A course's questions, with what they are matched by. */
const questionsOf = (sql: Sql, slug: string) =>
  sql.query(
    `select ch.id, ${WHERE_IT_IS} from ${FROM_CHALLENGES} where co.slug = $1`,
    [slug]
  );

/** Saves everyone's progress on the imported courses (by slug). */
export const saveProgress = async (sql: Sql): Promise<SavedProgress> => {
  // Run once now, so a broken query fails before anything is deleted.
  await questionsOf(sql, "");

  const [active, done, finished, mistakes] = await Promise.all([
    sql.query(`
      select up.user_id, co.slug
      from user_progress up join courses co on co.id = up.active_course_id
      where co.slug is not null`),
    sql.query(`
      select cp.user_id, ${WHERE_IT_IS}
      from ${FROM_CHALLENGES}
      join challenge_progress cp on cp.challenge_id = ch.id
      where cp.completed and co.slug is not null`),
    sql.query(`
      select cp.user_id, co.slug, u."order" as unit, l."order" as lesson, l.title
      from ${FROM_CHALLENGES}
      join challenge_progress cp on cp.challenge_id = ch.id
      where cp.completed and co.slug is not null
      group by cp.user_id, l.id, co.slug, u."order", l."order", l.title
      having count(distinct ch.id) =
        (select count(*) from challenges c2 where c2.lesson_id = l.id)`),
    sql.query(`
      select m.user_id, ${WHERE_IT_IS},
        to_char(m.last_wrong_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as last_wrong_at
      from ${FROM_CHALLENGES}
      join mistakes m on m.challenge_id = ch.id
      where co.slug is not null`),
  ]);

  const saved: SavedProgress = {
    active: new Map(active.map((r) => [r.user_id, r.slug])),
    courses: new Map(),
  };
  const course = (slug: string) => {
    if (!saved.courses.has(slug))
      saved.courses.set(slug, { done: [], finished: [], mistakes: [] });
    return saved.courses.get(slug)!;
  };
  for (const r of done)
    course(r.slug).done.push({ userId: r.user_id, challenge: challengeKey(r) });
  for (const r of finished)
    course(r.slug).finished.push({ userId: r.user_id, lesson: lessonKey(r) });
  for (const r of mistakes)
    course(r.slug).mistakes.push({
      userId: r.user_id,
      challenge: challengeKey(r),
      lastWrongAt: new Date(r.last_wrong_at),
    });

  return saved;
};

/** Takes learners off a course about to be deleted (it would delete them). */
export const leaveCourse = async (db: Db, slug: string) => {
  await db
    .update(schema.userProgress)
    .set({ activeCourseId: null })
    .where(
      inArray(
        schema.userProgress.activeCourseId,
        db
          .select({ id: schema.courses.id })
          .from(schema.courses)
          .where(eq(schema.courses.slug, slug))
      )
    );
};

const BATCH_SIZE = 1000;

const inBatches = async <T>(rows: T[], insert: (batch: T[]) => unknown) => {
  for (let i = 0; i < rows.length; i += BATCH_SIZE)
    await insert(rows.slice(i, i + BATCH_SIZE));
};

/** Puts saved progress back on the newly imported course `slug`. */
export const restoreProgress = async (
  sql: Sql,
  db: Db,
  saved: SavedProgress,
  slug: string
) => {
  const learners = [...saved.active]
    .filter(([, s]) => s === slug)
    .map(([userId]) => userId);
  if (learners.length > 0) {
    const [course] = await db
      .select({ id: schema.courses.id })
      .from(schema.courses)
      .where(eq(schema.courses.slug, slug));
    await db
      .update(schema.userProgress)
      .set({ activeCourseId: course.id })
      .where(inArray(schema.userProgress.userId, learners));
  }

  const progress = saved.courses.get(slug);
  if (!progress) return { done: 0, mistakes: 0 };

  const byChallenge = new Map<string, number[]>();
  const byLesson = new Map<string, number[]>();
  for (const r of await questionsOf(sql, slug)) {
    const c = challengeKey(r);
    const l = lessonKey(r);
    byChallenge.set(c, [...(byChallenge.get(c) ?? []), r.id]);
    byLesson.set(l, [...(byLesson.get(l) ?? []), r.id]);
  }

  // Learner and question, once each.
  const done = new Map<string, { userId: string; challengeId: number }>();
  const mark = (userId: string, ids: number[] = []) => {
    for (const challengeId of ids)
      done.set(`${userId}:${challengeId}`, { userId, challengeId });
  };
  for (const { userId, lesson } of progress.finished)
    mark(userId, byLesson.get(lesson));
  for (const { userId, challenge } of progress.done)
    mark(userId, byChallenge.get(challenge));

  const mistakes = new Map<
    string,
    { userId: string; challengeId: number; lastWrongAt: Date }
  >();
  for (const { userId, challenge, lastWrongAt } of progress.mistakes)
    for (const challengeId of byChallenge.get(challenge) ?? [])
      mistakes.set(`${userId}:${challengeId}`, {
        userId,
        challengeId,
        lastWrongAt,
      });

  await inBatches([...done.values()], (batch) =>
    db
      .insert(schema.challengeProgress)
      .values(batch.map((row) => ({ ...row, completed: true })))
  );
  await inBatches([...mistakes.values()], (batch) =>
    db.insert(schema.mistakes).values(batch).onConflictDoNothing()
  );

  return { done: done.size, mistakes: mistakes.size };
};
