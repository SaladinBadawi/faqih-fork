"use client";

import { useEffect } from "react";

// Scrolls the learn page to a unit (by its order) when it opens, so after a
// lesson the learner is back at the surah they were in.
export const ScrollToUnit = ({ order }: { order: number | null }) => {
  useEffect(() => {
    if (!order || order === 1 || window.location.hash) return;
    document
      .getElementById(`unit-${order}`)
      ?.scrollIntoView({ block: "start" });
  }, [order]);

  return null;
};
