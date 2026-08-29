"use client";

import styled from "@emotion/styled";
import { useState } from "react";

export type EmailRegistrationProps = { verified?: boolean; codeSent?: boolean; busy?: boolean; error?: string | null; onRequestCode: (email: string) => void; onVerifyCode: (code: string) => void };

export function EmailRegistration({ verified, codeSent, busy, error, onRequestCode, onVerifyCode }: EmailRegistrationProps) {
  const [email, setEmail] = useState(""); const [code, setCode] = useState("");
  return <Panel><div><Label>ARRIVAL EMAIL</Label><h3>{verified ? "도착 안내 이메일 인증 완료" : "기별 도착 안내받기"}</h3><p>이메일은 서버에서 암호화하고, 인증 코드 원문은 저장하지 않습니다.</p></div>{!verified && <Fields><input type="email" value={email} disabled={busy || codeSent} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" />{!codeSent ? <button disabled={busy || !email} onClick={() => onRequestCode(email)}>인증 코드 받기</button> : <><input inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="6자리 코드" /><button disabled={busy || code.length !== 6} onClick={() => onVerifyCode(code)}>이메일 확인</button></>}</Fields>}{error && <ErrorText role="alert">{error}</ErrorText>}</Panel>;
}
const Panel = styled.section`display:grid;gap:var(--space-4);padding:var(--space-6);background:rgb(18 28 46 / 86%);border:1px solid var(--color-border);border-radius:4px;box-shadow:var(--shadow-surface);backdrop-filter:blur(18px);p{margin-top:var(--space-2);color:var(--color-text-muted);line-height:1.6;}`;
const Label = styled.p`margin:0!important;font-size:11px;font-weight:600;letter-spacing:.16em;color:var(--color-accent-primary)!important;`;
const Fields = styled.div`display:grid;grid-template-columns:1fr auto;gap:var(--space-3);input{min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border);border-radius:3px;}button{min-height:44px;padding:0 var(--space-4);border:1px solid var(--color-accent-primary);border-radius:3px;background:var(--color-accent-primary);color:var(--color-identity-midnight-navy);cursor:pointer;&:disabled{opacity:.5}}@media(max-width:600px){grid-template-columns:1fr;}`;
const ErrorText = styled.p`color:var(--color-status-error)!important;`;
