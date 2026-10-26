import { create } from "zustand";

type HeartsModalState = {
  isOpen: boolean;
  /** The lesson to return to after the hearts review. */
  lessonId?: number;
  open: (lessonId?: number) => void;
  close: () => void;
};

export const useHeartsModal = create<HeartsModalState>((set) => ({
  isOpen: false,
  open: (lessonId) => set({ isOpen: true, lessonId }),
  close: () => set({ isOpen: false }),
}));
