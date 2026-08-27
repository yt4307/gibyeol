"use client";

import styled from "@emotion/styled";
import type { FormEvent } from "react";
import { sendStageLabel, type SendDraft } from "../data/send-draft";

export type ComposeLetterProps = { draft: SendDraft; busy?: boolean; error?: string | null; onChange: (value: Partial<Pick<SendDraft, "recipient" | "message">>) => void; onSubmit: (files: readonly File[]) => void; onReset: () => void };

export function ComposeLetter({ draft, busy, error, onChange, onSubmit, onReset }: ComposeLetterProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit(Array.from(new FormData(event.currentTarget).getAll("media")).filter((value): value is File => value instanceof File && value.size > 0)); };
  return <Form onSubmit={submit}>
    <Header><div><Label>LETTER #{draft.letterId.slice(2, 10)}</Label><h2>크리스마스에 닿을 마음</h2></div><Stage>{sendStageLabel[draft.stage]}</Stage></Header>
    <Field><span>받는 지갑 주소</span><input value={draft.recipient} disabled={draft.stage !== "DRAFT"} onChange={(event) => onChange({ recipient: event.target.value })} placeholder="0x…" /></Field>
    <Field><span>편지</span><textarea value={draft.message} disabled={draft.stage !== "DRAFT"} onChange={(event) => onChange({ message: event.target.value })} rows={8} maxLength={48000} placeholder="그날의 마음을 적어 주세요." /></Field>
    <Field><span>사진·타임랩스 (선택)</span><input name="media" type="file" accept="image/webp,image/jpeg,video/webm,video/mp4" multiple disabled={draft.stage !== "DRAFT"} /></Field>
    <Actions><Submit disabled={busy || draft.stage === "SEALED"}>{busy ? sendStageLabel[draft.stage] : draft.stage === "DRAFT" ? "편지 봉인하기" : draft.stage === "SEALED" ? "접수 완료" : "이어하기"}</Submit><Reset type="button" onClick={onReset}>새 편지</Reset></Actions>
    {error && <ErrorText role="alert">{error}</ErrorText>}
    {draft.transactionHash && <Receipt>거래: {draft.transactionHash}</Receipt>}
  </Form>;
}
const Form = styled.form`display:grid;gap:var(--space-5);padding:clamp(var(--space-5),4vw,var(--space-8));background:var(--color-neutral-100);border:1px solid var(--color-neutral-300);border-radius:20px;`;
const Header = styled.header`display:flex;justify-content:space-between;gap:var(--space-4);align-items:start;`;
const Label = styled.p`font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--color-brand-800);`;
const Stage = styled.span`padding:6px 10px;border-radius:999px;background:var(--color-brand-100);color:var(--color-brand-900);font-size:12px;font-weight:700;`;
const Field = styled.label`display:grid;gap:var(--space-2);font-size:var(--font-size-100);font-weight:600;input,textarea{width:100%;padding:var(--space-4);border:1px solid var(--color-neutral-400);border-radius:10px;background:white;font:inherit;font-weight:400;}textarea{resize:vertical;line-height:1.65;}`;
const Actions = styled.div`display:flex;gap:var(--space-3);flex-wrap:wrap;`;
const Submit = styled.button`min-height:48px;padding:0 var(--space-6);border:0;border-radius:999px;background:var(--color-brand-800);color:white;font-weight:600;cursor:pointer;&:disabled{opacity:.55}`;
const Reset = styled.button`min-height:48px;padding:0 var(--space-5);border:1px solid var(--color-neutral-400);border-radius:999px;background:transparent;cursor:pointer;`;
const ErrorText = styled.p`color:var(--color-status-error);`;
const Receipt = styled.p`overflow-wrap:anywhere;color:var(--color-status-success);font-size:12px;`;
