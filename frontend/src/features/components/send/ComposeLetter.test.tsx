import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SendDraft } from "@features/data/send/send-draft";

vi.mock("@/infrastructure/blockchain/config", () => ({ blockExplorerUrl: "https://explorer.example" }));

import { ComposeLetter } from "./ComposeLetter";

const draft: SendDraft = {
  letterId: `0x${"11".repeat(32)}`,
  recipient: "",
  message: "",
  stage: "DRAFT",
};

const props = { onChange: vi.fn(), onSubmit: vi.fn(), onReset: vi.fn() };

describe("ComposeLetter", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("validates the recipient and keeps sealing disabled until the letter is ready", () => {
    const { rerender } = render(<ComposeLetter {...props} draft={{ ...draft, recipient: "0x123", message: "안녕" }} />);
    expect(screen.getByText("올바른 지갑 주소를 입력해 주세요.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "봉인하고 지갑에서 승인" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<ComposeLetter {...props} draft={{ ...draft, recipient: "0x2222222222222222222222222222222222222222", message: "안녕" }} />);
    expect((screen.getByRole("button", { name: "봉인하고 지갑에서 승인" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows selected files and confirms before discarding a draft", async () => {
    render(<ComposeLetter {...props} draft={{ ...draft, message: "기다릴게" }} />);
    const file = new File([new Uint8Array(2048)], "겨울밤.jpg", { type: "image/jpeg", lastModified: 1 });
    fireEvent.change(screen.getByLabelText(/사진·타임랩스/), { target: { files: [file] } });
    expect(screen.getByText("겨울밤.jpg")).toBeTruthy();
    expect(screen.getAllByText("2.0KB")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "새로 작성" }));
    const dialog = screen.getByRole("alertdialog");
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    fireEvent.click(screen.getByRole("button", { name: "내용 지우기" }));
    expect(props.onReset).toHaveBeenCalledOnce();
  });

  it("keeps the draft but blocks sealing until the transaction wallet is restored", () => {
    render(<ComposeLetter
      {...props}
      walletReady={false}
      draft={{ ...draft, recipient: "0x2222222222222222222222222222222222222222", message: "안녕" }}
    />);

    expect(screen.getByText(/작성한 내용은 그대로 유지됩니다/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "지갑 연결 후 봉인" }) as HTMLButtonElement).disabled).toBe(true);
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("offers clear next actions after sealing", () => {
    const transactionHash = `0x${"aa".repeat(32)}` as const;
    render(<ComposeLetter {...props} draft={{ ...draft, stage: "SEALED", transactionHash }} />);
    expect(screen.getByText("기별 접수가 완료됐어요.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "받은 기별 보기" }).getAttribute("href")).toBe("/inbox");
    expect(screen.getByRole("link", { name: "봉인 기록 확인, 새 창" }).getAttribute("href")).toContain(transactionHash);
  });
});
