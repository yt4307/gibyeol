import { create } from "zustand";

export type WalletSession = {
  address: `0x${string}`;
  authenticated: boolean;
};

type AppState = {
  activeDraftId: string | null;
  walletSession: WalletSession | null;
  setActiveDraftId: (draftId: string | null) => void;
  setWalletSession: (session: WalletSession | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  activeDraftId: null,
  walletSession: null,
  setActiveDraftId: (activeDraftId) => set({ activeDraftId }),
  setWalletSession: (walletSession) => set({ walletSession }),
}));
