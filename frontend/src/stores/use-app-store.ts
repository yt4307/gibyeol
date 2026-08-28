import { create } from "zustand";

export type WalletSession = {
  address: `0x${string}`;
  authenticated: boolean;
};

type AppState = {
  walletSession: WalletSession | null;
  setWalletSession: (session: WalletSession | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  walletSession: null,
  setWalletSession: (walletSession) => set({ walletSession }),
}));
