"use client";

import styled from "@emotion/styled";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { isAddress } from "viem";
import { blockExplorerUrl } from "@/infrastructure/blockchain/config";
import { formatMediaBytes, type MediaPreprocessingSummary } from "@features/data/send/media-preprocessing";
import { sendStageLabel, type SendDraft, type SendStage } from "@features/data/send/send-draft";

export type ComposeLetterProps = {
  draft: SendDraft;
  busy?: boolean;
  error?: string | null;
  mediaSummary?: MediaPreprocessingSummary | null;
  onChange: (value: Partial<Pick<SendDraft, "recipient" | "message">>) => void;
  onSubmit: (files: readonly File[]) => void;
  onReset: () => void;
};

const stageIndex: Record<SendStage, number> = { DRAFT: 0, PACKING: 0, UPLOADING_PACKAGE: 1, ENCRYPTING_KEY: 2, WAITING_TRANSACTION: 2, SEALED: 3, IN_TRANSIT: 3, ARRIVED: 3, OPENED: 3 };
const progressLabels = ["소포 꾸리기", "안전하게 맡기기", "지갑으로 봉인", "접수 완료"];

export function ComposeLetter({ draft, busy = false, error, mediaSummary, onChange, onSubmit, onReset }: ComposeLetterProps) {
  const [selection, setSelection] = useState<{ letterId: string; files: readonly File[] } | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const resetConfirmRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (confirmingReset) resetConfirmRef.current?.focus(); }, [confirmingReset]);
  const selectedFiles = selection?.letterId === draft.letterId ? selection.files : [];
  const selectedBytes = selectedFiles.reduce((total, file) => total + file.size, 0);
  const recipientValid = isAddress(draft.recipient);
  const recipientInvalid = draft.recipient.length > 0 && !recipientValid;
  const formReady = recipientValid && draft.message.trim().length > 0;
  const currentStage = stageIndex[draft.stage];
  const editable = draft.stage === "DRAFT";
  const complete = draft.stage === "SEALED" || draft.stage === "IN_TRANSIT" || draft.stage === "ARRIVED" || draft.stage === "OPENED";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formReady) onSubmit(selectedFiles);
  };
  const reset = () => { setConfirmingReset(false); setSelection(null); onReset(); };

  return <Form onSubmit={submit}>
    <Header><div><Label>기별 #{draft.letterId.slice(2, 10)}</Label><h2>크리스마스에 닿을 마음</h2></div><Stage>{sendStageLabel[draft.stage]}</Stage></Header>
    <Progress aria-label="기별 접수 단계">
      {progressLabels.map((label, index) => <li key={label} data-complete={index < currentStage || complete || undefined} data-current={index === currentStage && !complete || undefined} aria-current={index === currentStage ? "step" : undefined}>
        <ProgressMark aria-hidden="true">{index < currentStage || complete ? "✓" : index + 1}</ProgressMark><span>{label}</span>
      </li>)}
    </Progress>

    {complete ? <Completion role="status">
      <CompletionMark aria-hidden="true">✦</CompletionMark>
      <div><h3>기별 접수가 완료됐어요.</h3><p>블록체인에 봉인 기록을 남겼습니다. 약속한 날까지 안전하게 보관할게요.</p></div>
      <CompletionActions><Link href="/inbox">받은 기별 보기</Link>{draft.transactionHash && blockExplorerUrl && <a href={`${blockExplorerUrl}/tx/${draft.transactionHash}`} target="_blank" rel="noreferrer" aria-label="봉인 기록 확인, 새 창">봉인 기록 확인</a>}</CompletionActions>
    </Completion> : <>
      <Field>
        <FieldHeader><span>받는 지갑 주소</span>{recipientInvalid && <FieldError id="recipient-error">올바른 지갑 주소를 입력해 주세요.</FieldError>}</FieldHeader>
        <input value={draft.recipient} disabled={!editable} onChange={(event) => onChange({ recipient: event.target.value.trim() })} placeholder="0x…" autoComplete="off" spellCheck={false} aria-invalid={recipientInvalid} aria-describedby={recipientInvalid ? "recipient-error" : undefined} />
      </Field>
      <Field>
        <FieldHeader><span>편지</span><Counter aria-label={`최대 48000자 중 ${draft.message.length}자 작성`}>{draft.message.length.toLocaleString()} / 48,000자</Counter></FieldHeader>
        <textarea value={draft.message} disabled={!editable} onChange={(event) => onChange({ message: event.target.value })} rows={8} maxLength={48000} placeholder="그날의 마음을 적어 주세요." />
      </Field>
      <Field>
        <span>사진·타임랩스 <Optional>(선택)</Optional></span>
        <input key={draft.letterId} name="media" type="file" accept="image/webp,image/jpeg,image/png,video/webm,video/mp4,video/quicktime" multiple disabled={!editable} onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); setSelection(files.length ? { letterId: draft.letterId, files } : null); }} />
        <MediaPolicy>사진은 최대 2,048픽셀로 줄이고, 영상은 8배속·최대 1,280픽셀의 무음 타임랩스로 변환합니다. 원본 영상은 파일당 200MB, 암호화된 최종 소포는 10MB 이하여야 합니다.</MediaPolicy>
        {selectedFiles.length > 0 && <SelectedFiles aria-label="선택한 첨부파일">{selectedFiles.map((file) => <li key={`${file.name}-${file.lastModified}`}><span>{file.name}</span><small>{formatMediaBytes(file.size)}</small></li>)}<SelectedTotal><span>총 {selectedFiles.length}개</span><strong>{formatMediaBytes(selectedBytes)}</strong></SelectedTotal></SelectedFiles>}
        {mediaSummary && <MediaStatus role="status">전처리 완료 · {formatMediaBytes(mediaSummary.originalBytes)} → {formatMediaBytes(mediaSummary.processedBytes)} · 예상 소포 {formatMediaBytes(mediaSummary.estimatedArchiveBytes)}</MediaStatus>}
      </Field>
      <ApprovalNote>봉인을 시작하면 소포를 암호화한 뒤 지갑에서 블록체인 기록을 승인하게 됩니다.</ApprovalNote>
    </>}

    <Actions>
      {!complete && <Submit disabled={busy || !formReady}>{busy ? sendStageLabel[draft.stage] : editable ? "봉인하고 지갑에서 승인" : "접수 이어하기"}</Submit>}
      <Reset type="button" disabled={busy} onClick={() => editable && (draft.message || draft.recipient || selectedFiles.length) ? setConfirmingReset(true) : reset()}>{complete ? "새 기별 쓰기" : "새로 작성"}</Reset>
    </Actions>
    {confirmingReset && <ResetConfirm ref={resetConfirmRef} tabIndex={-1} role="alertdialog" aria-labelledby="reset-title" aria-describedby="reset-description"><div><strong id="reset-title">작성 중인 내용을 지울까요?</strong><p id="reset-description">입력한 편지와 선택한 첨부파일을 되돌릴 수 없습니다.</p></div><div><button type="button" onClick={() => setConfirmingReset(false)}>계속 작성</button><button type="button" className="danger" onClick={reset}>내용 지우기</button></div></ResetConfirm>}
    {busy && <BusyMessage role="status" aria-live="polite">{sendStageLabel[draft.stage]}입니다. 이 화면을 닫지 말아 주세요.</BusyMessage>}
    {error && <ErrorText role="alert">{error}</ErrorText>}
  </Form>;
}

const Form = styled.form`display:grid;gap:var(--space-5);padding:clamp(var(--space-5),4vw,var(--space-8));background:linear-gradient(145deg,rgb(245 246 250 / 3%),transparent 38%),rgb(18 28 46 / 92%);border:1px solid var(--color-border);border-radius:4px;box-shadow:var(--shadow-surface);`;
const Header = styled.header`display:flex;justify-content:space-between;gap:var(--space-4);align-items:start;`;
const Label = styled.p`font-size:11px;font-weight:600;letter-spacing:.16em;color:var(--color-accent-primary);`;
const Stage = styled.span`padding:6px 10px;border:1px solid var(--color-border);border-radius:999px;background:rgb(217 199 163 / 7%);color:var(--color-accent-primary);font-size:12px;font-weight:600;`;
const Progress = styled.ol`display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-2);padding:var(--space-4);list-style:none;border-block:1px solid var(--color-border);li{display:grid;justify-items:center;gap:var(--space-2);color:var(--color-text-muted);font-size:11px;text-align:center;}li[data-current],li[data-complete]{color:var(--color-accent-primary);}li[data-current] span:first-child{border-color:var(--color-accent-primary);box-shadow:0 0 0 3px rgb(217 199 163 / 8%);}li[data-complete] span:first-child{border-color:var(--color-accent-primary);color:var(--color-identity-midnight-navy);background:var(--color-accent-primary);}@media(max-width:520px){padding-inline:0;li span{font-size:10px;}}`;
const ProgressMark = styled.span`display:grid;place-items:center;width:28px;height:28px;border:1px solid var(--color-border);border-radius:50%;font-variant-numeric:tabular-nums;`;
const Field = styled.label`display:grid;gap:var(--space-2);font-size:var(--font-size-100);font-weight:600;input,textarea{width:100%;padding:var(--space-4);border:1px solid var(--color-border);border-radius:3px;background:rgb(13 19 33 / 58%);font:inherit;font-weight:400;transition:border-color 160ms ease,background 160ms ease;&:focus{border-color:var(--color-accent-primary);background:rgb(13 19 33 / 78%);}&[aria-invalid="true"]{border-color:var(--color-status-error);}}textarea{resize:vertical;line-height:1.75;}`;
const FieldHeader = styled.span`display:flex;justify-content:space-between;gap:var(--space-3);align-items:baseline;`;
const FieldError = styled.small`color:var(--color-status-error);font-weight:400;`;
const Counter = styled.small`color:var(--color-text-muted);font-weight:400;font-variant-numeric:tabular-nums;`;
const Optional = styled.small`color:var(--color-text-muted);font-weight:400;`;
const MediaPolicy = styled.small`font-weight:400;line-height:1.55;color:var(--color-text-muted);`;
const SelectedFiles = styled.ul`display:grid;gap:1px;margin-top:var(--space-2);overflow:hidden;border:1px solid var(--color-border);border-radius:3px;background:var(--color-border);list-style:none;li{display:flex;justify-content:space-between;gap:var(--space-4);padding:var(--space-3);background:var(--color-identity-midnight-navy);font-weight:400;span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}small{flex:0 0 auto;color:var(--color-text-muted);}}`;
const SelectedTotal = styled.li`color:var(--color-accent-primary);strong{font-variant-numeric:tabular-nums;}`;
const MediaStatus = styled.small`font-weight:600;color:var(--color-accent-primary);`;
const ApprovalNote = styled.p`padding:var(--space-4);border-left:2px solid var(--color-accent-primary);background:rgb(217 199 163 / 6%);color:var(--color-text-muted);font-size:var(--font-size-100);line-height:1.6;`;
const Actions = styled.div`display:flex;gap:var(--space-3);flex-wrap:wrap;@media(max-width:640px){position:sticky;z-index:4;bottom:0;margin:0 calc(var(--space-5) * -1) calc(var(--space-5) * -1);padding:var(--space-3) var(--space-5);border-top:1px solid var(--color-border);background:rgb(11 19 32 / 94%);backdrop-filter:blur(14px);button{flex:1;}}`;
const Submit = styled.button`min-height:48px;padding:0 var(--space-6);border:1px solid var(--color-accent-primary);border-radius:3px;background:var(--color-accent-primary);color:var(--color-identity-midnight-navy);font-weight:600;cursor:pointer;&:disabled{opacity:.55;cursor:not-allowed;}`;
const Reset = styled.button`min-height:48px;padding:0 var(--space-5);border:1px solid var(--color-border);border-radius:3px;background:transparent;color:var(--color-text-muted);cursor:pointer;&:disabled{opacity:.55;cursor:not-allowed;}`;
const ResetConfirm = styled.div`display:flex;justify-content:space-between;gap:var(--space-4);align-items:center;padding:var(--space-4);border:1px solid rgb(166 70 62 / 52%);background:rgb(166 70 62 / 8%);strong{color:var(--color-text-primary);}p{margin-top:var(--space-1);color:var(--color-text-muted);font-size:var(--font-size-100);}div:last-child{display:flex;gap:var(--space-2);}button{min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border);border-radius:3px;color:var(--color-text-primary);background:transparent;cursor:pointer;}.danger{border-color:var(--color-status-error);color:#f3bbb6;}@media(max-width:600px){align-items:stretch;flex-direction:column;}`;
const BusyMessage = styled.p`color:var(--color-accent-primary);font-size:var(--font-size-100);`;
const ErrorText = styled.p`color:var(--color-status-error);&::before{margin-right:var(--space-2);content:"⚠";}`;
const Completion = styled.section`display:grid;grid-template-columns:auto 1fr;gap:var(--space-4);align-items:start;padding:var(--space-6);border:1px solid var(--color-accent-primary);background:rgb(217 199 163 / 7%);h3{font-family:var(--font-family-display);font-size:var(--font-size-400);}p{margin-top:var(--space-2);color:var(--color-text-muted);line-height:1.6;}`;
const CompletionMark = styled.span`display:grid;place-items:center;width:46px;height:46px;border-radius:48% 52% 46% 54%;color:var(--color-identity-midnight-navy);background:var(--color-accent-primary);font-size:22px;`;
const CompletionActions = styled.div`grid-column:2;display:flex;gap:var(--space-3);flex-wrap:wrap;a{min-height:40px;display:inline-flex;align-items:center;padding:0 var(--space-4);border:1px solid var(--color-border);border-radius:3px;color:var(--color-text-primary);&:first-of-type{border-color:var(--color-accent-primary);color:var(--color-identity-midnight-navy);background:var(--color-accent-primary);}}@media(max-width:520px){grid-column:1/-1;a{flex:1;justify-content:center;}}`;
