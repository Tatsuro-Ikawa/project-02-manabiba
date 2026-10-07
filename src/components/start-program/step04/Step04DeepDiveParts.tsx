'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  DEEP_DIVE_CUSTOM_MAX_CHARS,
  type PickAnswer,
} from '@/lib/startProgram/step04DeepDiveConstants';

export function circled(n: number): string {
  return n >= 1 && n <= 20 ? String.fromCharCode(0x2460 + n - 1) : `(${n})`;
}

type PickGroupProps = {
  /** null = 選択肢を準備中 */
  options: string[] | null;
  value: PickAnswer;
  onChange: (next: PickAnswer) => void;
  otherLabel: string;
  ariaLabel: string;
};

/** 選択肢ピル（複数選択）＋「＋これら以外」で自由追加 */
export function PickGroup({ options, value, onChange, otherLabel, ariaLabel }: PickGroupProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  if (options == null) {
    return (
      <div className="step04-dd-picks is-loading" aria-busy="true" aria-label={ariaLabel}>
        <p className="step04-dd-preparing">質問を準備しています…</p>
        <div className="step04-dd-skeleton">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="step04-dd-skeleton-pill" />
          ))}
        </div>
      </div>
    );
  }

  const stale = value.selected.filter((s) => !options.includes(s));
  const all = [...options, ...stale];

  const toggle = (label: string) => {
    const selected = value.selected.includes(label)
      ? value.selected.filter((s) => s !== label)
      : [...value.selected, label];
    onChange({ ...value, selected });
  };

  const addCustom = () => {
    const t = draft.trim();
    if (!t) return;
    if (!value.custom.includes(t) && !all.includes(t)) onChange({ ...value, custom: [...value.custom, t] });
    else if (all.includes(t) && !value.selected.includes(t)) toggle(t);
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="step04-dd-picks" role="group" aria-label={ariaLabel}>
      {all.map((label) => {
        const on = value.selected.includes(label);
        return (
          <button
            key={label}
            type="button"
            className={`step04-dd-pill${on ? ' is-selected' : ''}`}
            aria-pressed={on}
            onClick={() => toggle(label)}
          >
            {label}
          </button>
        );
      })}
      {value.custom.map((label) => (
        <span key={`c-${label}`} className="step04-dd-pill is-selected is-custom">
          {label}
          <button
            type="button"
            className="step04-dd-pill-remove"
            aria-label={`「${label}」を外す`}
            onClick={() => onChange({ ...value, custom: value.custom.filter((c) => c !== label) })}
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <span className="step04-dd-custom-input">
          <input
            type="text"
            value={draft}
            maxLength={DEEP_DIVE_CUSTOM_MAX_CHARS}
            placeholder="自由に入力"
            aria-label={`${ariaLabel}を追加`}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addCustom();
              }
              if (e.key === 'Escape') {
                e.stopPropagation();
                setAdding(false);
              }
            }}
          />
          <button type="button" className="step04-dd-pill" disabled={!draft.trim()} onClick={addCustom}>
            追加
          </button>
        </span>
      ) : (
        <button type="button" className="step04-dd-pill is-other" onClick={() => setAdding(true)}>
          {otherLabel}
        </button>
      )}
    </div>
  );
}

type DeepDiveModalShellProps = {
  title: string;
  dirty: boolean;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
};

export function DeepDiveModalShell({ title, dirty, onClose, children, footer }: DeepDiveModalShellProps) {
  const titleId = useId();

  const requestClose = () => {
    if (!dirty || window.confirm('入力した内容を保存せずに閉じます。よろしいですか？')) onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="mandala-modal-overlay" role="presentation">
      <div className="mandala-modal step04-dd-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="mandala-modal-header step04-dd-modal-header">
          <h3 id={titleId} className="mandala-modal-title">
            {title}
          </h3>
          <button type="button" className="mandala-modal-close" onClick={requestClose} aria-label="閉じる">
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>
        <div className="step04-dd-modal-body">{children}</div>
        <footer className="step04-dd-modal-footer">{footer}</footer>
      </div>
    </div>
  );
}

type QuestionBlockProps = {
  label: string;
  question: string;
  hint?: string;
  emphasis?: boolean;
  children: ReactNode;
};

export function QuestionBlock({ label, question, hint, emphasis, children }: QuestionBlockProps) {
  return (
    <section className={`step04-dd-question${emphasis ? ' is-emphasis' : ''}`}>
      <h4 className="step04-dd-question-label">{label}</h4>
      <p className="step04-dd-question-text">{question}</p>
      {hint ? <p className="step04-dd-question-hint">{hint}</p> : null}
      <p className="step04-dd-options-label">選択肢</p>
      {children}
    </section>
  );
}

export function PillList({ items, quote }: { items: string[]; quote?: boolean }) {
  if (items.length === 0) return null;
  return (
    <span className="step04-dd-pill-list">
      {items.map((t) => (
        <span key={t} className="step04-tag">
          {quote ? `「${t}」` : t}
        </span>
      ))}
    </span>
  );
}
