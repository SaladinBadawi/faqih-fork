"use client";

import { createContext, useContext, type PropsWithChildren } from "react";

import { DEFAULT_MODE, type Mode } from "@/lib/mode";

const ModeContext = createContext<Mode>(DEFAULT_MODE);

export const ModeProvider = ({
  mode,
  children,
}: PropsWithChildren<{ mode: Mode }>) => (
  <ModeContext.Provider value={mode}>{children}</ModeContext.Provider>
);

export const useMode = () => useContext(ModeContext);
export const useIsKids = () => useMode() === "kids";
