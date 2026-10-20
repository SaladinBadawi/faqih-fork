"use client";

import { useEffect, useRef } from "react";

import { Snail, Volume2 } from "lucide-react";

import { useMessages } from "@/components/locale-provider";

const SLOW_RATE = 0.75;

// Plays the ayah's recitation, at normal speed or slowly, for LISTEN.
export const AudioPlayer = ({ src }: { src: string }) => {
  const t = useMessages();
  const audio = useRef<HTMLAudioElement>(null);

  const play = (rate: number) => {
    const el = audio.current;
    if (!el) return;
    el.currentTime = 0;
    el.playbackRate = rate;
    // The browser may block autoplay before the first tap; the buttons work.
    el.play().catch(() => undefined);
  };

  // Play once when a new ayah is shown.
  useEffect(() => {
    audio.current?.play().catch(() => undefined);
  }, [src]);

  return (
    <div className="mb-6 flex items-center justify-center gap-x-4">
      <audio ref={audio} src={src} preload="auto" />
      <button
        type="button"
        onClick={() => play(1)}
        aria-label={t.lesson.play}
        className="flex h-20 w-20 items-center justify-center rounded-2xl border-b-4 border-sky-600 bg-sky-500 text-white hover:bg-sky-500/90 active:border-b-0"
      >
        <Volume2 className="h-10 w-10" />
      </button>
      <button
        type="button"
        onClick={() => play(SLOW_RATE)}
        aria-label={t.lesson.playSlow}
        className="flex h-14 w-14 items-center justify-center rounded-2xl border-b-4 border-sky-600 bg-sky-500 text-white hover:bg-sky-500/90 active:border-b-0"
      >
        <Snail className="h-7 w-7" />
      </button>
    </div>
  );
};
