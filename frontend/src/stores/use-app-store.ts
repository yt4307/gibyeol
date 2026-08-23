import { create } from "zustand";

type AppState = {
  activeDraftId: string | null;
  setActiveDraftId: (draftId: string | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  activeDraftId: null,
  setActiveDraftId: (activeDraftId) => set({ activeDraftId }),
}));
