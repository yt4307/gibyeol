import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chainId } from "@/infrastructure/blockchain/config";
import { useAppStore } from "@/stores/use-app-store";
import { useWalletSession } from "./use-wallet-session";

const address = "0x1111111111111111111111111111111111111111" as const;

function cacheWalletSession() {
  window.localStorage.setItem("gibyeol:wallet-session", JSON.stringify({
    state: { walletSession: { address, authenticated: true } },
    version: 1,
  }));
}

describe("useWalletSession", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete (window as typeof window & { ethereum?: unknown }).ethereum;
    useAppStore.setState({ walletSession: null, authenticationStatus: "restoring" });
  });

  it("restores the persisted wallet after the server validates its cookie", async () => {
    cacheWalletSession();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ walletAddress: address }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWalletSession());

    expect(result.current.restoring).toBe(true);
    await waitFor(() => expect(result.current.authenticated).toBe(true));
    expect(result.current.session?.address).toBe(address);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/auth/session"), {
      credentials: "include",
    });
  });

  it("clears a persisted wallet when the server session has expired", async () => {
    cacheWalletSession();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const { result } = renderHook(() => useWalletSession());

    await waitFor(() => expect(result.current.restoring).toBe(false));
    expect(result.current.authenticated).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it("shows the anonymous state without a server request when no session is cached", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWalletSession());

    await waitFor(() => expect(result.current.restoring).toBe(false));
    expect(result.current.session).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("discards a restored session when the injected wallet account has changed", async () => {
    cacheWalletSession();
    (window as typeof window & { ethereum?: { request: ReturnType<typeof vi.fn> } }).ethereum = {
      request: vi.fn().mockResolvedValue(["0x2222222222222222222222222222222222222222"]),
    };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ walletAddress: address }) })
      .mockResolvedValueOnce({ ok: true }));

    const { result } = renderHook(() => useWalletSession());

    await waitFor(() => expect(result.current.restoring).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.authenticated).toBe(false);
  });

  it("does not persist the authentication token in browser storage", async () => {
    await act(async () => {
      useAppStore.setState({
        walletSession: { address, authenticated: true },
        authenticationStatus: "authenticated",
      });
    });

    const persisted = window.localStorage.getItem("gibyeol:wallet-session") ?? "";
    expect(persisted).toContain(address);
    expect(persisted).not.toContain("token");
  });

  it("shows the wallet request stage and JSON-RPC details", async () => {
    const providerError = { code: -32603, message: "Internal JSON-RPC error." };
    (window as typeof window & { ethereum?: { request: ReturnType<typeof vi.fn> } }).ethereum = {
      request: vi.fn()
        .mockResolvedValueOnce([address])
        .mockResolvedValueOnce(`0x${chainId.toString(16)}`)
        .mockRejectedValueOnce(providerError),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Sign in to Gibyeol" }),
    }));

    const { result } = renderHook(() => useWalletSession());
    await waitFor(() => expect(result.current.restoring).toBe(false));

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.connect();
      } catch (cause) {
        thrown = cause;
      }
    });
    expect(thrown).toBeInstanceOf(Error);
    expect(result.current.error).toBe("지갑 서명 단계 실패: Internal JSON-RPC error. (코드: -32603)");
  });

  it("shows backend error details from signature verification", async () => {
    (window as typeof window & { ethereum?: { request: ReturnType<typeof vi.fn> } }).ethereum = {
      request: vi.fn()
        .mockResolvedValueOnce([address])
        .mockResolvedValueOnce(`0x${chainId.toString(16)}`)
        .mockResolvedValueOnce("0xsignature"),
    };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Sign in to Gibyeol" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { code: "SIWE_INVALID", message: "Signature is invalid." } }),
      }));

    const { result } = renderHook(() => useWalletSession());
    await waitFor(() => expect(result.current.restoring).toBe(false));

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.connect();
      } catch (cause) {
        thrown = cause;
      }
    });
    expect(thrown).toBeInstanceOf(Error);
    expect(result.current.error).toBe(
      "서명 검증 단계 실패: Signature is invalid. · 코드: SIWE_INVALID · HTTP 401",
    );
  });
});
