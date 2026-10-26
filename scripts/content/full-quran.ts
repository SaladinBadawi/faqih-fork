import {
  type ChallengeSpec,
  type CourseSpec,
  type Language,
  type LessonSpec,
  num,
} from "./courses";
import { quranExam } from "./exams";
import { quranQuestions } from "./quran-questions";
import { type SourceText, type Surah, surahAyat } from "./sources";

// The whole Quran: one unit per surah, in mushaf order. Each unit has a
// lesson per group of ayat and ends with an exam whose questions span more
// than one ayah.

const AYAT_PER_LESSON = 5;

const QUARTERS_AR = [
  "الربع الأول",
  "الربع الثاني",
  "الربع الثالث",
  "الربع الرابع",
];

// "الحزب ٣ · الربع الثاني": the hizb quarter (1-240) as the mushaf divides it.
const hizbSection = (hizbQuarter: number, lang: Language) => {
  const hizb = Math.ceil(hizbQuarter / 4);
  const quarter = ((hizbQuarter - 1) % 4) + 1;
  return lang === "ar"
    ? `الحزب ${num(lang, hizb)} · ${QUARTERS_AR[quarter - 1]}`
    : `Hizb ${hizb} · quarter ${quarter}`;
};

const surahUnit = (
  surah: Surah,
  ayat: SourceText[],
  others: SourceText[],
  lang: Language
) => {
  const ar = lang === "ar";
  const q = quranQuestions(ayat, others, lang, "quran");

  // Each ayah gets a "what comes next" question and one more, taking turns
  // between the other kinds so a lesson mixes skills. If a kind doesn't fit
  // an ayah (too long to order, no audio...), "complete the ayah" stands in.
  const turns = ar
    ? [q.complete, q.completeWord, q.listen, q.order]
    : [q.complete, q.order, q.trueFalse, q.complete];
  const forAyah = (i: number): ChallengeSpec[] =>
    [q.next(i), turns[i % turns.length](i) ?? q.complete(i)].filter(
      (c): c is ChallengeSpec => c !== null
    );

  const lessons: LessonSpec[] = [];
  for (let from = 0; from < ayat.length; from += AYAT_PER_LESSON) {
    const to = Math.min(from + AYAT_PER_LESSON, ayat.length);
    const range = `${num(lang, from + 1)}–${num(lang, to)}`;
    const challenges = Array.from({ length: to - from }, (_, k) =>
      forAyah(from + k)
    ).flat();
    const { hizbQuarter } = ayat[from];
    if (challenges.length > 0)
      lessons.push({
        title: ar ? `الآيات ${range}` : `Ayat ${range}`,
        // Grouped on the learn page by the hizb quarter the lesson starts in.
        section: hizbQuarter ? hizbSection(hizbQuarter, lang) : undefined,
        challenges,
      });
  }

  // The exam's own question makers: different wrong answers from lessons.
  const examQ = quranQuestions(ayat, others, lang, "quran-exam");
  const exam = quranExam(
    examQ,
    ayat.length,
    lang,
    `quran:${surah.number}:exam`
  );
  const count = num(lang, surah.ayahCount);

  return {
    title: ar
      ? surah.name
      : `${surah.englishName} (${surah.englishNameTranslation})`,
    description: ar
      ? `${count} آية · ${surah.revelationType === "Meccan" ? "مكية" : "مدنية"}`
      : `${count} ayat · ${surah.revelationType}`,
    lessons: exam ? [...lessons, exam] : lessons,
  };
};

export const buildFullQuran = (
  surahs: Surah[],
  ayat: SourceText[],
  lang: Language
): CourseSpec => {
  const ar = lang === "ar";

  return {
    slug: `quran-full-${lang}`,
    language: lang,
    track: "quran",
    title: ar ? "القرآن الكريم كاملًا" : "The Whole Quran (meaning)",
    imageSrc: "/courses/quran.svg",
    units: surahs.map((surah) => {
      // Wrong answers come from the surah itself first, then its neighbours.
      const neighbours = [surah.number - 1, surah.number + 1].flatMap((n) =>
        surahAyat(ayat, n)
      );
      return surahUnit(surah, surahAyat(ayat, surah.number), neighbours, lang);
    }),
  };
};
