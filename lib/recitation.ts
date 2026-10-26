// Real Quran recitation, built from references at runtime so the reciter can
// follow the mode (kids or full) without re-importing lessons.
//
// Adab: Quran text is only ever heard as recitation by a qari. It is never
// passed to a synthetic voice (see components/read-aloud).
//
// References: an ayah is "surah:ayah" (e.g. "1:2"), a word of an ayah is
// "surah:ayah:word" (1-based word position, as Quran.com counts words).

import { type Mode } from "@/lib/mode";

// Where each reciter is served, fastest and most reliable first. Hosts
// sometimes hang without answering (everyayah.com often, the QuranicAudio
// mirror now and then), so each source gets a few seconds before the next is
// tried (components/read-aloud). Quran.com's own CDN only has Alafasy.
// EveryAyah recitations are free to use with attribution.
const QURAN_COM = "https://verses.quran.com";
const QURANIC_AUDIO = "https://mirrors.quranicaudio.com/everyayah";
const EVERYAYAH = "https://www.everyayah.com/data";

/** Hosts the app connects to early, so the first ayah plays sooner. */
export const AUDIO_ORIGINS = [
  QURAN_COM,
  "https://mirrors.quranicaudio.com",
  "https://audio.qurancdn.com",
];

const pad = (n: number) => String(n).padStart(3, "0");

const parse = (ref: string) => ref.split(":").map(Number);

const alafasy = (file: string) => [
  `${QURAN_COM}/Alafasy/mp3/${file}`,
  `${QURANIC_AUDIO}/Alafasy_128kbps/${file}`,
  `${EVERYAYAH}/Alafasy_128kbps/${file}`,
];

/** Recitation of a whole ayah, e.g. "1:2": its sources, best first. */
export const ayahAudio = (ref: string, mode: Mode) => {
  const [surah, ayah] = parse(ref);
  const file = `${pad(surah)}${pad(ayah)}.mp3`;
  if (mode === "full") return alafasy(file);
  // Kids: al-Husary's teaching recitation (slow and clear, for learning by
  // heart). If both of its hosts fail, Alafasy: a qari is better than silence.
  return [
    `${QURANIC_AUDIO}/Husary_Muallim_128kbps/${file}`,
    `${EVERYAYAH}/Husary_Muallim_128kbps/${file}`,
    alafasy(file)[0],
  ];
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
