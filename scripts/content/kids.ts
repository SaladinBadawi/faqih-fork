import { type CourseSpec, type Language, type LessonSpec } from "./courses";
import { quranExam } from "./exams";
import { quranQuestions } from "./quran-questions";
import { type SourceText, type Surah, surahAyat } from "./sources";

// The kids track: Al-Fatiha and the short surahs at the end of Juz Amma,
// in the order children usually memorise them (An-Nas first).
export const KIDS_SURAHS = [
  1, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105,
];

const KIDS_MIN_AGE = 5;
const KIDS_MAX_AGE = 10;

const surahUnit = (
  surah: Surah,
  ayat: SourceText[],
  others: SourceText[],
  lang: Language
) => {
  const ar = lang === "ar";
  const q = quranQuestions(ayat, others, lang, "kids");
  const each = <T>(make: (i: number) => T | null) =>
    ayat.map((_, i) => make(i)).filter((c): c is T => c !== null);

  // One kind of question per lesson, so a child practises one skill at a time.
  const lessons: LessonSpec[] = [
    {
      title: ar ? "ما الآية التالية؟" : "What comes next?",
      challenges: each(q.next),
    },
    {
      title: ar ? "أكمل الآية" : "Complete the ayah",
      challenges: each(q.complete),
    },
    {
      title: ar ? "استمع واختر" : "Listen and choose",
      challenges: each(q.listen),
    },
    {
      title: ar ? "الكلمة الناقصة" : "The missing word",
      challenges: each(q.completeWord),
    },
    {
      title: ar ? "رتّب الكلمات" : "Word order",
      challenges: each(q.order),
    },
    {
      title: ar ? "صح أم خطأ" : "True or false",
      challenges: each(q.trueFalse),
    },
  ];

  // Each kids lesson practises the whole surah: read it all first, and end
  // by putting its ayat in order.
  const study = ayat.map((a) => a.key);
  const putInOrder = q.orderAyat(0, ayat.length);

  // The exam's own question makers: different wrong answers from lessons.
  const exam = quranExam(
    quranQuestions(ayat, others, lang, "kids-exam"),
    ayat.length,
    lang,
    `kids:${surah.number}:exam`,
    true
  );

  return {
    title: ar
      ? surah.name
      : `${surah.englishName} (${surah.englishNameTranslation})`,
    description: ar
      ? `نحفظ ${surah.name} آيةً آية`
      : `Learn ${surah.englishName} ayah by ayah`,
    // A lesson with no challenges could never be completed.
    lessons: [
      ...lessons.map((lesson) => ({
        ...lesson,
        study,
        challenges: putInOrder
          ? [...lesson.challenges, putInOrder]
          : lesson.challenges,
      })),
      ...(exam ? [exam] : []),
    ].filter((l) => l.challenges.length > 0),
  };
};

export const buildKidsShortSurahs = (
  surahs: Surah[],
  ayat: SourceText[],
  lang: Language
): CourseSpec => {
  const ar = lang === "ar";
  const kidsAyat = ayat.filter((a) => KIDS_SURAHS.includes(a.surah!));

  return {
    slug: `kids-short-surahs-${lang}`,
    language: lang,
    track: "kids",
    minAge: KIDS_MIN_AGE,
    maxAge: KIDS_MAX_AGE,
    title: ar ? "للأطفال: قصار السور" : "Kids: Short Surahs",
    imageSrc: "/mascot.svg",
    units: KIDS_SURAHS.map((number) => {
      const surah = surahs.find((s) => s.number === number);
      if (!surah) throw new Error(`Missing surah ${number}`);
      return surahUnit(
        surah,
        surahAyat(ayat, number),
        kidsAyat.filter((a) => a.surah !== number),
        lang
      );
    }),
  };
};
