'use client';

import { useEffect, useId, useState } from 'react';
import { countUnicodeChars } from '@/lib/startProgram/mandalaConstants';
import {
  VALUES_OPTION_MAX_CHARS,
  createValueOptionId,
  type ValueOption,
} from '@/lib/startProgram/step02ValuesConstants';
import type { MandalaWishRef } from '@/lib/startProgram/step02Constants';

type Props = {
  wish: MandalaWishRef;
  options: ValueOption[];
  wishIndex: number;
  wishTotal: number;
  onClose: () => void;
  onSaveOptions: (options: ValueOption[]) => void;
  onPrev: () => void;
  onNext: () => void;
  onFetchAiCandidates: () => Promise<string[]>;
};

export default function Step02ValuesWishModal({
  wish,
  options,
  wishIndex,
  wishTotal,
  onClose,
  onSaveOptions,
  onPrev,
  onNext,
  onFetchAiCandidates,
}: Props) {
  const titleId = useId();
  const [local, setLocal] = useState(options);
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

  const persistAnd = (fn: () => void) => {
    onSaveOptions(local);
    fn();
  };

  const commitAdd = () => {
    const text = draft.trim();
    if (!text) {
      setMsg('文字を入力してください。');
      return;
    }
    if (countUnicodeChars(text) > VALUES_OPTION_MAX_CHARS) {
      setMsg(`${VALUES_OPTION_MAX_CHARS}文字以内で入力してください。`);
      return;
    }
    if (local.some((o) => o.label === text)) {
      setMsg('同じ候補がすでにあります。');
      return;
    }
    setLocal((prev) => [
      ...prev,
      {
        id: createValueOptionId(),
        sourceId: wish.entryId,
        sourceType: 'wish',
        label: text,
        source: 'manual',
        selected: true,
      },
    ]);
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
        setMsg('候補を取得できませんでした。「＋追加」で書いてください。');
        return;
      }
      const existing = new Set(local.map((o) => o.label));
      const incoming = labels
        .filter((l) => !existing.has(l))
        .map(
          (label): ValueOption => ({
            id: createValueOptionId(),
            sourceId: wish.entryId,
            sourceType: 'wish',
            label,
            source: 'dummy',
            selected: false,
          })
        );
      if (incoming.length === 0) setMsg('新しい候補はありません。');
      else {
        setLocal((prev) => [...prev, ...incoming]);
        setMsg(`${incoming.length}件の価値観候補を追加しました。`);
      }
    } catch {
      setMsg('候補の取得に失敗しました。');
    } finally {
      setAiLoading(false);
    }
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
            価値観を掘り下げてみよう
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
            この願望の奥にある「大切にしていること（価値観）」を選んでください（複数可）。
          </p>
          <div className="step02-interest-option-list" role="group">
            {local.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`step02-interest-option-pill${opt.selected ? ' is-selected' : ''}`}
                aria-pressed={opt.selected}
                onClick={() =>
                  setLocal((prev) =>
                    prev.map((o) =>
                      o.id === opt.id ? { ...o, selected: !o.selected } : o
                    )
                  )
                }
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
                placeholder="価値観を入力"
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
            <span className="step02-interest-ai-hint">P0: ダミー候補（本番 AI は後続）</span>
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
