"use client";

import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { useLocale } from "@/components/locale-provider";
import { useMode } from "@/components/mode-provider";
import { type Locale } from "@/lib/i18n";
import { recitationAudio } from "@/lib/recitation";

// One sound at a time for the whole lesson: starting something new stops
// whatever was playing, so prompts, recitations and taps never overlap.
//
// Adab: Quran text never goes to `speak`. Ayat and their words are only
// played as recitation (`recite`, lib/recitation). `speak` is for the app's
// own words: instructions, "أحسنت!", and non-Arabic text like English
// meanings.

export type Step =
  | { kind: "speak"; text: string }
  | { kind: "recite"; ref: string }
  | { kind: "audio"; url: string; rate?: number }
  | { kind: "wait"; ms: number };

type ReadAloud = {
  /** Read-aloud is on (Settings; on by default in kids mode). */
  enabled: boolean;
  /** Play steps in order, stopping anything already playing. */
  play: (steps: Step[]) => void;
  stop: () => void;
};

const ReadAloudContext = createContext<ReadAloud>({
  enabled: false,
  play: () => undefined,
  stop: () => undefined,
});

const SPEECH_LANG: Record<Locale, string> = { ar: "ar", en: "en" };
const VOICES_TIMEOUT_MS = 1000;

// A voice for the language, or null. Without a matching voice the browser
// would read Arabic with an English voice, so then we say nothing.
const findVoice = async (lang: string) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return null;
  const pick = () =>
    window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
  if (window.speechSynthesis.getVoices().length > 0) return pick();
  // Voices load asynchronously on some browsers.
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    window.speechSynthesis.addEventListener("voiceschanged", done, {
      once: true,
    });
    setTimeout(done, VOICES_TIMEOUT_MS);
  });
  return pick();
};

export const ReadAloudProvider = ({
  enabled,
  children,
}: PropsWithChildren<{ enabled: boolean }>) => {
  const locale = useLocale();
  const mode = useMode();
  const audio = useRef<HTMLAudioElement | null>(null);
  // Bumped on every play/stop, so an older sequence stops at its next step.
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current += 1;
    audio.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
  }, []);

  const playUrl = useCallback(
    (url: string, rate = 1) =>
      new Promise<void>((resolve) => {
        audio.current ??= new Audio();
        const el = audio.current;
        el.onended = () => resolve();
        el.onerror = () => resolve();
        el.src = url;
        el.playbackRate = rate;
        // Autoplay can be blocked before the first tap: just move on.
        el.play().catch(() => resolve());
      }),
    []
  );

  const speak = useCallback(
    async (text: string) => {
      const voice = await findVoice(SPEECH_LANG[locale]);
      if (!voice) return;
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = mode === "kids" ? 0.9 : 1;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
    },
    [locale, mode]
  );

  const play = useCallback(
    (steps: Step[]) => {
      stop();
      const id = run.current;
      void (async () => {
        for (const step of steps) {
          if (run.current !== id) return;
          if (step.kind === "speak") await speak(step.text);
          else if (step.kind === "recite")
            await playUrl(recitationAudio(step.ref, mode));
          else if (step.kind === "audio") await playUrl(step.url, step.rate);
          else await new Promise((r) => setTimeout(r, step.ms));
        }
      })();
    },
    [mode, playUrl, speak, stop]
  );

  // Leaving the lesson stops the sound.
  useEffect(() => stop, [stop]);

  const value = useMemo(() => ({ enabled, play, stop }), [enabled, play, stop]);

  return (
    <ReadAloudContext.Provider value={value}>
      {children}
    </ReadAloudContext.Provider>
  );
};

export const useReadAloud = () => useContext(ReadAloudContext);

/** Whether the app may read this text with a synthetic voice. */
export const isSpeakable = (text: string) =>
  // Arabic in lessons is Quran, hadith or dhikr: never synthesised. Digits
  // and the app's own short words (صح / خطأ) are the exception.
  !/[\u0600-\u06FF]/.test(text) ||
  /^[\s\d\u0660-\u0669]+$/.test(text) ||
  text === "صح" ||
  text === "خطأ";
