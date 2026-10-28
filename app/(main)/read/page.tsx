import { getSurahs } from "@/db/queries";
import { JUZ_COUNT, juzBounds } from "@/lib/juz";
import { getLastRead } from "@/lib/preferences";

import { ReadIndex } from "./read-index";

// Read mode: pick a surah or a juz' to read and listen to, like a mushaf.
const ReadPage = async () => {
  const [surahs, lastRead] = await Promise.all([getSurahs(), getLastRead()]);
  const surahName = new Map(surahs.map((s) => [s.number, s]));

  return (
    <ReadIndex
      lastRead={lastRead}
      surahs={surahs.map((s) => ({
        number: s.number,
        name: s.name,
        englishName: s.englishName,
        englishNameTranslation: s.englishNameTranslation,
        ayahCount: s.ayahCount,
      }))}
      ajza={Array.from({ length: JUZ_COUNT }, (_, i) => {
        const { start } = juzBounds(i + 1);
        const surah = surahName.get(start.surah);
        return {
          number: i + 1,
          surah: surah
            ? { name: surah.name, englishName: surah.englishName }
            : null,
          ayah: start.ayah,
        };
      })}
    />
  );
};

export default ReadPage;
