"use client";

import styled from "@emotion/styled";
import { useState } from "react";

export type RecoveryPanelProps = { busy?: boolean; onRequestCode: (email: string) => Promise<void>; onRecover: (code: string) => void; onCancel: () => void };
export function RecoveryPanel({ busy, onRequestCode, onRecover, onCancel }: RecoveryPanelProps) {
  const [email, setEmail] = useState(""); const [code, setCode] = useState(""); const [sent, setSent] = useState(false);
  return <Panel><Label>PASSKEY LOSS RECOVERY</Label><h3>이메일로 본인 확인</h3><p>최근 OTP 확인 뒤 온체인 키와 일치하는 seed만 이 브라우저의 임시 키로 다시 봉인합니다.</p><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" /><button disabled={busy || !email} onClick={() => { void onRequestCode(email).then(() => setSent(true)); }}>{sent ? "코드 다시 보내기" : "인증 코드 받기"}</button>{sent && <><input inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} placeholder="6자리 코드" /><button disabled={busy || code.length !== 6} onClick={() => onRecover(code)}>메일박스 복구</button></>}<button className="cancel" onClick={onCancel}>취소</button></Panel>;
}
const Panel = styled.section`display:grid;gap:var(--space-3);padding:var(--space-6);background:var(--color-brand-100);border:1px solid var(--color-brand-300);border-radius:16px;p{color:var(--color-text-muted);line-height:1.6;}input{min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-neutral-400);border-radius:8px;}button{min-height:42px;border:0;border-radius:999px;background:var(--color-brand-800);color:white;cursor:pointer;&.cancel{background:transparent;color:var(--color-text);border:1px solid var(--color-neutral-400);}}`;
const Label = styled.p`font-size:11px!important;font-weight:700;letter-spacing:.14em;color:var(--color-brand-800)!important;`;
