'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ScoreScale } from '@/components/start-program/step05/Step05Parts';
import { STEP04_LAYERS, getLayerOption, type ReasonEntry } from '@/lib/startProgram/step04Constants';
import { targetScoresAbove, type Step05Theme, type TargetScore } from '@/lib/startProgram/step05Constants';
import type { Step05Context, Step05Insight } from '@/lib/startProgram/step05Context';

type ReviewKey = 'desired' | 'self' | 'current' | 'brake';

type Step05ReviewPhaseProps = {
  ctx: Step05Context;
  theme: Step05Theme;
  onTargetScore: (score: TargetScore) => void;
  onConfirm: () => void;
};

const ILLUST = '/start-program/seven-steps/step05/illustrations';

function RelCard({ label, image, onClick }: { label: string; image: string; onClick: () => void }) {
  return (
    <button type="button" className="step05-rel-card" onClick={onClick}>
      <span className="step05-rel-card-illust">
        <img src={image} alt="" className="step05-rel-card-img" />
      </span>
      <span className="step05-rel-card-label">{label}</span>
    </button>
  );
}

function ScoreBadge({ value, caption }: { value: number | string | null; caption: string }) {
  return (
    <span className="step05-rel-score">
      <span className="step05-rel-score-caption">{caption}</span>
      <strong className="step05-rel-score-value">{value ?? ''}</strong>
    </span>
  );
}

/** 枠幅に合わせて関係図全体を縮小し、左右が切れないようにする */
function RelFit({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, height: 0 });

  useEffect(() => {
    const frame = frameRef.current;
    const sheet = sheetRef.current;
    if (!frame || !sheet) return;
    const update = () => {
      const available = frame.clientWidth;
      const needed = sheet.scrollWidth;
      const height = sheet.offsetHeight;
      const scale = needed > available && available > 0 ? available / needed : 1;
      setFit((prev) => (prev.scale === scale && prev.height === height ? prev : { scale, height }));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  const scaled = fit.scale < 0.999;
  return (
    <div ref={frameRef} className="step05-rel-fit">
      <div
        ref={sheetRef}
        className="step05-rel-grid"
        style={
          scaled
            ? { transform: `scale(${fit.scale})`, marginBottom: (fit.scale - 1) * fit.height }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}

function layerGroups(reason: ReasonEntry): { name: string; labels: string[] }[] {
  return STEP04_LAYERS.map((layer) => {
    const labels = reason.tags[layer.key].map((tagId) => {
      const opt = getLayerOption(tagId)?.option;
      if (opt?.isOther) return reason.otherText[layer.key].trim() || 'その他';
      return opt?.label ?? tagId;
    });
    return { name: layer.name, labels };
  }).filter((g) => g.labels.length > 0);
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="step05-ref-empty">{empty}</p>;
  return (
    <ul className="step05-review-bullets">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function ReasonLayers({ reason }: { reason: ReasonEntry }) {
  const groups = layerGroups(reason);
  if (groups.length === 0) return null;
  return (
    <div className="step05-review-layers">
      {groups.map((g) => (
        <div key={g.name} className="step05-review-layer">
          <span className="step05-review-layer-name">{g.name}</span>
          <div className="step05-review-layer-labels">
            {g.labels.map((label, i) => (
              <span key={`${g.name}-${i}`}>{label}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DesiredBody({ ctx }: { ctx: Step05Context }) {
  return (
    <>
      <p className="step05-review-modal-lead">
        「望む姿」 <span className="step05-ref-src">Step1で記載した内容です。</span>
      </p>
      <div className="step05-review-block">
        <p className="step05-ref-sub">人生の中心目標</p>
        <p className="step05-review-indent">{ctx.centerGoal.trim() || '（未記入）'}</p>
      </div>
      <div className="step05-review-block">
        <p className="step05-ref-sub">テーマ：{ctx.domainLabel}での望み</p>
        <BulletList items={ctx.wishes} empty={`${ctx.domainLabel}の願いは未記入です`} />
      </div>
    </>
  );
}

function SelfBody({ ctx }: { ctx: Step05Context }) {
  return (
    <>
      <p className="step05-review-modal-lead">
        「自分らしさ」{' '}
        <span className="step05-ref-src">Step2で設定した私の表現（選択・行動・態度）方法</span>
      </p>
      {(
        [
          ['interest', '私の興味・関心の表現方法'],
          ['values', '私の価値観の表現方法'],
          ['strength', '私の強みの表現方法'],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="step05-review-block">
          <p className="step05-ref-sub">{label}</p>
          <BulletList items={ctx.self[key]} empty="（Step2 の文は未記入）" />
        </div>
      ))}
    </>
  );
}

function CurrentBody({ ctx }: { ctx: Step05Context }) {
  return (
    <>
      <p className="step05-review-modal-lead">
        「現在の姿」 <span className="step05-ref-src">Step3と4で設定した内容です</span>
      </p>
      <p className="step05-ref-lead">
        テーマ　{ctx.domainLabel}　満足度 {ctx.score ?? '—'}/10
      </p>
      <p className="step05-review-section-label">満足度をアップさせるために項目別に必要な内容</p>
      {ctx.reasons.length === 0 ? (
        <p className="step05-ref-empty">課題はまだありません</p>
      ) : (
        <ul className="step05-review-reason-list">
          {ctx.reasons.map((r) => (
            <li key={r.id}>
              <p className="step05-review-reason-text">・{r.text}</p>
              <ReasonLayers reason={r} />
            </li>
          ))}
        </ul>
      )}
      {ctx.deferred.length > 0 ? (
        <details className="step05-ref-deferred">
          <summary>▼自分では対応できない課題（{ctx.deferred.length}件）</summary>
          <ul className="step05-review-bullets">
            {ctx.deferred.map((r) => (
              <li key={r.id}>{r.text}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

function BrakeBody({ insights }: { insights: Step05Insight[] }) {
  return (
    <>
      <p className="step05-review-modal-lead">
        「心のブレーキ」 <span className="step05-ref-src">Step4で深掘りした内容</span>
      </p>
      <p className="step05-review-section-label">課題ごとに深掘りして見つけた心のブレーキ</p>
      {insights.length === 0 ? (
        <p className="step05-ref-empty">保存した気づきはまだありません</p>
      ) : (
        insights.map((insight, index) => (
          <div key={insight.reasonId} className="step05-review-block step05-review-brake-item">
            <p className="step05-ref-sub">課題{index + 1}</p>
            <p className="step05-review-indent">{insight.reasonText}</p>
            {insight.workings.length > 0 ? (
              <div className="step05-review-brake-pair">
                <p className="step05-review-brake-label">こころの働き：</p>
                {insight.workings.map((w) => (
                  <p key={w} className="step05-review-indent step05-ref-working">
                    {w}
                  </p>
                ))}
              </div>
            ) : null}
            {insight.ownWords ? (
              <div className="step05-review-brake-pair">
                <p className="step05-review-brake-label">こころのブレーキ：</p>
                <p className="step05-review-indent step05-ref-words">「{insight.ownWords}」</p>
              </div>
            ) : null}
          </div>
        ))
      )}
    </>
  );
}

function ReviewModal({
  openKey,
  ctx,
  onClose,
}: {
  openKey: ReviewKey;
  ctx: Step05Context;
  onClose: () => void;
}) {
  const titleId = useId();
  const titles: Record<ReviewKey, string> = {
    desired: '望む姿',
    self: '自分らしさ',
    current: '現在の姿',
    brake: '心のブレーキ',
  };

  return (
    <div
      className="mandala-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mandala-modal step05-review-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="mandala-modal-header">
          <h3 id={titleId} className="mandala-modal-title">
            {titles[openKey]}
          </h3>
          <button type="button" className="mandala-modal-close" onClick={onClose} aria-label="閉じる">
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>
        <div className="mandala-modal-input-wrap step05-review-modal-body">
          {openKey === 'desired' ? <DesiredBody ctx={ctx} /> : null}
          {openKey === 'self' ? <SelfBody ctx={ctx} /> : null}
          {openKey === 'current' ? <CurrentBody ctx={ctx} /> : null}
          {openKey === 'brake' ? <BrakeBody insights={ctx.insights} /> : null}
        </div>
        <footer className="mandala-modal-footer">
          <button type="button" className="mandala-modal-btn mandala-modal-btn--secondary" onClick={onClose}>
            閉じる
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function Step05ReviewPhase({ ctx, theme, onTargetScore, onConfirm }: Step05ReviewPhaseProps) {
  const [openKey, setOpenKey] = useState<ReviewKey | null>(null);
  const choices = targetScoresAbove(ctx.score);
  const targetReady = choices.includes(theme.targetScore);

  return (
    <div className="step05-review">
      <h2 className="seven-steps-worksheet-heading">ここまでのあなたを振り返りましょう</h2>
      <p className="seven-steps-worksheet-body">
        Step1〜4 で見つけた「望む姿」「自分らしさ」「現状」「こころのブレーキ」を
        <span className="step05-review-em">関係図</span>
        としてまとめてみました。それぞれの
        <span className="step05-review-em">画像</span>
        を選択するとあなたが見つけてきた内容が示されます。
      </p>
      <p className="seven-steps-worksheet-body">
        このステップでは、現状の満足度に対して、それより高い満足度になるような姿を明確にしていきます。
        まずは、今まで見つけてきた内容を確かめて、満足度を設定しましょう。
      </p>

      <section className="step05-rel" aria-label="こころと状況の関係図">
        <h3 className="step05-rel-title">こころと状況の関係図</h3>
        <RelFit>
          <div className="step05-rel-desired">
            <RelCard
              label="「望む姿」を見る"
              image={`${ILLUST}/desired.png`}
              onClick={() => setOpenKey('desired')}
            />
          </div>
          <div className="step05-rel-target">
            <ScoreBadge value={targetReady ? theme.targetScore : null} caption="満足度" />
          </div>

          <div className="step05-rel-self">
            <RelCard
              label="「自分らしさ」を見る"
              image={`${ILLUST}/self.png`}
              onClick={() => setOpenKey('self')}
            />
          </div>
          <div className="step05-rel-up">
            <img src={`${ILLUST}/arrow-up.png`} alt="" className="step05-rel-arrow-img" />
            <span className="step05-rel-arrow-label">近づく</span>
          </div>
          <div className="step05-rel-right">
            <div className="step05-rel-down">
              <span className="step05-rel-arrow-label">遠ざかる</span>
              <img src={`${ILLUST}/arrow-down.png`} alt="" className="step05-rel-arrow-img" />
            </div>
            <RelCard
              label="「ブレーキ」を見る"
              image={`${ILLUST}/brake.png`}
              onClick={() => setOpenKey('brake')}
            />
          </div>

          <div className="step05-rel-now">
            <ScoreBadge value={ctx.score} caption="満足度" />
          </div>
          <div className="step05-rel-current">
            <RelCard
              label="「現状」を見る"
              image={`${ILLUST}/current.png`}
              onClick={() => setOpenKey('current')}
            />
          </div>
        </RelFit>
      </section>

      <section className="step04-layer-panel step05-target" aria-label="目指す満足度">
        <h3 className="step05-section-title">目指す満足度</h3>
        <p className="step04-layer-question step05-review-ul">
          {ctx.domainLabel}の満足度を、どこまで上げたいですか？
          下記のスケールの内、目指す満足度を選択してください。
        </p>
        {choices.length === 0 ? (
          <p className="step05-ref-empty">現状の満足度が 10 のため、これより上の目標は選べません。</p>
        ) : (
          <ScoreScale current={ctx.score} target={theme.targetScore} onSelect={onTargetScore} />
        )}
        <p className="step05-target-question">
          {ctx.domainLabel}の満足度が {targetReady ? theme.targetScore : '—'}{' '}
          になったとき、あなたはどんな毎日を過ごしていますか？
          次の画面で、3つの方向から描いていきましょう。
        </p>
      </section>

      <div className="step03-phase-actions">
        <button
          type="button"
          className="mandala-modal-btn mandala-modal-btn--primary"
          disabled={!targetReady}
          onClick={onConfirm}
        >
          この満足度を目指して、目標を描く
        </button>
      </div>

      {openKey ? <ReviewModal openKey={openKey} ctx={ctx} onClose={() => setOpenKey(null)} /> : null}
    </div>
  );
}
