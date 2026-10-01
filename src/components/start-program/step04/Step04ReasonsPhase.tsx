'use client';

import { useState } from 'react';
import {
  STEP04_REASON_MAX_CHARS,
  initialReasons,
  type Step04Theme,
} from '@/lib/startProgram/step04Constants';

type Step04ReasonsPhaseProps = {
  theme: Step04Theme | undefined;
  domainLabel: string;
  isStep3Focus: boolean;
  score: number | null;
  wishes: string[];
  reasonMin: number;
  reasonMax: number;
  onOpenThemeModal: () => void;
  onAdd: (text: string) => void;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  onNext: () => void;
};

/** 課題の明確化：選択領域の確認・切り替え ＋ 満足度の理由の書き出し */
export default function Step04ReasonsPhase({
  theme,
  domainLabel,
  isStep3Focus,
  score,
  wishes,
  reasonMin,
  reasonMax,
  onOpenThemeModal,
  onAdd,
  onUpdate,
  onRemove,
  onNext,
}: Step04ReasonsPhaseProps) {
  const [draft, setDraft] = useState('');
  const reasons = theme?.reasons.filter((r) => r.origin === 'initial') ?? [];
  const filledCount = initialReasons(theme).length;
  const atMax = reasons.length >= reasonMax;
  const remaining = Math.max(0, reasonMin - filledCount);

  const submit = () => {
    if (!draft.trim() || atMax) return;
    onAdd(draft);
    setDraft('');
  };

  return (
    <div className="step04-reasons">
      <h2 className="seven-steps-worksheet-heading">選択領域</h2>
      <section className={`step04-selected${theme ? '' : ' is-empty'}`} aria-label="選択中の領域">
        <div className="step04-selected-main">
          {theme ? (
            <>
              <p className="step04-selected-label">
                {isStep3Focus ? 'Step3 で決めた取組領域' : '選択中のテーマ領域'}
              </p>
              <p className="step04-selected-name">
                {domainLabel}
                <span className="step04-selected-score">満足度 {score != null ? `${score}/10` : '—'}</span>
              </p>
            </>
          ) : (
            <p className="step04-selected-empty">テーマ領域が選択されていません</p>
          )}
        </div>
        <button
          type="button"
          className={`mandala-modal-btn ${theme ? '' : 'mandala-modal-btn--primary'}`}
          onClick={onOpenThemeModal}
        >
          {theme ? 'テーマを切り替える' : 'テーマを選ぶ'}
        </button>
        {theme && wishes.length > 0 ? (
          <details className="step04-context-wishes">
            <summary>Step1 で書いた「こうなりたい」を見る</summary>
            <ul>
              {wishes.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        Step3 で決めた取組領域から始めるのがおすすめです。Step3
        がまだの場合も、ここで領域を選べば進められます。1つのテーマが終わったら、別の領域をテーマにして続けることもできます。
      </p>

      {theme ? (
        <>
          <h2 className="seven-steps-worksheet-heading">なぜ、この満足度になっていると思いますか？</h2>
          <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
            「{domainLabel}」の満足度が{score != null ? ` ${score}点 ` : 'いまの点数'}
            になっている理由を、思いつくままに {reasonMin}〜{reasonMax} 個挙げてください。正解はありません。
          </p>

          <ol className="step04-reason-list">
            {reasons.map((r, i) => (
              <li key={r.id} className="step04-reason-row">
                <span className="step04-reason-no">{i + 1}</span>
                <textarea
                  className="step04-reason-input"
                  rows={2}
                  value={r.text}
                  maxLength={STEP04_REASON_MAX_CHARS}
                  aria-label={`理由${i + 1}`}
                  onChange={(e) => onUpdate(r.id, e.target.value)}
                />
                <button
                  type="button"
                  className="mandala-modal-btn mandala-modal-btn--ghost step04-reason-remove"
                  aria-label={`理由${i + 1}を削除`}
                  onClick={() => onRemove(r.id)}
                >
                  削除
                </button>
              </li>
            ))}
          </ol>

          <div className="step04-reason-add">
            <textarea
              className="step04-reason-input"
              rows={2}
              value={draft}
              maxLength={STEP04_REASON_MAX_CHARS}
              disabled={atMax}
              placeholder={atMax ? `上限（${reasonMax}個）に達しました` : '例：やりたい仕事を任せてもらえていない'}
              aria-label="理由を追加"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <button
              type="button"
              className="mandala-modal-btn mandala-modal-btn--secondary"
              disabled={atMax || !draft.trim()}
              onClick={submit}
            >
              追加
            </button>
          </div>

          <p className="step04-count" aria-live="polite">
            {filledCount} / {reasonMax} 個
            {remaining > 0 ? `（あと ${remaining} 個で次へ進めます）` : ''}
          </p>

          <div className="step03-phase-actions">
            <button
              type="button"
              className="mandala-modal-btn mandala-modal-btn--primary"
              disabled={remaining > 0}
              onClick={onNext}
            >
              「変えられるか」へ
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
