'use client';

import { useState } from 'react';
import {
  DeepDiveModalShell,
  PickGroup,
  PillList,
  QuestionBlock,
  circled,
} from '@/components/start-program/step04/Step04DeepDiveParts';
import {
  DEEP_DIVE_OWN_WORDS_MAX_CHARS,
  DEEP_DIVE_REFRESH_MAX,
  DEEP_DIVE_VOICE_OWN_MAX_CHARS,
  WORKING_RATINGS,
  hasPick,
  picks,
  type AiSlot,
  type DeepDiveEntry,
  type EntryOptions,
  type Hypothesis,
  type InnerOptions,
  type PickAnswer,
  type WorkingRating,
} from '@/lib/startProgram/step04DeepDiveConstants';

const MULTI_HINT = '以下の選択肢から選んでみてください（複数回答可）';

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** AI の準備状況に応じて表示する選択肢（失敗時は基本選択肢） */
function shownOptions<T>(slot: AiSlot<T>, fallback: T): T | null {
  if (slot.data) return slot.data;
  if (slot.status === 'error') return fallback;
  return null;
}

type RefreshProps = {
  refreshCount: number;
  loading: boolean;
  onRefresh: () => void;
};

function RefreshButton({ refreshCount, loading, onRefresh }: RefreshProps) {
  const left = DEEP_DIVE_REFRESH_MAX - refreshCount;
  return (
    <button
      type="button"
      className="mandala-modal-btn mandala-modal-btn--secondary"
      disabled={left <= 0 || loading}
      title={left <= 0 ? 'この段階での Ai 更新は上限に達しました' : '選択肢を作り直します（選んだ項目は残ります）'}
      onClick={onRefresh}
    >
      {loading ? 'Ai更新中…' : `Ai更新（残り${Math.max(0, left)}回）`}
    </button>
  );
}

function SlotNotice<T>({ slot, onRetry }: { slot: AiSlot<T>; onRetry: () => void }) {
  if (slot.status === 'error') {
    return (
      <p className="step04-dd-notice is-error" role="status">
        うまく準備できなかったため、基本の選択肢を表示しています。
        <button type="button" className="step04-dd-link" onClick={onRetry}>
          もう一度準備する
        </button>
      </p>
    );
  }
  if (slot.refreshedNotice) {
    return (
      <p className="step04-dd-notice" role="status">
        前の回答が変わったので、選択肢を更新しました。選んでいた項目は残しています。
      </p>
    );
  }
  return null;
}

/* ===== 深掘り① 場面・行動 ===== */

type EntryModalProps = {
  index: number;
  reasonText: string;
  dd: DeepDiveEntry;
  fallback: EntryOptions;
  onRefresh: () => void;
  onRetry: () => void;
  onSave: (scene: PickAnswer, action: PickAnswer) => void;
  onClose: () => void;
};

export function Step04DeepDiveEntryModal({
  index,
  reasonText,
  dd,
  fallback,
  onRefresh,
  onRetry,
  onSave,
  onClose,
}: EntryModalProps) {
  const [scene, setScene] = useState(dd.entry.scene);
  const [action, setAction] = useState(dd.entry.action);
  const slot = dd.entry.options;
  const opts = shownOptions(slot, fallback);
  const dirty = !sameJson(scene, dd.entry.scene) || !sameJson(action, dd.entry.action);
  const canSave = hasPick(scene) && hasPick(action);

  return (
    <DeepDiveModalShell
      title="こころの深掘り　その①"
      dirty={dirty}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="mandala-modal-btn" onClick={onClose}>
            キャンセル
          </button>
          <span className="step04-dd-footer-right">
            <RefreshButton refreshCount={slot.refreshCount} loading={slot.status === 'loading'} onRefresh={onRefresh} />
            <button
              type="button"
              className="mandala-modal-btn mandala-modal-btn--primary"
              disabled={!canSave}
              title={!canSave ? '場面・行動をそれぞれ1つ以上選んでください' : undefined}
              onClick={() => onSave(scene, action)}
            >
              保存
            </button>
          </span>
        </>
      }
    >
      <section className="step04-dd-reason">
        <h4 className="step04-dd-question-label">課題{circled(index)}</h4>
        <p className="step04-dd-reason-text">{reasonText}</p>
      </section>
      <SlotNotice slot={slot} onRetry={onRetry} />
      <QuestionBlock
        label="場面による深掘り質問"
        question={opts?.sceneQuestion ?? fallback.sceneQuestion}
        hint={MULTI_HINT}
      >
        <PickGroup
          options={opts?.scenes ?? null}
          value={scene}
          onChange={setScene}
          otherLabel="＋これら以外の時"
          ariaLabel="場面"
        />
      </QuestionBlock>
      <QuestionBlock
        label="行動による深掘り質問"
        question="そんな時、実際にはどんな行動をとることが多いでしょうか？"
        hint={MULTI_HINT}
      >
        <PickGroup
          options={opts?.actions ?? null}
          value={action}
          onChange={setAction}
          otherLabel="＋これら以外の行動"
          ariaLabel="行動"
        />
      </QuestionBlock>
    </DeepDiveModalShell>
  );
}

/* ===== 深掘り② 気持ち・こころの声・こころの抵抗 ===== */

type InnerModalProps = {
  index: number;
  reasonText: string;
  dd: DeepDiveEntry;
  fallback: InnerOptions;
  onRefresh: () => void;
  onRetry: () => void;
  onSave: (v: { feeling: PickAnswer; voice: PickAnswer; voiceOwnWords: string; protection: PickAnswer }) => void;
  onClose: () => void;
};

export function Step04DeepDiveInnerModal({
  index,
  reasonText,
  dd,
  fallback,
  onRefresh,
  onRetry,
  onSave,
  onClose,
}: InnerModalProps) {
  const [feeling, setFeeling] = useState(dd.inner.feeling);
  const [voice, setVoice] = useState(dd.inner.voice);
  const [voiceOwnWords, setVoiceOwnWords] = useState(dd.inner.voiceOwnWords);
  const [protection, setProtection] = useState(dd.inner.protection);
  const slot = dd.inner.options;
  const opts = shownOptions(slot, fallback);
  const dirty =
    !sameJson(feeling, dd.inner.feeling) ||
    !sameJson(voice, dd.inner.voice) ||
    voiceOwnWords !== dd.inner.voiceOwnWords ||
    !sameJson(protection, dd.inner.protection);
  const canSave = hasPick(feeling) && (hasPick(voice) || voiceOwnWords.trim() !== '') && hasPick(protection);

  return (
    <DeepDiveModalShell
      title="こころの深掘り　その②"
      dirty={dirty}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="mandala-modal-btn" onClick={onClose}>
            キャンセル
          </button>
          <span className="step04-dd-footer-right">
            <RefreshButton refreshCount={slot.refreshCount} loading={slot.status === 'loading'} onRefresh={onRefresh} />
            <button
              type="button"
              className="mandala-modal-btn mandala-modal-btn--primary"
              disabled={!canSave}
              title={!canSave ? '各質問で1つ以上選んでください（こころの声は自分の言葉でも可）' : undefined}
              onClick={() => onSave({ feeling, voice, voiceOwnWords: voiceOwnWords.trim(), protection })}
            >
              保存
            </button>
          </span>
        </>
      }
    >
      <section className="step04-dd-reason">
        <h4 className="step04-dd-question-label">課題{circled(index)}</h4>
        <p className="step04-dd-reason-text">{reasonText}</p>
        <dl className="step04-dd-context">
          <dt>場面</dt>
          <dd>
            <PillList items={picks(dd.entry.scene)} />
          </dd>
          <dt>行動</dt>
          <dd>
            <PillList items={picks(dd.entry.action)} />
          </dd>
        </dl>
      </section>
      <SlotNotice slot={slot} onRetry={onRetry} />
      <QuestionBlock label="気持ち" question="その時、どんな気持ちになりますか？" hint={MULTI_HINT}>
        <PickGroup
          options={opts?.feelings ?? null}
          value={feeling}
          onChange={setFeeling}
          otherLabel="＋その他"
          ariaLabel="気持ち"
        />
      </QuestionBlock>
      <QuestionBlock label="こころの声" question="その時、頭の中ではどんな言葉が浮かんでいますか？" hint={MULTI_HINT}>
        <PickGroup
          options={opts?.voices ?? null}
          value={voice}
          onChange={setVoice}
          otherLabel="＋その他"
          ariaLabel="こころの声"
        />
        <label className="step04-dd-own">
          <span>自分の言葉で書いてみる（任意）</span>
          <textarea
            rows={2}
            value={voiceOwnWords}
            maxLength={DEEP_DIVE_VOICE_OWN_MAX_CHARS}
            placeholder="例：どうせまた途中でやめてしまう"
            onChange={(e) => setVoiceOwnWords(e.target.value)}
          />
        </label>
      </QuestionBlock>
      <QuestionBlock
        label="こころの抵抗"
        question="もし、その考えや行動が「あなたを守るため」に起きていたとしたら、何から守ろうとしていたのでしょう？"
        hint={MULTI_HINT}
        emphasis
      >
        <PickGroup
          options={opts?.protections ?? null}
          value={protection}
          onChange={setProtection}
          otherLabel="＋その他"
          ariaLabel="こころの抵抗"
        />
      </QuestionBlock>
    </DeepDiveModalShell>
  );
}

/* ===== こころの働き ===== */

type WorkingModalProps = {
  index: number;
  reasonText: string;
  dd: DeepDiveEntry;
  onRetry: () => void;
  onSave: (v: { ratings: Record<string, WorkingRating>; ownWords: string }) => void;
  onClose: () => void;
};

export function Step04DeepDiveWorkingModal({ index, reasonText, dd, onRetry, onSave, onClose }: WorkingModalProps) {
  const [ratings, setRatings] = useState<Record<string, WorkingRating>>(dd.working.ratings);
  const [ownWords, setOwnWords] = useState(dd.working.ownWords);
  const slot = dd.working.hypotheses;
  const hypotheses: Hypothesis[] | null = slot.data;
  const dirty = !sameJson(ratings, dd.working.ratings) || ownWords !== dd.working.ownWords;
  const allRated = hypotheses != null && hypotheses.every((h) => ratings[h.id]);
  const canSave = allRated && ownWords.trim() !== '';
  const close = hypotheses?.filter((h) => ratings[h.id] === 'strong' || ratings[h.id] === 'some') ?? [];

  return (
    <DeepDiveModalShell
      title="こころの働き"
      dirty={dirty}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="mandala-modal-btn" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="mandala-modal-btn mandala-modal-btn--primary"
            disabled={!canSave}
            title={!canSave ? 'すべてのカードで当てはまり度を選び、自分の言葉を書いてください' : undefined}
            onClick={() => {
              const kept = Object.fromEntries(
                Object.entries(ratings).filter(([id]) => hypotheses?.some((h) => h.id === id))
              );
              onSave({ ratings: kept, ownWords: ownWords.trim() });
            }}
          >
            保存
          </button>
        </>
      }
    >
      <section className="step04-dd-reason">
        <h4 className="step04-dd-question-label">課題{circled(index)}</h4>
        <p className="step04-dd-reason-text">{reasonText}</p>
      </section>
      <section className="step04-dd-working-lead">
        <h4>今回見えてきた「こころの働き」</h4>
        <p>お答えいただいた内容から、次のような心の働きが関係している可能性があります。</p>
        <p>正解を決めるものではありません。「自分に近いかな？」という視点で読んでみてください。</p>
      </section>
      {slot.status === 'error' && !hypotheses ? (
        <p className="step04-dd-notice is-error" role="status">
          うまく準備できませんでした。
          <button type="button" className="step04-dd-link" onClick={onRetry}>
            もう一度準備する
          </button>
        </p>
      ) : null}
      {slot.refreshedNotice ? (
        <p className="step04-dd-notice" role="status">
          前の回答が変わったので、仮説を作り直しました。当てはまり度と自分の言葉は残しています。
        </p>
      ) : null}
      {hypotheses == null && slot.status !== 'error' ? (
        <div className="step04-dd-picks is-loading" aria-busy="true">
          <p className="step04-dd-preparing">回答をもとに考えています…</p>
          <div className="step04-dd-skeleton">
            <span className="step04-dd-skeleton-card" />
            <span className="step04-dd-skeleton-card" />
          </div>
        </div>
      ) : null}
      {hypotheses?.map((h, i) => (
        <article key={h.id} className="step04-dd-hypo">
          <p className="step04-dd-hypo-mark">カード{String.fromCharCode(65 + i)}</p>
          <h4 className="step04-dd-hypo-title">{h.title}</h4>
          <p className="step04-dd-hypo-body">{h.body}</p>
          {h.links.length > 0 ? (
            <div className="step04-dd-hypo-links">
              <span>今回の回答とのつながり</span>
              {h.links.map((l) => (
                <code key={l}>{l}</code>
              ))}
            </div>
          ) : null}
          <div className="step04-dd-rating" role="radiogroup" aria-label={`カード${String.fromCharCode(65 + i)}の当てはまり度`}>
            {WORKING_RATINGS.map((r) => (
              <label key={r.id} className={`step04-choice${ratings[h.id] === r.id ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name={`step04-rating-${dd.reasonId}-${h.id}`}
                  checked={ratings[h.id] === r.id}
                  onChange={() => setRatings((prev) => ({ ...prev, [h.id]: r.id }))}
                />
                {r.mark} {r.label}
              </label>
            ))}
          </div>
        </article>
      ))}
      <section className="step04-dd-question is-emphasis">
        <h4 className="step04-dd-question-label">あなたの言葉</h4>
        <p className="step04-dd-question-text">あなた自身の言葉にすると、どんな心の働きだと思いますか？</p>
        <textarea
          className="step04-dd-own-words"
          rows={3}
          value={ownWords}
          maxLength={DEEP_DIVE_OWN_WORDS_MAX_CHARS}
          placeholder="例：また失敗して自信をなくしたくないんだと思う"
          onChange={(e) => setOwnWords(e.target.value)}
        />
        {close.length > 0 && !ownWords.trim() ? (
          <button
            type="button"
            className="step04-dd-link"
            onClick={() => setOwnWords(close.map((h) => h.title).join('。'))}
          >
            ◎○を付けたカードを下書きに使う
          </button>
        ) : null}
      </section>
    </DeepDiveModalShell>
  );
}
