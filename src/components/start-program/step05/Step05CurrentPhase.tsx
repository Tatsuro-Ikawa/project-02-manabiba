'use client';

import type { AiControls } from '@/components/start-program/step05/Step05LayersPhase';
import { clipStep05 } from '@/hooks/useStep05DesiredStateStore';
import {
  STEP05_CURRENT_MAX_CHARS,
  STEP05_LAYERS,
  filledItems,
  type Step05Progress,
  type Step05Theme,
} from '@/lib/startProgram/step05Constants';

type Step05CurrentPhaseProps = {
  theme: Step05Theme;
  score: number | null;
  progress: Step05Progress;
  onCurrent: (itemId: string, text: string) => void;
  currentsAi: AiControls;
  onNext: () => void;
};

export default function Step05CurrentPhase({
  theme,
  score,
  progress,
  onCurrent,
  currentsAi,
  onNext,
}: Step05CurrentPhaseProps) {
  const slot = theme.ai.currents;
  const items = filledItems(theme);
  const left = items.filter((i) => !i.current.trim()).length;

  return (
    <div className="step05-current">
      <h2 className="seven-steps-worksheet-heading">目標と比べて、今のあなたはどんな状態ですか？</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        目標の項目ごとに、満足度 {score ?? '—'}{' '}
        の「今の自分」を一文で書きましょう。最初は曖昧で大丈夫です。あとから何度でも直せます。AI
        の下書きを押すと欄に入ります。
      </p>

      {slot.status === 'error' ? (
        <p className="step04-dd-notice is-error" role="alert">
          下書きを準備できませんでした。
          <button type="button" className="step04-dd-link" onClick={currentsAi.retry}>
            もう一度
          </button>
        </p>
      ) : null}
      {slot.refreshedNotice && slot.status !== 'loading' ? (
        <p className="step04-dd-notice" role="status">
          目標が変わったため、下書きを更新しました。
          <button type="button" className="step04-dd-link" onClick={currentsAi.dismissNotice}>
            閉じる
          </button>
        </p>
      ) : null}

      <section className="step04-layer-panel" aria-label="現在の姿">
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
                  return (
                    <li key={item.id} className="step05-item step05-current-item">
                      <p className="step05-current-target">
                        <span className="step05-current-tag is-target">目標</span>
                        {item.target}
                      </p>
                      <label className="step05-current-label">
                        <span className="step05-current-tag is-now">今の自分</span>
                        <textarea
                          className="step04-reason-input step05-item-input"
                          rows={2}
                          value={item.current}
                          maxLength={STEP05_CURRENT_MAX_CHARS}
                          placeholder="今の自分を一文で"
                          onChange={(e) => onCurrent(item.id, clipStep05(e.target.value, 'current'))}
                        />
                      </label>
                      {draft ? (
                        <button
                          type="button"
                          className={`step04-dd-pill step05-draft${item.current === draft ? ' is-selected' : ''}`}
                          onClick={() => onCurrent(item.id, clipStep05(draft, 'current'))}
                        >
                          下書き：{draft}
                        </button>
                      ) : slot.status === 'loading' ? (
                        <span className="step04-dd-skeleton-pill step05-draft-skeleton" aria-hidden />
                      ) : null}
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
          disabled={!progress.currentReady}
          onClick={onNext}
        >
          見える化する
        </button>
        {left > 0 ? <p className="step03-phase-actions-hint">あと {left} 項目です</p> : null}
      </div>
    </div>
  );
}
