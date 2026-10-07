'use client';

import { useEffect, useRef, useState } from 'react';
import {
  STEP04_LAYERS,
  STEP04_OTHER_MAX_CHARS,
  actionableReasons,
  changeabilityLabel,
  deferredReasons,
  reasonLayersDone,
  type LayerKey,
  type LayerTagId,
  type Step04Progress,
  type Step04Theme,
} from '@/lib/startProgram/step04Constants';

type Step04LayersPhaseProps = {
  theme: Step04Theme;
  progress: Step04Progress;
  onToggle: (id: string, layer: LayerKey, tag: LayerTagId) => void;
  onOtherText: (id: string, layer: LayerKey, text: string) => void;
  onNext: () => void;
};

export default function Step04LayersPhase({
  theme,
  progress,
  onToggle,
  onOtherText,
  onNext,
}: Step04LayersPhaseProps) {
  const targets = actionableReasons(theme);
  const deferredCount = deferredReasons(theme).length;
  const [selectedId, setSelectedId] = useState<string | null>(targets[0]?.id ?? null);

  useEffect(() => {
    if (!targets.some((r) => r.id === selectedId)) setSelectedId(targets[0]?.id ?? null);
  }, [selectedId, targets]);

  const index = targets.findIndex((r) => r.id === selectedId);
  const reason = index >= 0 ? targets[index] : undefined;
  const doneCount = targets.filter(reasonLayersDone).length;
  const needsBe = progress.layersFilled && !progress.hasAnyBe;
  const beRef = useRef<HTMLFieldSetElement>(null);
  const [beFocusTick, setBeFocusTick] = useState(0);

  useEffect(() => {
    if (beFocusTick === 0) return;
    beRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [beFocusTick]);

  const focusBe = (id: string) => {
    setSelectedId(id);
    setBeFocusTick((n) => n + 1);
  };

  return (
    <div className="step04-layers">
      <h2 className="seven-steps-worksheet-heading">自分の何が変われば、今より満足度が上がりそうですか？</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        ①②を選んだ課題ごとに、「持ち方・なし方・あり方」の3方向から見てみましょう。当てはまるものは複数選べます。各課題でどれか1つ以上選べば次へ進めます。
      </p>

      <div className="step04-layer-tabs" role="tablist" aria-label="課題の切り替え">
        {targets.map((r, i) => {
          const done = reasonLayersDone(r);
          return (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={r.id === selectedId}
              className={`step04-layer-tab${r.id === selectedId ? ' is-active' : ''}${done ? ' is-done' : ''}`}
              title={r.text}
              onClick={() => setSelectedId(r.id)}
            >
              課題{i + 1}
              {done ? <span className="step02-phase-nav-check">✓</span> : null}
            </button>
          );
        })}
      </div>
      <p className="step04-count">
        記入済み {doneCount} / {targets.length}
      </p>

      {reason ? (
        <section className="step04-layer-panel" aria-label={`課題${index + 1}`}>
          <div className="step04-layer-reason">
            <p className="step04-card-text">{reason.text}</p>
            <span className="step04-badge">{changeabilityLabel(reason.changeability)}</span>
          </div>

          {STEP04_LAYERS.map((layer) => {
            const selected = reason.tags[layer.key];
            const otherSelected = selected.some((t) => t.endsWith('_other'));
            return (
              <fieldset
                key={layer.key}
                ref={layer.key === 'be' ? beRef : undefined}
                className={`step04-layer step04-layer--${layer.key}${
                  layer.key === 'be' && needsBe ? ' is-attention' : ''
                }`}
              >
                <legend className="step04-layer-name">
                  {layer.name}：{layer.description}
                </legend>
                <p className="step04-layer-question">{layer.question}</p>
                {layer.key === 'be' ? (
                  <p className="step04-layer-note">
                    考え方の良し悪しを決めるものではありません。このあとの探索の「入口」として使います。
                  </p>
                ) : null}
                <div className="step04-options">
                  {layer.options.map((o) => {
                    const checked = selected.includes(o.id);
                    return (
                      <label key={o.id} className={`step04-option${checked ? ' is-selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggle(reason.id, layer.key, o.id)}
                        />
                        <span className="step04-option-label">{o.label}</span>
                        {!o.isOther ? <span className="step04-option-examples">{o.examples}</span> : null}
                      </label>
                    );
                  })}
                </div>
                {otherSelected ? (
                  <input
                    type="text"
                    className="step04-other-input"
                    value={reason.otherText[layer.key]}
                    maxLength={STEP04_OTHER_MAX_CHARS}
                    placeholder="その他の内容を入力"
                    aria-label={`${layer.name}のその他`}
                    onChange={(e) => onOtherText(reason.id, layer.key, e.target.value)}
                  />
                ) : null}
              </fieldset>
            );
          })}

          <div className="step04-layer-pager">
            <button
              type="button"
              className="mandala-modal-btn"
              disabled={index <= 0}
              onClick={() => setSelectedId(targets[index - 1]?.id ?? null)}
            >
              ← 前の課題
            </button>
            <button
              type="button"
              className="mandala-modal-btn"
              disabled={index >= targets.length - 1}
              onClick={() => setSelectedId(targets[index + 1]?.id ?? null)}
            >
              次の課題 →
            </button>
          </div>
        </section>
      ) : null}

      {deferredCount > 0 ? (
        <p className="step04-deferred-note">保留にした課題（③④）{deferredCount} 件は、後のステップで取り上げます。</p>
      ) : null}

      {needsBe ? (
        <section className="step04-be-guard" role="status" aria-label="あり方の選択のお願い">
          <p className="step04-be-guard-title">「あり方」が、まだどの課題にも選ばれていません</p>
          <p className="step04-be-guard-body">
            次の「こころの深掘り」は、あり方を入口に進めます。ぴったり当てはまらなくても大丈夫です。
            <strong>強いて言えば</strong>近いものを、どれか1つの課題で選んでみてください（あとで変更できます）。
          </p>
          <ul className="step04-be-guard-hints">
            <li>その課題に取りかかる前、頭の中でどんな言葉がよぎりますか？</li>
            <li>うまくいかなかった時、自分にどんな言葉をかけていますか？</li>
            <li>親しい人が同じ状況なら、「〇〇と思い込んでいるのかも」と言えそうなことは？</li>
          </ul>
          <div className="step04-be-guard-actions">
            {targets.map((r, i) => (
              <button key={r.id} type="button" className="mandala-modal-btn" title={r.text} onClick={() => focusBe(r.id)}>
                課題{i + 1}のあり方を選ぶ
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="step03-phase-actions">
        <button
          type="button"
          className="mandala-modal-btn mandala-modal-btn--primary"
          disabled={!progress.layersReady}
          onClick={onNext}
        >
          こころの深掘りへ
        </button>
        {needsBe ? (
          <p className="step03-phase-actions-hint">どれか1つの課題で「あり方」を選ぶと進めます</p>
        ) : !progress.layersReady ? (
          <p className="step03-phase-actions-hint">
            あと {targets.length - doneCount} 件の課題で、どれか1つ以上を選んでください
          </p>
        ) : null}
      </div>
    </div>
  );
}
