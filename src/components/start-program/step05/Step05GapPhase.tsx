'use client';

import type { AiControls } from '@/components/start-program/step05/Step05LayersPhase';
import { clipStep05 } from '@/hooks/useStep05DesiredStateStore';
import { STEP05_LAYERS, filledItems, type Step05Theme } from '@/lib/startProgram/step05Constants';
import {
  STEP05_GAP_MAX_CHARS,
  type Step05PlanDraft,
  type Step05PlanProgress,
} from '@/lib/startProgram/step05PlanConstants';

type Step05GapPhaseProps = {
  theme: Step05Theme;
  progress: Step05PlanProgress;
  patchPlan: (fn: (p: Step05PlanDraft) => Step05PlanDraft) => void;
  gapsAi: AiControls;
  onNext: () => void;
};

/** ⑥ 違いを見る：目標 ⇄ 今の自分 の違いを書き、各方向から重点を1つ選ぶ */
export default function Step05GapPhase({ theme, progress, patchPlan, gapsAi, onNext }: Step05GapPhaseProps) {
  const slot = theme.ai.gaps;
  const items = filledItems(theme);
  const plan = theme.plan;
  const leftGaps = items.filter((i) => !(plan.gaps[i.id] ?? '').trim()).length;
  const leftFocus = STEP05_LAYERS.filter((l) => !items.some((i) => i.id === plan.focus[l.key])).length;

  const setGap = (id: string, text: string) => patchPlan((p) => ({ ...p, gaps: { ...p.gaps, [id]: text } }));

  return (
    <div className="step05-gap">
      <h2 className="seven-steps-worksheet-heading">目標と今の自分の「違い」は、何ですか？</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        違いは、これから伸びていく「伸びしろ」です。項目ごとに一文で書き、各方向から「ここが変わると、全体が動きそう」なものを
        ◎ 重点として1つ選びましょう。しるしを付けるのは重点の3つだけです。
      </p>

      {slot.status === 'error' ? (
        <p className="step04-dd-notice is-error" role="alert">
          下書きを準備できませんでした。
          <button type="button" className="step04-dd-link" onClick={gapsAi.retry}>
            もう一度
          </button>
        </p>
      ) : null}
      {slot.refreshedNotice && slot.status !== 'loading' ? (
        <p className="step04-dd-notice" role="status">
          目標や今の自分が変わったため、下書きを更新しました。
          <button type="button" className="step04-dd-link" onClick={gapsAi.dismissNotice}>
            閉じる
          </button>
        </p>
      ) : null}

      <section className="step04-layer-panel" aria-label="違いを見る">
        {STEP05_LAYERS.map((layer) => {
          const list = items.filter((i) => i.layer === layer.key);
          return (
            <section key={layer.key} className={`step04-layer step04-layer--${layer.key} step05-layer`}>
              <h3 className="step04-layer-name step05-layer-name">
                {layer.name}
                <span className="step05-layer-sub">{layer.sub}</span>
              </h3>
              <ol className="step05-items">
                {list.map((item) => {
                  const draft = slot.status === 'loading' ? null : slot.data?.[item.id];
                  const gap = plan.gaps[item.id] ?? '';
                  const isFocus = plan.focus[layer.key] === item.id;
                  return (
                    <li key={item.id} className={`step05-item step05-gap-item${isFocus ? ' is-focus' : ''}`}>
                      <div className="step05-gap-pair">
                        <p className="step05-current-target">
                          <span className="step05-current-tag is-target">目標</span>
                          {item.target}
                        </p>
                        <p className="step05-current-target">
                          <span className="step05-current-tag is-now">今</span>
                          {item.current}
                        </p>
                      </div>
                      <label className="step05-current-label">
                        <span className="step05-current-tag is-gap">違い</span>
                        <textarea
                          className="step04-reason-input step05-item-input"
                          rows={2}
                          value={gap}
                          maxLength={STEP05_GAP_MAX_CHARS}
                          placeholder="目標と今の違いを一文で"
                          onChange={(e) => setGap(item.id, clipStep05(e.target.value, 'gap'))}
                        />
                      </label>
                      {draft ? (
                        <button
                          type="button"
                          className={`step04-dd-pill step05-draft${gap === draft ? ' is-selected' : ''}`}
                          onClick={() => setGap(item.id, clipStep05(draft, 'gap'))}
                        >
                          下書き：{draft}
                        </button>
                      ) : slot.status === 'loading' ? (
                        <span className="step04-dd-skeleton-pill step05-draft-skeleton" aria-hidden />
                      ) : null}
                      <label className="step05-focus-radio">
                        <input
                          type="radio"
                          name={`focus-${layer.key}`}
                          checked={isFocus}
                          onChange={() => patchPlan((p) => ({ ...p, focus: { ...p.focus, [layer.key]: item.id } }))}
                        />
                        ◎ {layer.name}の重点にする
                      </label>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </section>

      <div className="step03-phase-actions">
        <button
          type="button"
          className="mandala-modal-btn mandala-modal-btn--primary"
          disabled={!progress.gapReady}
          onClick={onNext}
        >
          到達のしるしへ
        </button>
        {!progress.gapReady ? (
          <p className="step03-phase-actions-hint">
            {[leftGaps > 0 ? `違いがあと ${leftGaps} 項目` : '', leftFocus > 0 ? `重点があと ${leftFocus} 方向` : '']
              .filter(Boolean)
              .join('、')}
            です
          </p>
        ) : null}
      </div>
    </div>
  );
}
