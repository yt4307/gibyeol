import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChristmasArrival } from "./ChristmasArrival";

describe("ChristmasArrival", () => {
  afterEach(cleanup);

  it("shows the Christmas arrival and opens the first letter", () => {
    const openFirst = vi.fn();
    render(<ChristmasArrival letterCount={2} onOpenFirst={openFirst} />);

    expect(screen.getByRole("heading", { name: "시간을 건너, 기별이 닿았습니다." })).toBeTruthy();
    expect(screen.getByText(/기별 2통의 봉인이 풀렸어요/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "첫 기별 열기" }));
    expect(openFirst).toHaveBeenCalledOnce();
  });

  it("does not render an arrival for an empty inbox", () => {
    const { container } = render(<ChristmasArrival letterCount={0} onOpenFirst={vi.fn()} />);
    expect(container.childElementCount).toBe(0);
  });

  it("prevents duplicate opening while the passkey flow is busy", () => {
    render(<ChristmasArrival letterCount={1} busy onOpenFirst={vi.fn()} />);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "봉인을 여는 중…" }).disabled).toBe(true);
  });
});
