"use client";

import styled from "@emotion/styled";
import { useState, type FormEvent } from "react";
import { formatMediaBytes, type MediaPreprocessingSummary } from "@features/data/send/media-preprocessing";
import { sendStageLabel, type SendDraft } from "@features/data/send/send-draft";

export type ComposeLetterProps = { draft: SendDraft; busy?: boolean; error?: string | null; mediaSummary?: MediaPreprocessingSummary | null; onChange: (value: Partial<Pick<SendDraft, "recipient" | "message">>) => void; onSubmit: (files: readonly File[]) => void; onReset: () => void };

export function ComposeLetter({ draft, busy, error, mediaSummary, onChange, onSubmit, onReset }: ComposeLetterProps) {
  const [selection, setSelection] = useState<{ letterId: string; count: number; bytes: number } | null>(null);
  const currentSelection = selection?.letterId === draft.letterId ? selection : null;
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit(Array.from(new FormData(event.currentTarget).getAll("media")).filter((value): value is File => value instanceof File && value.size > 0)); };
  return <Form onSubmit={submit}>
    <Header><div><Label>LETTER #{draft.letterId.slice(2, 10)}</Label><h2>크리스마스에 닿을 마음</h2></div><Stage>{sendStageLabel[draft.stage]}</Stage></Header>
    <Field><span>받는 지갑 주소</span><input value={draft.recipient} disabled={draft.stage !== "DRAFT"} onChange={(event) => onChange({ recipient: event.target.value })} placeholder="0x…" /></Field>
    <Field><span>편지</span><textarea value={draft.message} disabled={draft.stage !== "DRAFT"} onChange={(event) => onChange({ message: event.target.value })} rows={8} maxLength={48000} placeholder="그날의 마음을 적어 주세요." /></Field>
    <Field><span>사진·타임랩스 (선택)</span><input key={draft.letterId} name="media" type="file" accept="image/webp,image/jpeg,image/png,video/webm,video/mp4,video/quicktime" multiple disabled={draft.stage !== "DRAFT"} onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); setSelection(files.length ? { letterId: draft.letterId, count: files.length, bytes: files.reduce((total, file) => total + file.size, 0) } : null); }} /><MediaPolicy>사진은 최대 2,048px로 줄여 WebP 우선 변환합니다. WebM·MP4·MOV 원본 영상은 WebCodecs 우선, ffmpeg.wasm 대체 경로로 8배속·최대 1,280px 무음 WebM 타임랩스로 변환합니다. 원본 영상은 파일당 200 MiB, 암호화된 최종 소포는 10 MiB 이하여야 합니다.</MediaPolicy>{currentSelection && <MediaStatus>선택 {currentSelection.count}개 · 원본 {formatMediaBytes(currentSelection.bytes)}</MediaStatus>}{mediaSummary && <MediaStatus>전처리 완료 · {formatMediaBytes(mediaSummary.originalBytes)} → {formatMediaBytes(mediaSummary.processedBytes)} · 예상 소포 {formatMediaBytes(mediaSummary.estimatedArchiveBytes)}{mediaSummary.webCodecsVideos > 0 && ` · WebCodecs ${mediaSummary.webCodecsVideos}개`}{mediaSummary.ffmpegVideos > 0 && ` · ffmpeg.wasm ${mediaSummary.ffmpegVideos}개`}</MediaStatus>}</Field>
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
const MediaPolicy = styled.small`font-weight:400;line-height:1.55;color:var(--color-neutral-700);`;
const MediaStatus = styled.small`font-weight:600;color:var(--color-brand-800);`;
const Actions = styled.div`display:flex;gap:var(--space-3);flex-wrap:wrap;`;
const Submit = styled.button`min-height:48px;padding:0 var(--space-6);border:0;border-radius:999px;background:var(--color-brand-800);color:white;font-weight:600;cursor:pointer;&:disabled{opacity:.55}`;
const Reset = styled.button`min-height:48px;padding:0 var(--space-5);border:1px solid var(--color-neutral-400);border-radius:999px;background:transparent;cursor:pointer;`;
const ErrorText = styled.p`color:var(--color-status-error);`;
const Receipt = styled.p`overflow-wrap:anywhere;color:var(--color-status-success);font-size:12px;`;
