'use client';

import { useEffect, useId, useState } from 'react';
import {
  INTEREST_OPTION_MAX_CHARS,
  createInterestOptionId,
  type InterestOption,
  type MandalaWishRef,
} from '@/lib/startProgram/step02Constants';
import { countUnicodeChars } from '@/lib/startProgram/mandalaConstants';

type Step02InterestModalProps = {
  wish: MandalaWishRef;
  options: InterestOption[];
  wishIndex: number;
  wishTotal: number;
  onClose: () => void;
  onSaveOptions: (options: InterestOption[]) => void;
  onPrev: () => void;
  onNext: () => void;
  onFetchAiCandidates: () => Promise<string[]>;
};

export default function Step02InterestModal({
  wish,
  options,
  wishIndex,
  wishTotal,
  onClose,
  onSaveOptions,
  onPrev,
  onNext,
  onFetchAiCandidates,
}: Step02InterestModalProps) {
  const titleId = useId();
  const [local, setLocal] = useState<InterestOption[]>(options);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setLocal(options);
    setAdding(false);
    setDraft('');
    setMsg(null);
  }, [wish.entryId, options]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = (id: string) => {
    setLocal((prev) =>
      prev.map((o) => (o.id === id ? { ...o, selected: !o.selected } : o))
    );
  };

  const commitAdd = () => {
    const text = draft.trim();
    if (!text) {
      setMsg('文字を入力してください。');
      return;
    }
    if (countUnicodeChars(text) > INTEREST_OPTION_MAX_CHARS) {
      setMsg(`${INTEREST_OPTION_MAX_CHARS}文字以内で入力してください。`);
      return;
    }
    if (local.some((o) => o.label === text)) {
      setMsg('同じ候補がすでにあります。');
      return;
    }
    const next: InterestOption = {
      id: createInterestOptionId(),
      wishEntryId: wish.entryId,
      label: text,
      source: 'manual',
      selected: true,
    };
    setLocal((prev) => [...prev, next]);
    setDraft('');
    setAdding(false);
    setMsg(null);
  };

  const handleFetchAi = async () => {
    setAiLoading(true);
    setMsg(null);
    try {
      const labels = await onFetchAiCandidates();
      if (labels.length === 0) {
        setMsg('候補を取得できませんでした。「+追加」で自由に書いてください。');
        return;
      }
      const existing = new Set(local.map((o) => o.label));
      const incoming: InterestOption[] = labels
        .filter((l) => !existing.has(l))
        .map((label) => ({
          id: createInterestOptionId(),
          wishEntryId: wish.entryId,
          label,
          source: 'dummy' as const,
          selected: false,
        }));
      if (incoming.length === 0) {
        setMsg('新しい候補はありません（既存と重複）。');
      } else {
        setLocal((prev) => [...prev, ...incoming]);
        setMsg(`${incoming.length}件の候補を追加しました。`);
      }
    } catch {
      setMsg('候補の取得に失敗しました。「+追加」で記入してください。');
    } finally {
      setAiLoading(false);
    }
  };

  const persistAnd = (fn: () => void) => {
    onSaveOptions(local);
    fn();
  };

  return (
    <div
      className="step02-interest-modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) persistAnd(onClose);
      }}
    >
      <div
        className="step02-interest-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="step02-interest-modal-header">
          <h3 id={titleId} className="step02-interest-modal-title">
            興味・関心を掘り下げてみよう
          </h3>
          <button
            type="button"
            className="mandala-modal-close"
            aria-label="閉じる"
            onClick={() => persistAnd(onClose)}
          >
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>

        <div className="step02-interest-modal-body">
          <p className="step02-interest-modal-wish">「{wish.text}」</p>
          <p className="step02-interest-modal-lead">
            その願望のどこに惹かれますか？ 下記から選んでください（複数可）。＋追加で自分の言葉も書けます。
          </p>

          <div className="step02-interest-option-list" role="group" aria-label="興味の候補">
            {local.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`step02-interest-option-pill${opt.selected ? ' is-selected' : ''}`}
                aria-pressed={opt.selected}
                onClick={() => toggle(opt.id)}
              >
                {opt.label}
              </button>
            ))}
            {!adding ? (
              <button
                type="button"
                className="step02-interest-option-pill step02-interest-option-pill--add"
                onClick={() => setAdding(true)}
              >
                ＋追加
              </button>
            ) : null}
          </div>

          {adding ? (
            <div className="step02-interest-add-row">
              <input
                className="step02-interest-add-input"
                value={draft}
                maxLength={INTEREST_OPTION_MAX_CHARS}
                placeholder="興味の内容を入力"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitAdd();
                  }
                }}
                autoFocus
              />
              <button type="button" className="step02-section-next-btn" onClick={commitAdd}>
                追加
              </button>
              <button
                type="button"
                className="step02-section-next-btn step02-section-next-btn--secondary"
                onClick={() => {
                  setAdding(false);
                  setDraft('');
                }}
              >
                キャンセル
              </button>
            </div>
          ) : null}

          <p className="step02-interest-ai-row">
            <button
              type="button"
              className="step02-auto-draft-btn"
              disabled={aiLoading}
              onClick={handleFetchAi}
            >
              {aiLoading ? '取得中…' : 'Ai候補を取得'}
            </button>
            <span className="step02-interest-ai-hint">
              P0: ダミー候補を読み込みます（本番 AI は後続）
            </span>
          </p>

          {msg ? (
            <p className="mandala-modal-msg" role="status">
              {msg}
            </p>
          ) : null}
        </div>

        <footer className="step02-interest-modal-footer">
          <button
            type="button"
            className="step02-section-next-btn step02-section-next-btn--secondary"
            onClick={() => persistAnd(onClose)}
          >
            閉じる
          </button>
          <div className="step02-interest-modal-footer-right">
            <button
              type="button"
              className="step02-section-next-btn step02-section-next-btn--secondary"
              disabled={wishIndex <= 0}
              onClick={() => persistAnd(onPrev)}
            >
              前へ
            </button>
            <button
              type="button"
              className="step02-section-next-btn"
              disabled={wishIndex >= wishTotal - 1}
              onClick={() => persistAnd(onNext)}
            >
              次の願望へ
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
