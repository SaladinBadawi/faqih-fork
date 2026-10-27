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

export type Step = (
  | { kind: "speak"; text: string }
  | { kind: "recite"; ref: string }
  | { kind: "audio"; urls: string[]; rate?: number }
  | { kind: "wait"; ms: number }
) & {
  /** Called as the step starts, e.g. to highlight the ayah being recited. */
  onStart?: () => void;
};

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
// A source that hasn't started playing by then is skipped for the next one:
// a stalled request otherwise waits silently forever.
const LOAD_TIMEOUT_MS = 8000;

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
  // Bumped for every source tried, so a stale timer never stops a newer one.
  const attempt = useRef(0);

  const stop = useCallback(() => {
    run.current += 1;
    audio.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
  }, []);

  // Plays one source to the end. "failed": it errored or never started.
  const playSource = useCallback(
    (url: string, rate: number) =>
      new Promise<"ended" | "failed" | "blocked">((resolve) => {
        audio.current ??= new Audio();
        const el = audio.current;
        const id = ++attempt.current;
        const finish = (result: "ended" | "failed" | "blocked") => {
          clearTimeout(timer);
          if (attempt.current === id) {
            el.onplaying = el.onended = el.onerror = null;
            if (result === "failed") el.pause();
          }
          resolve(result);
        };
        const timer = setTimeout(() => finish("failed"), LOAD_TIMEOUT_MS);
        el.onplaying = () => clearTimeout(timer);
        el.onended = () => finish("ended");
        el.onerror = () => finish("failed");
        el.src = url;
        el.defaultPlaybackRate = rate;
        el.playbackRate = rate;
        el.play().catch((error: unknown) =>
          // Autoplay blocked before the first tap: don't try other sources.
          finish(
            error instanceof DOMException && error.name === "NotAllowedError"
              ? "blocked"
              : "failed"
          )
        );
      }),
    []
  );

  // Tries each source in turn (best first) until one plays.
  const playUrls = useCallback(
    async (urls: string[], rate: number, isCurrent: () => boolean) => {
      for (const url of urls) {
        if (!isCurrent()) return;
        if ((await playSource(url, rate)) !== "failed") return;
      }
    },
    [playSource]
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
          const isCurrent = () => run.current === id;
          step.onStart?.();
          if (step.kind === "speak") await speak(step.text);
          else if (step.kind === "recite")
            await playUrls(recitationAudio(step.ref, mode), 1, isCurrent);
          else if (step.kind === "audio")
            await playUrls(step.urls, step.rate ?? 1, isCurrent);
          else await new Promise((r) => setTimeout(r, step.ms));
        }
      })();
    },
    [mode, playUrls, speak, stop]
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
