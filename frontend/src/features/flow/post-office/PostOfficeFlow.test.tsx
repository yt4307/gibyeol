import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/stores/use-app-store";

const address = "0x1111111111111111111111111111111111111111" as const;

const mocks = vi.hoisted(() => ({
  registerMailbox: vi.fn(),
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

function setMailboxState(keyId: number | null) {
  mocks.useMailboxOnboarding.mockReturnValue({
    keyId,
    busy: false,
    error: null,
    register: mocks.registerMailbox,
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
    useAppStore.setState({ walletSession: null });
    setMailboxState(null);
    setEmailState(false);
  });

  afterEach(() => cleanup());

  it("starts with wallet authentication and hides later onboarding steps", () => {
    render(<PostOfficeFlow />);

    expect(screen.getByRole("button", { name: "지갑 연결" })).toBeTruthy();
    expect(screen.queryByText("PASSKEY MAILBOX")).toBeNull();
    expect(screen.queryByText("ARRIVAL EMAIL")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "우체국 메뉴" })).toBeNull();
    expect(mocks.useMailboxOnboarding).toHaveBeenCalledWith(undefined);
    expect(mocks.useEmailRegistration).toHaveBeenCalledWith(undefined);
  });

  it("registers a mailbox before exposing email verification", () => {
    useAppStore.setState({ walletSession: { address, authenticated: true } });
    render(<PostOfficeFlow />);

    fireEvent.click(screen.getByRole("button", { name: "메일박스 만들기" }));

    expect(mocks.registerMailbox).toHaveBeenCalledOnce();
    expect(screen.getByText("편지를 보내고 받으려면 먼저 메일박스를 만들어 주세요.")).toBeTruthy();
    expect(screen.queryByText("ARRIVAL EMAIL")).toBeNull();
    expect(mocks.useMailboxOnboarding).toHaveBeenCalledWith(address);
  });

  it("connects the email form callbacks while keeping letter flows gated", () => {
    useAppStore.setState({ walletSession: { address, authenticated: true } });
    setMailboxState(2);
    render(<PostOfficeFlow />);

    fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
      target: { value: "letter@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "인증 코드 받기" }));

    expect(mocks.requestCode).toHaveBeenCalledWith("letter@example.com");
    expect(screen.getByText("이메일 인증을 마치면 편지를 보내고 받을 수 있어요.")).toBeTruthy();
    expect(screen.queryByTestId("send-flow")).toBeNull();
    expect(screen.queryByTestId("inbox-flow")).toBeNull();
  });

  it("selects the routed flow and preserves the wallet session across remounts", () => {
    useAppStore.setState({ walletSession: { address, authenticated: true } });
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

    expect(screen.getByRole("button", { name: "인증됨" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "받은 기별" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByTestId("inbox-flow").textContent).toContain(address);
    expect(screen.queryByTestId("send-flow")).toBeNull();
  });
});
