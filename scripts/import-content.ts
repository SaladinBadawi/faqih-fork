import { neon } from "@neondatabase/serverless";
import "dotenv/config";
import { sql as drizzleSql, getTableColumns } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";

import {
  buildFatiha,
  buildMorningEvening,
  buildNawawi,
  type CourseSpec,
} from "./content/courses";
import { buildKidsShortSurahs } from "./content/kids";
import {
  type SourceText,
  type Surah,
  fetchHisnChapter,
  fetchNawawi,
  fetchQuran,
  surahAyat,
} from "./content/sources";

// Usage: npm run content:import [-- --refresh]
//   --refresh  re-download from the APIs instead of using content/cache
//
// Replaces ALL courses (and user progress on them) with the imported ones.

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const refresh = process.argv.includes("--refresh");

const BATCH_SIZE = 500;

const batches = <T>(items: T[]) =>
  Array.from({ length: Math.ceil(items.length / BATCH_SIZE) }, (_, i) =>
    items.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
  );

// On a key conflict, overwrite every column with the newly imported value.
const updateFromExcluded = Object.fromEntries(
  Object.entries(getTableColumns(schema.sourceTexts))
    .filter(([field]) => field !== "id" && field !== "key")
    .map(([field, column]) => [
      field,
      drizzleSql.raw(`excluded."${column.name}"`),
    ])
);

// Batched: the full Quran alone is 6,236 rows.
const upsertSourceTexts = async (texts: SourceText[]) => {
  const ids = new Map<string, number>();

  for (const batch of batches(texts)) {
    const rows = await db
      .insert(schema.sourceTexts)
      .values(
        batch.map((t) => ({
          key: t.key,
          kind: t.kind,
          arabic: t.arabic,
          translation: t.translation,
          translationBy: t.translationBy,
          citation: t.citation,
          citationAr: t.citationAr,
          hadithRef: t.hadithRef,
          hadithRefAr: t.hadithRefAr,
          sourceUrl: t.sourceUrl,
          audioSrc: t.audioSrc,
          repeat: t.repeat,
        }))
      )
      .onConflictDoUpdate({
        target: schema.sourceTexts.key,
        set: updateFromExcluded,
      })
      .returning({ id: schema.sourceTexts.id, key: schema.sourceTexts.key });

    for (const row of rows) ids.set(row.key, row.id);
  }

  return ids;
};

const upsertSurahs = async (surahs: Surah[]) => {
  await db
    .insert(schema.surahs)
    .values(surahs)
    .onConflictDoUpdate({
      target: schema.surahs.number,
      set: {
        name: drizzleSql.raw("excluded.name"),
        englishName: drizzleSql.raw("excluded.english_name"),
        englishNameTranslation: drizzleSql.raw(
          "excluded.english_name_translation"
        ),
        revelationType: drizzleSql.raw("excluded.revelation_type"),
        ayahCount: drizzleSql.raw("excluded.ayah_count"),
      },
    });
};

const insertCourse = async (
  course: CourseSpec,
  sourceIds: Map<string, number>
) => {
  const [courseRow] = await db
    .insert(schema.courses)
    .values({
      title: course.title,
      imageSrc: course.imageSrc,
      slug: course.slug,
      track: course.track,
      language: course.language,
      minAge: course.minAge ?? null,
      maxAge: course.maxAge ?? null,
    })
    .returning();

  let challengeCount = 0;

  for (const [u, unit] of course.units.entries()) {
    const [unitRow] = await db
      .insert(schema.units)
      .values({
        courseId: courseRow.id,
        title: unit.title,
        description: unit.description,
        order: u + 1,
      })
      .returning();

    for (const [l, lesson] of unit.lessons.entries()) {
      const [lessonRow] = await db
        .insert(schema.lessons)
        .values({
          unitId: unitRow.id,
          title: lesson.title,
          order: l + 1,
          reviewStatus: "draft",
        })
        .returning();

      for (const [c, challenge] of lesson.challenges.entries()) {
        const sourceTextId = sourceIds.get(challenge.sourceKey);
        if (!sourceTextId)
          throw new Error(`No source text for ${challenge.sourceKey}`);

        const [challengeRow] = await db
          .insert(schema.challenges)
          .values({
            lessonId: lessonRow.id,
            type: challenge.type ?? "ASSIST",
            payload: challenge.payload ?? null,
            prompt: challenge.prompt,
            question: challenge.question,
            sourceTextId,
            order: c + 1,
          })
          .returning();

        // ORDER, MATCH and typed answers have no options.
        if (challenge.options.length > 0)
          await db.insert(schema.challengeOptions).values(
            challenge.options.map((o) => ({
              challengeId: challengeRow.id,
              text: o.text,
              correct: o.correct,
            }))
          );
        challengeCount++;
      }
    }
  }

  console.log(
    `  ${course.title}: ${course.units.length} unit(s), ${course.units.flatMap((u) => u.lessons).length} lessons, ${challengeCount} challenges`
  );
};

const main = async () => {
  console.log(`Fetching sources${refresh ? " (refresh)" : ""}…`);
  const [quran, nawawi, morningEvening] = await Promise.all([
    fetchQuran(refresh),
    fetchNawawi(refresh),
    fetchHisnChapter(27, refresh),
  ]);

  const fatiha = surahAyat(quran.ayat, 1);
  const missingRefs = morningEvening.filter((d) => !d.hadithRef).length;
  console.log(
    `  Quran: ${quran.surahs.length} surahs, ${quran.ayat.length} ayat · Nawawi: ${nawawi.length} hadith · Hisn al-Muslim ch. 27: ${morningEvening.length} adhkar (${missingRefs} still need a hadith reference)`
  );

  console.log("Saving source texts…");
  await upsertSurahs(quran.surahs);
  const sourceIds = await upsertSourceTexts([
    ...quran.ayat,
    ...nawawi,
    ...morningEvening,
  ]);

  console.log("Replacing courses…");
  // Cascades to units, lessons, challenges, options and progress.
  await db.delete(schema.courses);

  // One course per language; nothing mixes Arabic and English.
  for (const lang of ["ar", "en"] as const)
    for (const course of [
      buildKidsShortSurahs(quran.surahs, quran.ayat, lang),
      buildFatiha(fatiha, lang),
      buildNawawi(nawawi, 10, lang),
      buildMorningEvening(morningEvening, lang),
    ])
      await insertCourse(course, sourceIds);

  console.log("Done. All lessons are drafts until reviewed.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
