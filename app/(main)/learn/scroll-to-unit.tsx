"use client";

import { useEffect } from "react";

// Scrolls the learn page to a unit (by its order) when it opens, so after a
// lesson the learner is back at the surah they were in.
export const ScrollToUnit = ({ order }: { order: number | null }) => {
  useEffect(() => {
    // Not when following a link to a spot on the page, or from the daily
    // reminder (which should land on today's wird card at the top).
    if (
      !order ||
      order === 1 ||
      window.location.hash ||
      new URLSearchParams(window.location.search).has("wird")
    )
      return;
    document
      .getElementById(`unit-${order}`)
      ?.scrollIntoView({ block: "start" });
  }, [order]);

  return null;
};
