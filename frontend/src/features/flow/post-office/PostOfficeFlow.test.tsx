import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/stores/use-app-store";

const address = "0x1111111111111111111111111111111111111111" as const;

const mocks = vi.hoisted(() => ({
  registerMailbox: vi.fn(),
  deactivateMailbox: vi.fn(),
  requestCode: vi.fn(),
  verifyCode: vi.fn(),
  useMailboxOnboarding: vi.fn(),
  useEmailRegistration: vi.fn(),
}));

vi.mock("@features/hooks/mailbox/use-mailbox-onboarding", () => ({
  useMailboxOnboarding: mocks.useMailboxOnboarding,
}));

vi.mock("@features/hooks/mailbox/use-email-registration", () => ({
  useEmailRegistration: mocks.useEmailRegistration,
}));

vi.mock("@features/flow/send/SendFlow", () => ({
  SendFlow: ({ address: sender }: { address?: `0x${string}` }) => (
    <div data-testid="send-flow">send:{sender}</div>
  ),
}));

vi.mock("@features/flow/inbox/InboxFlow", () => ({
  InboxFlow: ({ address: recipient }: { address: `0x${string}` }) => (
    <div data-testid="inbox-flow">inbox:{recipient}</div>
  ),
}));

import { PostOfficeFlow } from "./PostOfficeFlow";

function setMailboxState(keyId: number | null, active = Boolean(keyId)) {
  mocks.useMailboxOnboarding.mockReturnValue({
    keyId,
    active,
    busy: false,
    error: null,
    register: mocks.registerMailbox,
    deactivate: mocks.deactivateMailbox,
  });
}

function setEmailState(verified: boolean, codeSent = false) {
  mocks.useEmailRegistration.mockReturnValue({
    verified,
    codeSent,
    busy: false,
    error: null,
    requestCode: mocks.requestCode,
    verifyCode: mocks.verifyCode,
  });
}

describe("PostOfficeFlow integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    useAppStore.setState({ walletSession: null, authenticationStatus: "anonymous" });
    setMailboxState(null);
    setEmailState(false);
  });

  afterEach(() => cleanup());

  it("starts with wallet authentication and hides later onboarding steps", () => {
    render(<PostOfficeFlow />);

    expect(screen.getByRole("button", { name: "지갑 연결" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "기별 이용 준비 단계" }).textContent).toContain("0 / 3");
    expect(screen.getByText("모바일에서는 설치된 지갑 앱을 선택해 연결할 수 있어요.")).toBeTruthy();
    expect(screen.queryByText("패스키 메일박스")).toBeNull();
    expect(screen.queryByText("도착 안내 이메일")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "우체국 메뉴" })).toBeNull();
    expect(mocks.useMailboxOnboarding).toHaveBeenCalledWith(undefined);
    expect(mocks.useEmailRegistration).toHaveBeenCalledWith(undefined);
  });

  it("registers a mailbox before exposing email verification", () => {
    useAppStore.setState({ walletSession: { address, authenticated: true }, authenticationStatus: "authenticated" });
    render(<PostOfficeFlow />);

    fireEvent.click(screen.getByRole("button", { name: "메일박스 만들기" }));

    expect(mocks.registerMailbox).toHaveBeenCalledOnce();
    expect(screen.getByText("편지를 보내고 받으려면 먼저 메일박스를 만들어 주세요.")).toBeTruthy();
    expect(screen.queryByText("도착 안내 이메일")).toBeNull();
    expect(mocks.useMailboxOnboarding).toHaveBeenCalledWith(address);
  });

  it("connects the email form callbacks while keeping letter flows gated", () => {
    useAppStore.setState({ walletSession: { address, authenticated: true }, authenticationStatus: "authenticated" });
    setMailboxState(2);
    render(<PostOfficeFlow />);

    fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
      target: { value: "letter@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "인증번호 받기" }));

    expect(mocks.requestCode).toHaveBeenCalledWith("letter@example.com");
    expect(screen.getByText("이메일 인증을 마치면 편지를 보내고 받을 수 있어요.")).toBeTruthy();
    expect(screen.queryByTestId("send-flow")).toBeNull();
    expect(screen.queryByTestId("inbox-flow")).toBeNull();
  });

  it("deactivates a mailbox and offers reactivation with a new key", async () => {
    useAppStore.setState({ walletSession: { address, authenticated: true }, authenticationStatus: "authenticated" });
    setMailboxState(2, true);
    const first = render(<PostOfficeFlow />);

    fireEvent.click(screen.getByRole("button", { name: "메일박스 비활성화" }));
    const dialog = screen.getByRole("alertdialog");
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    fireEvent.click(screen.getByRole("button", { name: "비활성화" }));
    expect(mocks.deactivateMailbox).toHaveBeenCalledOnce();

    first.unmount();
    setMailboxState(2, false);
    render(<PostOfficeFlow />);

    expect(screen.getByText("메일박스 비활성화됨")).toBeTruthy();
    expect(screen.queryByText("도착 안내 이메일")).toBeNull();
    expect(screen.getByText("메일박스를 다시 활성화하면 편지를 보내고 받을 수 있어요.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "새 키로 다시 활성화" }));
    expect(mocks.registerMailbox).toHaveBeenCalledOnce();
  });

  it("does not present a cached address as authenticated while restoring", () => {
    useAppStore.setState({ walletSession: { address, authenticated: true }, authenticationStatus: "restoring" });
    render(<PostOfficeFlow />);

    expect(screen.getByText("로그인 상태를 불러오는 중이에요")).toBeTruthy();
    expect(screen.queryByText("0x111111…111111")).toBeNull();
    expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("true");
  });

  it("selects the routed flow and preserves the wallet session across remounts", () => {
    useAppStore.setState({ walletSession: { address, authenticated: true }, authenticationStatus: "authenticated" });
    setMailboxState(2);
    setEmailState(true);

    const first = render(<PostOfficeFlow view="send" />);
    const sendLink = screen.getByRole("link", { name: "편지 보내기" });
    const inboxLink = screen.getByRole("link", { name: "받은 기별" });

    expect(sendLink.getAttribute("href")).toBe("/send");
    expect(sendLink.getAttribute("aria-current")).toBe("page");
    expect(inboxLink.getAttribute("href")).toBe("/inbox");
    expect(inboxLink.getAttribute("aria-current")).toBeNull();
    expect(screen.getByTestId("send-flow").textContent).toContain(address);
    expect(screen.queryByTestId("inbox-flow")).toBeNull();

    first.unmount();
    render(<PostOfficeFlow view="inbox" />);

    expect(screen.getByRole("button", { name: "계정 변경" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "기별 이용 준비 단계" }).textContent).toContain("3 / 3");
    expect(screen.getByRole("button", { name: "다른 지갑" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "받은 기별" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByTestId("inbox-flow").textContent).toContain(address);
    expect(screen.queryByTestId("send-flow")).toBeNull();
  });
});
