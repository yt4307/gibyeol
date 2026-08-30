"use client";

import styled from "@emotion/styled";
import { useState } from "react";

export type RecoveryPanelProps = { busy?: boolean; activity?: "loading" | "opening" | "requesting-code" | "recovering" | null; onRequestCode: (email: string) => Promise<void>; onRecover: (code: string) => void; onCancel: () => void };
export function RecoveryPanel({ busy, activity, onRequestCode, onRecover, onCancel }: RecoveryPanelProps) {
  const [email, setEmail] = useState(""); const [code, setCode] = useState(""); const [sent, setSent] = useState(false);
  return <Panel><Label>패스키 분실 복구</Label><h3>이메일로 본인 확인</h3><p>최근 이메일 인증 뒤 블록체인에 등록된 키와 일치하는 복구 키만 이 브라우저의 임시 키로 다시 봉인합니다.</p><input aria-label="복구 이메일" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" /><button type="button" disabled={busy || !email} onClick={() => { void onRequestCode(email).then(() => setSent(true)).catch(() => undefined); }}>{sent ? "인증번호 다시 보내기" : "인증번호 받기"}</button>{sent && <><input aria-label="복구 인증번호" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="6자리 인증번호" /><button type="button" disabled={busy || code.length !== 6} onClick={() => onRecover(code)}>메일박스 복구</button></>}{busy && <Status role="status" aria-live="polite">{activity === "requesting-code" ? "복구 인증 메일을 보내고 있어요." : "시간 잠금 봉투와 메일박스 키를 확인하고 있어요."}</Status>}<button type="button" className="cancel" onClick={onCancel} disabled={busy}>취소</button></Panel>;
}
const Panel = styled.section`display:grid;gap:var(--space-3);padding:var(--space-6);background:rgb(18 28 46 / 92%);border:1px solid var(--color-border);border-radius:4px;box-shadow:var(--shadow-surface);p{color:var(--color-text-muted);line-height:1.6;}input{min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border);border-radius:3px;}button{min-height:42px;border:1px solid var(--color-accent-primary);border-radius:3px;background:var(--color-accent-primary);color:var(--color-identity-midnight-navy);cursor:pointer;&.cancel{background:transparent;color:var(--color-text-muted);border-color:var(--color-border);}}`;
const Label = styled.p`font-size:11px!important;font-weight:600;letter-spacing:.16em;color:var(--color-accent-primary)!important;`;
const Status = styled.p`color:var(--color-accent-primary)!important;font-size:var(--font-size-100);`;
