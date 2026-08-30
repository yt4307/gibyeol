import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InboxLetter } from "@features/data/inbox/inbox";

vi.mock("@/infrastructure/blockchain/config", () => ({ blockExplorerUrl: "https://explorer.example" }));

import { InboxList } from "./InboxList";

const letter: InboxLetter = {
  letterId: `0x${"11".repeat(32)}`,
  sender: "0x2222222222222222222222222222222222222222",
  recipient: "0x3333333333333333333333333333333333333333",
  recipientKeyId: 2,
  archiveSha256: `0x${"44".repeat(32)}`,
  transactionHash: `0x${"55".repeat(32)}`,
  blockNumber: 46_142_335n,
};

describe("InboxList", () => {
  afterEach(cleanup);

  it("turns an empty inbox into an actionable state", () => {
    const retry = vi.fn();
    render(<InboxList letters={[]} onOpen={vi.fn()} onRecover={vi.fn()} onRetry={retry} />);
    expect(screen.getByText("아직 도착한 기별이 없어요.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "기별 보내기" }).getAttribute("href")).toBe("/send");
  });

  it("shows a retry action with the specific loading error", () => {
    const retry = vi.fn();
    render(<InboxList letters={[]} error="네트워크 연결을 확인해 주세요." onOpen={vi.fn()} onRecover={vi.fn()} onRetry={retry} />);
    expect(screen.getByRole("alert").textContent).toContain("네트워크 연결을 확인해 주세요.");
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("keeps technical records collapsed and marks the letter being opened", () => {
    render(<InboxList letters={[letter]} unlocked busy openingLetterId={letter.letterId} onOpen={vi.fn()} onRecover={vi.fn()} />);
    expect(screen.getByText("보낸 지갑")).toBeTruthy();
    expect(screen.getByRole("button", { name: "봉인을 여는 중…" })).toBeTruthy();
    const details = screen.getByText("기별 기록 자세히 보기").closest("details");
    expect(details?.hasAttribute("open")).toBe(false);
    expect(screen.getByRole("link", { name: "블록 탐색기에서 봉인 기록 보기, 새 창" }).getAttribute("href")).toContain(letter.transactionHash);
  });
});
