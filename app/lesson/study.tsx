"use client";

import { useEffect, useMemo } from "react";

import { BookOpen, Play, Volume2 } from "lucide-react";

import { useLocale, useMessages } from "@/components/locale-provider";
import { type Step, useReadAloud } from "@/components/read-aloud";
import { Button } from "@/components/ui/button";
import { type sourceTexts } from "@/db/schema";
import { formatNumber } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SourceText = typeof sourceTexts.$inferSelect;

type StudyProps = {
  texts: SourceText[];
  onStart: () => void;
};

// "quran:2:255" -> "2:255", else null.
const ayahRef = (key: string) => /^quran:(\d+:\d+)$/.exec(key)?.[1] ?? null;

// What one text sounds like: an ayah is recited by a qari (never a
// synthetic voice); a dhikr plays its own recording; a hadith has none.
const stepFor = (text: SourceText): Step | null => {
  const ref = ayahRef(text.key);
  if (ref) return { kind: "recite", ref };
  if (text.audioSrc) return { kind: "audio", urls: [text.audioSrc] };
  return null;
};

// "Read first": the ayat (or hadith, adhkar) a lesson is about, shown before
// its questions, so learners answer from what they've just read and heard
// instead of guessing.
export const Study = ({ texts, onStart }: StudyProps) => {
  const t = useMessages();
  const locale = useLocale();
  const ar = locale === "ar";
  const { enabled, play, preload } = useReadAloud();

  const playAll = useMemo(
    () =>
      texts
        .map(stepFor)
        .filter((s): s is Step => s !== null)
        .flatMap((s, i) => (i ? [{ kind: "wait", ms: 400 } as Step, s] : [s])),
    [texts]
  );

  // Start downloading the recitations, so "Listen to all" starts quickly.
  useEffect(() => {
    preload(
      texts.map((t) => ayahRef(t.key)).filter((r): r is string => r !== null)
    );
  }, [preload, texts]);

  // With read-aloud on (kids by default), recite them all straight away.
  useEffect(() => {
    if (enabled && playAll.length) play(playAll);
  }, [enabled, play, playAll]);

  return (
    <div className="flex w-full flex-col gap-y-6 px-6 lg:w-[600px] lg:px-0">
      <div className="flex items-center justify-between gap-x-3">
        <h1 className="flex items-center gap-x-2 text-lg font-bold text-neutral-700 lg:text-3xl">
          <BookOpen className="h-7 w-7 shrink-0 text-green-500" />
          {t.study.title}
        </h1>
        {playAll.length > 0 && (
          <Button
            variant="secondaryOutline"
            onClick={() => play(playAll)}
            className="shrink-0"
          >
            <Play className="me-2 h-4 w-4" />
            {t.study.playAll}
          </Button>
        )}
      </div>
      <p className="text-neutral-500">{t.study.intro}</p>

      <ol className="flex flex-col gap-y-3">
        {texts.map((text) => {
          const ref = ayahRef(text.key);
          const number = ref ? Number(ref.split(":")[1]) : null;
          const step = stepFor(text);
          const body = ar ? text.arabic : (text.translation ?? text.arabic);
          return (
            <li
              key={text.key}
              className="flex items-start gap-x-3 rounded-xl border-2 p-4"
            >
              <p
                dir={ar ? "rtl" : "ltr"}
                className={cn(
                  "flex-1 text-neutral-700",
                  ar
                    ? ref
                      ? "font-quran text-2xl leading-[2.4]"
                      : "font-arabic text-lg leading-loose"
                    : "text-base leading-relaxed"
                )}
              >
                {!ar && number !== null && (
                  <span className="me-1 font-bold text-green-600">
                    ({number})
                  </span>
                )}
                {body}
                {ar && number !== null && (
                  <span className="ms-1 text-green-600">
                    ﴿{formatNumber(locale, number)}﴾
                  </span>
                )}
                {/* Hadith and adhkar: everything their questions ask about,
                    i.e. the number, who recorded it, how many times it is said. */}
                {!ref && (
                  <span className="mt-2 block text-sm text-neutral-500">
                    {[
                      ar ? (text.citationAr ?? text.citation) : text.citation,
                      text.kind === "hadith" &&
                        ((ar ? text.hadithRefAr : text.hadithRef) ??
                          t.source.referencePending),
                      text.kind === "dhikr" &&
                        text.repeat &&
                        t.study.repeat(
                          text.repeat,
                          formatNumber(locale, text.repeat)
                        ),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </p>
              {step && (
                <button
                  type="button"
                  onClick={() => play([step])}
                  aria-label={t.lesson.play}
                  className="shrink-0 rounded-xl border-2 border-b-4 p-2 text-sky-500 hover:bg-black/5 active:border-b-2"
                >
                  <Volume2 className="h-5 w-5" />
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <Button size="lg" variant="secondary" onClick={onStart} className="mb-8">
        {t.study.start}
      </Button>
    </div>
  );
};
