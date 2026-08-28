import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type WalletSession = {
  address: `0x${string}`;
  authenticated: boolean;
};

export type AuthenticationStatus = "restoring" | "authenticated" | "anonymous";

type AppState = {
  walletSession: WalletSession | null;
  authenticationStatus: AuthenticationStatus;
  setWalletSession: (session: WalletSession | null) => void;
  setAuthenticationStatus: (status: AuthenticationStatus) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      walletSession: null,
      authenticationStatus: "restoring",
      setWalletSession: (walletSession) => set({ walletSession }),
      setAuthenticationStatus: (authenticationStatus) => set({ authenticationStatus }),
    }),
    {
      name: "gibyeol:wallet-session",
      version: 1,
      storage: createJSONStorage(() => window.localStorage),
      partialize: ({ walletSession }) => ({ walletSession }),
      skipHydration: true,
    },
  ),
);
