import { type ChallengeSpec, type CourseSpec, type Language } from "./courses";
import { quranExam } from "./exams";
import { lessonInParts } from "./parts";
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
  // Per ayah, so each lesson can go a couple of ayat at a time (parts.ts).
  const each =
    (make: (i: number) => ChallengeSpec | null) =>
    (i: number): ChallengeSpec[] => {
      const c = make(i);
      return c ? [c] : [];
    };

  // One kind of question per lesson, so a child practises one skill at a time.
  const lessons: {
    title: string;
    challenges: (i: number) => ChallengeSpec[];
  }[] = [
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

  // Each kids lesson practises the whole surah, a couple of ayat at a time
  // (read them, then their questions), and ends by putting its ayat in
  // order.
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
      ...lessons.map(({ title, challenges }) => ({
        title,
        ...lessonInParts(
          ayat,
          undefined,
          challenges,
          putInOrder ? [putInOrder] : []
        ),
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
