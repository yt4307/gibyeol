import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailRegistration } from "./EmailRegistration";

describe("EmailRegistration", () => {
  afterEach(cleanup);

  it("requests a verification code when the email form is submitted with Enter", () => {
    const requestCode = vi.fn();
    render(<EmailRegistration onRequestCode={requestCode} onVerifyCode={vi.fn()} />);
    const email = screen.getByRole<HTMLInputElement>("textbox", { name: "도착 안내를 받을 이메일" });
    fireEvent.change(email, { target: { value: "  user@example.com  " } });
    fireEvent.submit(email.form!);
    expect(requestCode).toHaveBeenCalledWith("user@example.com");
  });

  it("verifies a six-digit code when the code form is submitted with Enter", () => {
    const verifyCode = vi.fn();
    render(<EmailRegistration codeSent onRequestCode={vi.fn()} onVerifyCode={verifyCode} />);
    const code = screen.getByRole<HTMLInputElement>("textbox", { name: "이메일 인증번호" });
    fireEvent.change(code, { target: { value: "12a3456" } });
    fireEvent.submit(code.form!);
    expect(verifyCode).toHaveBeenCalledWith("123456");
  });

  it("ignores duplicate submissions while a request is in progress", () => {
    const requestCode = vi.fn();
    render(<EmailRegistration busy onRequestCode={requestCode} onVerifyCode={vi.fn()} />);
    const form = screen.getByRole("button", { name: "인증번호 받기" }).closest("form");
    fireEvent.submit(form!);
    expect(requestCode).not.toHaveBeenCalled();
  });
});
