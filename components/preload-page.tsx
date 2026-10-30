"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";

// Loads a page in the background, so opening it is instant: today's wird
// from the learn page, the next lesson from a finished one.
//
// A full prefetch: by default Next only prefetches a dynamic page up to its
// loading screen, not its data. The page stays ready for 5 minutes, or
// until a server action (an answer, a lost heart) changes what it shows.

const FULL = "full" as PrefetchKind;

export const PreloadPage = ({ href }: { href: string }) => {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(href, { kind: FULL });
  }, [href, router]);

  return null;
};
