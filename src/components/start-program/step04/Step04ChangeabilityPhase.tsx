'use client';

import { useState } from 'react';
import {
  CHANGEABILITY_OPTIONS,
  STEP04_REASON_MAX_CHARS,
  deferredReasons,
  type Changeability,
  type Step04Progress,
  type Step04Theme,
} from '@/lib/startProgram/step04Constants';

type Step04ChangeabilityPhaseProps = {
  theme: Step04Theme;
  progress: Step04Progress;
  onSelect: (id: string, c: Changeability) => void;
  onAddRescue: (text: string, c: Changeability) => void;
  onRemove: (id: string) => void;
  onNext: () => void;
};

const MARKS = ['①', '②', '③', '④'];

function RescuePanel({ theme, onAddRescue }: Pick<Step04ChangeabilityPhaseProps, 'theme' | 'onAddRescue'>) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<Changeability>('can_influence');
  const deferred = deferredReasons(theme).filter((r) => r.origin === 'initial');

  const submit = () => {
    if (!text.trim()) return;
    onAddRescue(text, kind);
    setText('');
  };

  return (
    <section className="step04-rescue" aria-label="①②でできることを挙げる">
      <h3 className="step04-rescue-title">①②でできることを、リストアップしてみましょう</h3>
      <p className="step04-rescue-body">
        「難しそう」「分からない」と感じるのは自然なことで、それ自体が大切な気づきです。そのうえで、同じ状況の中でも
        <strong>自分でできそうなこと</strong>や<strong>自分から働きかけられそうなこと</strong>
        を、小さくてもよいので挙げてみましょう。
      </p>
      {deferred.length > 0 ? (
        <details className="step04-rescue-ref">
          <summary>保留にした課題を見ながら考える</summary>
          <ul>
            {deferred.map((r) => (
              <li key={r.id}>{r.text}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="step04-rescue-example">
        例：「上司が忙しくて相談できない」→「相談したいことを先にメモして、短い時間をお願いしてみる」
      </p>
      <textarea
        className="step04-reason-input"
        rows={2}
        value={text}
        maxLength={STEP04_REASON_MAX_CHARS}
        placeholder="自分でできそう／働きかけられそうなこと"
        aria-label="①②でできること"
        onChange={(e) => setText(e.target.value)}
      />
      <div className="step04-rescue-kind" role="radiogroup" aria-label="種類">
        {CHANGEABILITY_OPTIONS.slice(0, 2).map((o, i) => (
          <label key={o.id} className={`step04-choice${kind === o.id ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name="step04-rescue-kind"
              checked={kind === o.id}
              onChange={() => setKind(o.id)}
            />
            {MARKS[i]} {o.label}
          </label>
        ))}
      </div>
      <button
        type="button"
        className="mandala-modal-btn mandala-modal-btn--secondary"
        disabled={!text.trim()}
        onClick={submit}
      >
        追加する
      </button>
    </section>
  );
}

export default function Step04ChangeabilityPhase({
  theme,
  progress,
  onSelect,
  onAddRescue,
  onRemove,
  onNext,
}: Step04ChangeabilityPhaseProps) {
  const reasons = theme.reasons.filter((r) => r.text.trim());
  const unanswered = reasons.filter((r) => r.changeability == null).length;
  const hasRescue = reasons.some((r) => r.origin === 'rescue');

  return (
    <div className="step04-changeability">
      <h2 className="seven-steps-worksheet-heading">現在の状況（課題）を自分で変えることはできそうですか？</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">課題ごとに一番近いものを選んでください。</p>

      <ol className="step04-cards">
        {reasons.map((r, idx) => (
          <li key={r.id} className="step04-card">
            <div className="step04-card-head">
              <span className="step04-reason-no">{idx + 1}</span>
              <p className="step04-card-text">{r.text}</p>
              {r.origin === 'rescue' ? (
                <>
                  <span className="step04-badge step04-badge--rescue">①②でできること</span>
                  <button
                    type="button"
                    className="mandala-modal-btn mandala-modal-btn--ghost step04-reason-remove"
                    onClick={() => onRemove(r.id)}
                  >
                    削除
                  </button>
                </>
              ) : null}
            </div>
            <div className="step04-choices" role="radiogroup" aria-label={`課題${idx + 1}の変えやすさ`}>
              {CHANGEABILITY_OPTIONS.map((o, i) => (
                <label
                  key={o.id}
                  className={`step04-choice${r.changeability === o.id ? ' is-selected' : ''}${
                    i >= 2 ? ' is-defer' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name={`step04-change-${r.id}`}
                    checked={r.changeability === o.id}
                    onChange={() => onSelect(r.id, o.id)}
                  />
                  {MARKS[i]} {o.label}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {progress.needsRescue || hasRescue ? <RescuePanel theme={theme} onAddRescue={onAddRescue} /> : null}

      <div className="step03-phase-actions">
        <button
          type="button"
          className="mandala-modal-btn mandala-modal-btn--primary"
          disabled={!progress.changeabilityReady}
          onClick={onNext}
        >
          「何が変わればよい？」へ
        </button>
        {unanswered > 0 ? (
          <p className="step03-phase-actions-hint">あと {unanswered} 件の課題に回答してください</p>
        ) : progress.needsRescue ? (
          <p className="step03-phase-actions-hint">①②でできることを1つ以上挙げると進めます</p>
        ) : null}
      </div>
    </div>
  );
}
