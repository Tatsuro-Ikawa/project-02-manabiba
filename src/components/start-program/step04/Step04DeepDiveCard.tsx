'use client';

import type { ReactNode } from 'react';
import { PillList } from '@/components/start-program/step04/Step04DeepDiveParts';
import {
  beTagLabels,
  picks,
  workingRatingLabel,
  type AiStatus,
  type DeepDiveEntry,
} from '@/lib/startProgram/step04DeepDiveConstants';
import type { ReasonEntry } from '@/lib/startProgram/step04Constants';

export type DeepDiveStage = 'entry' | 'inner' | 'working';

type Step04DeepDiveCardProps = {
  index: number;
  reason: ReasonEntry;
  dd: DeepDiveEntry;
  onExplore: (stage: DeepDiveStage) => void;
  onSaveInsight: () => void;
};

type ExploreButtonProps = {
  enabled: boolean;
  done: boolean;
  isNext: boolean;
  status: AiStatus;
  lockedHint: string;
  onClick: () => void;
};

function ExploreButton({ enabled, done, isNext, status, lockedHint, onClick }: ExploreButtonProps) {
  return (
    <button
      type="button"
      className={`step04-dd-explore${done ? ' is-done' : ''}${isNext ? ' is-next' : ''}`}
      disabled={!enabled}
      title={!enabled ? lockedHint : undefined}
      onClick={onClick}
    >
      探る
      {done ? <span aria-label="完了"> ✓</span> : null}
      {enabled && !done && status === 'loading' ? <span className="step04-dd-spinner" aria-label="準備中" /> : null}
    </button>
  );
}

function Row({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="step04-dd-row">
      <span className="step04-dd-row-label">{label}：</span>
      <span className="step04-dd-row-value">{children}</span>
    </div>
  );
}

export default function Step04DeepDiveCard({ index, reason, dd, onExplore, onSaveInsight }: Step04DeepDiveCardProps) {
  const entryDone = dd.entry.savedAt != null;
  const innerDone = dd.inner.savedAt != null;
  const workingDone = dd.working.savedAt != null;
  const voices = [...picks(dd.inner.voice), ...(dd.inner.voiceOwnWords ? [dd.inner.voiceOwnWords] : [])];
  const hypotheses = dd.working.hypotheses.data ?? [];
  const closeOnes = hypotheses.filter((h) => dd.working.ratings[h.id] === 'strong' || dd.working.ratings[h.id] === 'some');
  const strongOnes = hypotheses.filter((h) => dd.working.ratings[h.id] === 'strong');

  const flowScene = picks(dd.entry.scene)[0];
  const flowVoice = voices[0] ?? picks(dd.inner.feeling)[0];
  const flowAction = picks(dd.entry.action)[0];
  const seenWorkings = (strongOnes.length > 0 ? strongOnes : closeOnes).map((h) => h.title);

  return (
    <article className="step04-dd-card" aria-label={`課題${index}`}>
      <header className="step04-dd-card-head">
        <span className="step04-reason-no">{index}</span>
        <p className="step04-dd-card-reason">{reason.text}</p>
        <div className="step04-dd-card-be">
          <span className="step04-dd-card-be-label">あり方</span>
          <PillList items={beTagLabels(reason)} />
        </div>
      </header>

      <section className="step04-dd-block">
        <h4 className="step04-dd-block-title">深掘り①</h4>
        <Row label="場面">
          <PillList items={picks(dd.entry.scene)} />
        </Row>
        <Row label="行動">
          <PillList items={picks(dd.entry.action)} />
        </Row>
        <div className="step04-dd-block-actions">
          <ExploreButton
            enabled
            done={entryDone}
            isNext={!entryDone}
            status={dd.entry.options.status}
            lockedHint=""
            onClick={() => onExplore('entry')}
          />
        </div>
      </section>

      <section className="step04-dd-block">
        <h4 className="step04-dd-block-title">深掘り②</h4>
        <Row label="気持ち">
          <PillList items={picks(dd.inner.feeling)} />
        </Row>
        <Row label="こころの声">
          <PillList items={voices} quote />
        </Row>
        <Row label="こころの抵抗">
          <PillList items={picks(dd.inner.protection)} />
        </Row>
        <div className="step04-dd-block-actions">
          <ExploreButton
            enabled={entryDone}
            done={innerDone}
            isNext={entryDone && !innerDone}
            status={dd.inner.options.status}
            lockedHint="深掘り①を先に進めてください"
            onClick={() => onExplore('inner')}
          />
        </div>
      </section>

      <section className="step04-dd-block">
        <h4 className="step04-dd-block-title">こころの働き</h4>
        {workingDone ? (
          <>
            {closeOnes.map((h) => (
              <Row key={h.id} label={workingRatingLabel(dd.working.ratings[h.id])}>
                {h.title}
              </Row>
            ))}
            <Row label="あなたの言葉">「{dd.working.ownWords}」</Row>
          </>
        ) : null}
        <div className="step04-dd-block-actions">
          <ExploreButton
            enabled={innerDone}
            done={workingDone}
            isNext={innerDone && !workingDone}
            status={dd.working.hypotheses.status}
            lockedHint="深掘り②を先に進めてください"
            onClick={() => onExplore('working')}
          />
        </div>
      </section>

      {workingDone ? (
        <section className="step04-dd-reflection" aria-label="今回の気づき">
          <h4 className="step04-dd-reflection-title">今回の気づき</h4>
          <dl>
            <dt>取り上げた課題</dt>
            <dd>{reason.text}</dd>
            <dt>その時に起きやすいこと</dt>
            <dd>
              <ol className="step04-dd-flow">
                {flowScene ? <li>{flowScene}</li> : null}
                {flowVoice ? <li>{flowVoice.startsWith('「') ? flowVoice : `「${flowVoice}」`}と感じる</li> : null}
                {flowAction ? <li>{flowAction}</li> : null}
              </ol>
            </dd>
            {seenWorkings.length > 0 ? (
              <>
                <dt>見えてきた心の働き</dt>
                <dd>
                  {seenWorkings.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </dd>
              </>
            ) : null}
            <dt>あなたの言葉</dt>
            <dd className="step04-dd-reflection-words">「{dd.working.ownWords}」</dd>
          </dl>
          <p className="step04-dd-reflection-close">
            この心の働きは、これまであなたを守る役割を果たしてきたものかもしれません。
          </p>
          <div className="step04-dd-block-actions">
            {dd.insightSavedAt != null ? (
              <span className="step04-complete-badge">この気づきは保存済みです ✓</span>
            ) : (
              <button type="button" className="mandala-modal-btn mandala-modal-btn--primary" onClick={onSaveInsight}>
                この気づきを保存する
              </button>
            )}
          </div>
        </section>
      ) : null}
    </article>
  );
}
