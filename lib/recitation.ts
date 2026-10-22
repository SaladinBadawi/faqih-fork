// Real Quran recitation, built from references at runtime so the reciter can
// follow the mode (kids or full) without re-importing lessons.
//
// Adab: Quran text is only ever heard as recitation by a qari. It is never
// passed to a synthetic voice (see components/read-aloud).
//
// References: an ayah is "surah:ayah" (e.g. "1:2"), a word of an ayah is
// "surah:ayah:word" (1-based word position, as Quran.com counts words).

import { type Mode } from "@/lib/mode";

// EveryAyah recitations (https://everyayah.com, free to use with
// attribution). Served first from the QuranicAudio mirror, a CDN that carries
// the same files: everyayah.com itself sometimes stalls without answering.
const AYAH_HOSTS = [
  "https://mirrors.quranicaudio.com/everyayah",
  "https://www.everyayah.com/data",
];

const RECITERS: Record<Mode, string> = {
  // Al-Husary's teaching recitation: slow and clear, for learning by heart.
  kids: "Husary_Muallim_128kbps",
  full: "Alafasy_128kbps",
};

const pad = (n: number) => String(n).padStart(3, "0");

const parse = (ref: string) => ref.split(":").map(Number);

/** Recitation of a whole ayah, e.g. "1:2": one URL per host, best first. */
export const ayahAudio = (ref: string, mode: Mode) => {
  const [surah, ayah] = parse(ref);
  return AYAH_HOSTS.map(
    (host) => `${host}/${RECITERS[mode]}/${pad(surah)}${pad(ayah)}.mp3`
  );
};

/** Recitation of one word (Quran.com word-by-word audio), e.g. "1:2:3". */
export const wordAudio = (ref: string) => {
  const [surah, ayah, word] = parse(ref);
  return [
    `https://audio.qurancdn.com/wbw/${pad(surah)}_${pad(ayah)}_${pad(word)}.mp3`,
  ];
};

/** Audio sources for an ayah ("s:a") or a word ("s:a:w"), best first. */
export const recitationAudio = (ref: string, mode: Mode) =>
  parse(ref).length === 3 ? wordAudio(ref) : ayahAudio(ref, mode);
