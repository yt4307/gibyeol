"use client";

import styled from "@emotion/styled";
import { useState } from "react";

export type EmailRegistrationProps = { verified?: boolean; codeSent?: boolean; busy?: boolean; error?: string | null; onRequestCode: (email: string) => void; onVerifyCode: (code: string) => void };

export function EmailRegistration({ verified, codeSent, busy, error, onRequestCode, onVerifyCode }: EmailRegistrationProps) {
  const [email, setEmail] = useState(""); const [code, setCode] = useState("");
  return <Panel><div><Label>도착 안내 이메일</Label><h3>{verified ? "도착 안내 이메일 인증 완료" : "기별 도착 안내받기"}</h3><p>{verified ? "약속한 날 기별이 도착하면 이 주소로 알려드려요." : "이메일은 서버에서 암호화하고, 인증번호 원문은 저장하지 않습니다."}</p></div>{!verified && <Fields><input aria-label="도착 안내를 받을 이메일" type="email" autoComplete="email" value={email} disabled={busy || codeSent} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" />{!codeSent ? <button type="button" disabled={busy || !email} onClick={() => onRequestCode(email)}>인증번호 받기</button> : <><input aria-label="이메일 인증번호" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="6자리 인증번호" /><button type="button" disabled={busy || code.length !== 6} onClick={() => onVerifyCode(code)}>이메일 확인</button></>}</Fields>}{busy && <StatusText role="status" aria-live="polite">{codeSent ? "인증번호를 확인하고 있어요." : "인증 메일을 보내고 있어요."}</StatusText>}{codeSent && !verified && <Guide>메일에서 6자리 인증번호를 확인해 주세요. 메일이 보이지 않으면 스팸함도 확인해 주세요.</Guide>}{error && <ErrorText role="alert">{error}</ErrorText>}</Panel>;
}
const Panel = styled.section`display:grid;gap:var(--space-4);padding:var(--space-6);background:rgb(18 28 46 / 86%);border:1px solid var(--color-border);border-radius:4px;box-shadow:var(--shadow-surface);backdrop-filter:blur(18px);p{margin-top:var(--space-2);color:var(--color-text-muted);line-height:1.6;}`;
const Label = styled.p`margin:0!important;font-size:11px;font-weight:600;letter-spacing:.16em;color:var(--color-accent-primary)!important;`;
const Fields = styled.div`display:grid;grid-template-columns:1fr auto;gap:var(--space-3);input{min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border);border-radius:3px;}button{min-height:44px;padding:0 var(--space-4);border:1px solid var(--color-accent-primary);border-radius:3px;background:var(--color-accent-primary);color:var(--color-identity-midnight-navy);cursor:pointer;&:disabled{opacity:.5}}@media(max-width:600px){grid-template-columns:1fr;}`;
const Guide = styled.p`margin:0!important;font-size:var(--font-size-100);`;
const StatusText = styled.p`margin:0!important;color:var(--color-accent-primary)!important;font-size:var(--font-size-100);`;
const ErrorText = styled.p`color:var(--color-status-error)!important;`;
