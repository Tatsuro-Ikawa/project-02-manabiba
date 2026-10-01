'use client';

import {
  STEP04_LAYERS,
  actionableReasons,
  changeabilityLabel,
  deferredReasons,
  getLayerOption,
  type BeTagId,
  type ReasonEntry,
  type Step04Theme,
} from '@/lib/startProgram/step04Constants';

type Step04SummaryPhaseProps = {
  theme: Step04Theme;
  domainLabel: string;
  onComplete: (done: boolean) => void;
  onChooseNextTheme: () => void;
};

function tagLabels(reason: ReasonEntry, key: 'have' | 'do' | 'be'): string[] {
  return reason.tags[key].map((id) => {
    const opt = getLayerOption(id)?.option;
    if (opt?.isOther) {
      const t = reason.otherText[key].trim();
      return t ? `その他：${t}` : 'その他';
    }
    return opt?.label ?? id;
  });
}

export default function Step04SummaryPhase({
  theme,
  domainLabel,
  onComplete,
  onChooseNextTheme,
}: Step04SummaryPhaseProps) {
  const actionable = actionableReasons(theme);
  const deferred = deferredReasons(theme);
  const completed = theme.completedAt != null;

  const beCounts = new Map<BeTagId, number>();
  for (const r of actionable) {
    for (const id of r.tags.be) beCounts.set(id as BeTagId, (beCounts.get(id as BeTagId) ?? 0) + 1);
  }
  const beEntry = [...beCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="step04-summary">
      <h2 className="seven-steps-worksheet-heading">整理した結果</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        「{domainLabel}」について、満足度の理由（課題）を「持ち方・なし方・あり方」で整理しました。
      </p>

      <section aria-label="①②の課題">
        <h3 className="step03-sat-section-label">自分から変えられそうな課題</h3>
        <ol className="step04-cards">
          {actionable.map((r, i) => (
            <li key={r.id} className="step04-card">
              <div className="step04-card-head">
                <span className="step04-reason-no">{i + 1}</span>
                <p className="step04-card-text">{r.text}</p>
                <span className="step04-badge">{changeabilityLabel(r.changeability)}</span>
              </div>
              <dl className="step04-summary-layers">
                {STEP04_LAYERS.map((layer) => {
                  const labels = tagLabels(r, layer.key);
                  return (
                    <div key={layer.key} className={`step04-summary-layer step04-layer--${layer.key}`}>
                      <dt>{layer.name}</dt>
                      <dd>
                        {labels.length > 0 ? (
                          labels.map((l) => (
                            <span key={l} className="step04-tag">
                              {l}
                            </span>
                          ))
                        ) : (
                          <span className="step04-summary-empty">—</span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </li>
          ))}
        </ol>
      </section>

      {deferred.length > 0 ? (
        <section aria-label="保留した課題" className="step04-summary-deferred">
          <h3 className="step03-sat-section-label">
            一旦保留した課題
            <span className="step03-sat-section-hint">目標設定やあり方の見直しの段階で、必要に応じて取り上げます。</span>
          </h3>
          <ul>
            {deferred.map((r) => (
              <li key={r.id}>
                {r.text}
                <span className="step04-summary-deferred-kind">（{changeabilityLabel(r.changeability)}）</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="step04-ai-placeholder" aria-label="こころのブレーキの探索">
        <h3 className="step04-ai-title">次は、こころのブレーキの探索です（準備中）</h3>
        {beEntry.length > 0 ? (
          <>
            <p>「あり方」で選んだ次の項目を入口に、Ai が質問をしながら一緒に探っていきます。</p>
            <ul className="step04-ai-tags">
              {beEntry.map(([id, n]) => (
                <li key={id} className="step04-tag step04-tag--be">
                  {getLayerOption(id)?.option.label}
                  {n > 1 ? ` ×${n}` : ''}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>
            今回は「あり方」の選択がありませんでした。持ち方・なし方の整理をもとに進めることもできます。必要なら前のプロセスに戻って「あり方」も見てみましょう。
          </p>
        )}
      </section>

      <div className="step03-phase-actions">
        {completed ? (
          <>
            <span className="step04-complete-badge">このテーマの整理は完了しています</span>
            <button type="button" className="mandala-modal-btn" onClick={() => onComplete(false)}>
              完了を取り消す
            </button>
          </>
        ) : (
          <button
            type="button"
            className="mandala-modal-btn mandala-modal-btn--primary"
            onClick={() => onComplete(true)}
          >
            このテーマの整理を完了する
          </button>
        )}
        <button type="button" className="mandala-modal-btn mandala-modal-btn--secondary" onClick={onChooseNextTheme}>
          別の領域でも取り組む
        </button>
      </div>
    </div>
  );
}
