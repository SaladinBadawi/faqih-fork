import { BookOpen, HandHeart, Landmark, Scale, ScrollText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getAvailableTracks } from "@/db/queries";
import { getMessages } from "@/lib/locale";

// Same order as messages.app.tracks: Quran, Hadith, Sirah, Adhkar, Fiqh.
const TRACKS = [
  { track: "quran", icon: BookOpen },
  { track: "hadith", icon: ScrollText },
  { track: "sirah", icon: Landmark },
  { track: "adhkar", icon: HandHeart },
  { track: "fiqh", icon: Scale },
] as const;

// A track with courses links to them; one without says "soon" and is not a
// button, so nothing on the page looks clickable without doing anything.
export const Footer = async () => {
  const [t, available] = await Promise.all([
    getMessages(),
    getAvailableTracks().catch(() => new Set<string | null>()),
  ]);

  return (
    <div className="hidden h-20 w-full border-t-2 border-slate-200 p-2 lg:block">
      <div className="mx-auto flex h-full max-w-screen-lg items-center justify-evenly">
        {TRACKS.map(({ track, icon: Icon }, i) => {
          const label = t.app.tracks[i];
          return available.has(track) ? (
            <Button
              key={track}
              size="lg"
              variant="ghost"
              className="w-full"
              asChild
            >
              <Link href={`/courses?track=${track}`}>
                <Icon className="me-4 h-7 w-7 text-green-600" />
                {label}
              </Link>
            </Button>
          ) : (
            <div
              key={track}
              className="flex w-full items-center justify-center gap-x-2 text-sm font-bold text-neutral-400"
            >
              <Icon className="me-2 h-7 w-7" />
              {label}
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
                {t.app.soon}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
