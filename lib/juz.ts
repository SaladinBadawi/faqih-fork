// The 30 ajza' of the Quran, by the ayah each one starts at (Madani mushaf,
// as alquran.cloud numbers them). Used to split the Quran into parts on the
// learn page and in read mode.

export const JUZ_COUNT = 30;

type AyahRef = { surah: number; ayah: number };

const JUZ_STARTS: [surah: number, ayah: number][] = [
  [1, 1],
  [2, 142],
  [2, 253],
  [3, 93],
  [4, 24],
  [4, 148],
  [5, 82],
  [6, 111],
  [7, 88],
  [8, 41],
  [9, 93],
  [11, 6],
  [12, 53],
  [15, 1],
  [17, 1],
  [18, 75],
  [21, 1],
  [23, 1],
  [25, 21],
  [27, 56],
  [29, 46],
  [33, 31],
  [36, 28],
  [39, 32],
  [41, 47],
  [46, 1],
  [51, 31],
  [58, 1],
  [67, 1],
  [78, 1],
];

const before = (a: AyahRef, [surah, ayah]: [number, number]) =>
  a.surah < surah || (a.surah === surah && a.ayah < ayah);

export const isJuz = (value: number) =>
  Number.isInteger(value) && value >= 1 && value <= JUZ_COUNT;

/** The juz' (1-30) an ayah is in. */
export const juzOf = (ref: AyahRef) => {
  const next = JUZ_STARTS.findIndex((start) => before(ref, start));
  return next === -1 ? JUZ_COUNT : next;
};

/** Where a juz' starts, and where the next one starts (null after juz' 30). */
export const juzBounds = (juz: number) => {
  const [surah, ayah] = JUZ_STARTS[juz - 1];
  const next = JUZ_STARTS[juz];
  return {
    start: { surah, ayah },
    end: next ? { surah: next[0], ayah: next[1] } : null,
  };
};

/** "quran:2:255" -> { surah: 2, ayah: 255 }, else null. */
export const parseAyahKey = (key: string): AyahRef | null => {
  const match = /^quran:(\d+):(\d+)$/.exec(key);
  return match ? { surah: Number(match[1]), ayah: Number(match[2]) } : null;
};

/** The juz' of the first ayah a lesson reads ("read first"), if any. */
export const lessonJuz = (study: string[] | null) => {
  const ref = study?.map(parseAyahKey).find((r) => r !== null);
  return ref ? juzOf(ref) : null;
};

const MIN_AJZA_TO_SPLIT = 3;

type JuzUnit = { cleared: boolean; lessons: { study: string[] | null }[] };

/**
 * The learn page one juz' at a time. Each unit (surah) gets the ajza' its
 * lessons are in; a long surah shows in each of its ajza' with only the
 * lessons in that juz'. Its exam, with nothing to read, goes with its last
 * juz'. Returns null for a course in only a few ajza' or none (kids: al-Fatiha
 * and juz' 'Amma; hadith), which stays one page.
 */
export const splitByJuz = <U extends JuzUnit>(units: U[]) => {
  const withJuz = units.map((unit) => {
    const lessons = (unit.lessons as U["lessons"]).map((lesson) => ({
      lesson,
      juz: lessonJuz(lesson.study),
    }));
    const ajza = [
      ...new Set(lessons.flatMap((l) => (l.juz === null ? [] : [l.juz]))),
    ].sort((a, b) => a - b);
    return { unit, lessons, ajza };
  });

  const all = [...new Set(withJuz.flatMap((u) => u.ajza))].sort(
    (a, b) => a - b
  );
  if (all.length < MIN_AJZA_TO_SPLIT) return null;

  return {
    ajza: all.map((juz) => ({
      juz,
      // Every surah in it is cleared (a long one counts once it's cleared).
      cleared: withJuz
        .filter((u) => u.ajza.includes(juz))
        .every((u) => u.unit.cleared),
    })),
    /** A unit's first juz', to jump to it from search. */
    firstJuz: (unit: U) =>
      withJuz.find((u) => u.unit === unit)?.ajza[0] ?? null,
    /** The units in a juz', each with only its lessons in that juz'. */
    unitsIn: (juz: number) =>
      withJuz
        .filter((u) => u.ajza.includes(juz))
        .map(({ unit, lessons, ajza }) => ({
          ...unit,
          /** All its lessons, wherever they are (for "Continue"). */
          allLessons: unit.lessons as U["lessons"],
          lessons: lessons
            .filter((l) =>
              l.juz === null ? juz === ajza[ajza.length - 1] : l.juz === juz
            )
            .map((l) => l.lesson),
        })),
  };
};
