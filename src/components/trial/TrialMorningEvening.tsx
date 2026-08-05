'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useJournalDetailLevel } from '@/context/JournalDetailLevelContext';
import { AutosizeTextarea } from '@/components/trial/AutosizeTextarea';
import {
  addDaysDateKey,
  getTrial4wDailyPlain,
  saveTrial4wDailyPlain,
  type Trial4wEveningExecution,
  type Trial4wDailyPlain,
} from '@/lib/firestore';
import { getTodayDateKeyTokyo } from '@/lib/journalWeek';
import { buildJsonAuthHeaders } from '@/lib/clientAuthHeaders';
import { messageFromApiErrorPayload } from '@/lib/apiErrorMessage';
import {
  AI_SUGGESTION_DAILY_LIMIT,
  applyClientDisplayNameToAiSuggestion,
  buildEveningActionReferenceText,
  buildEveningReflectionText,
  countUnicodeChars,
  MIN_REFLECTION_TEXT_CHARS,
  normalizeEveningUserQuestion,
} from '@/lib/eveningAiImprovementInput';
import TrialSaveStatusLine from '@/components/trial/TrialSaveStatusLine';
import { JournalCoachShareHeader } from '@/components/trial/JournalCoachShareHeader';
import { useTrialJournalCoachContext } from '@/hooks/useTrialJournalCoachContext';
import {
  journalShowEveningAiCoach,
  journalShowEveningEmotionThought,
  journalShowEveningImprovement,
  journalShowEveningInsightFollowUp,
  journalShowEveningReflectionThought,
  journalShowEveningSelfMessage,
  journalShowEveningSpecificActions,
  journalShowEveningTomorrowActionContent,
  journalShowEveningTomorrowImaging,
  journalShowMorningActionContent,
  journalShowMorningImaging,
  journalShowSupplementaryDetails,
} from '@/lib/journalDetailLevel';

const EVENING_EXECUTION_OPTIONS: readonly { value: Trial4wEveningExecution; label: string }[] = [
  { value: 'done', label: 'およそできた' },
  { value: 'partial', label: 'まあまあできた' },
  { value: 'none', label: 'あまりできなかった' },
];

function formatDateLabelJa(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map((x) => Number(x));
  if (!y || !m || !d) return dateKey;
  return `${m}月${d}日`;
}

function EveningQuestionField({
  label,
  value,
  onChange,
  onBlur,
  saving,
  placeholder = '入力してください',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  saving: boolean;
  placeholder?: string;
}) {
  return (
    <div className="form-row">
      <span className="trial-l3-label">{label}</span>
      <AutosizeTextarea
        className="w-full text-sm border border-gray-300 rounded p-2"
        value={value}
        disabled={saving}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
      />
    </div>
  );
}

function InfoDetails({ title, body }: { title: string; body: string }) {
  return (
    <details className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-2 py-1">
      <summary className="cursor-pointer select-none">{title}</summary>
      <div className="mt-2 whitespace-pre-wrap leading-relaxed">{body}</div>
    </details>
  );
}

function TrialSegmentedToggle<T extends string>({
  value,
  options,
  onPick,
  disabled,
}: {
  value: T | null;
  options: readonly { value: T; label: string }[];
  onPick: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="trial-segmented-toggle" role="group" aria-label="選択">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`trial-segmented-toggle__btn${active ? ' trial-segmented-toggle__btn--active' : ''}`}
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onPick(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function TrialMorningEvening({ coachClientUid = null }: { coachClientUid?: string | null }) {
  const {
    user,
    loading,
    isCoachView,
    contentUid,
    canEdit,
    journalProfile,
    coachCommentsEnabled,
    coachContextError,
    coachContextReady,
  } = useTrialJournalCoachContext(coachClientUid);
  const { level } = useJournalDetailLevel();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date'); // YYYY-MM-DD

  const [dateKey, setDateKey] = useState<string>(() => dateParam || getTodayDateKeyTokyo());
  const [data, setData] = useState<Trial4wDailyPlain | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const inputDisabled = saving || !canEdit;

  useEffect(() => {
    if (dateParam) {
      setDateKey(dateParam);
      return;
    }
    setDateKey((prev) => prev || getTodayDateKeyTokyo());
  }, [dateParam]);

  /** 日付ナビ・読込に使う確定キー（未指定時は当日 JST） */
  const resolvedDateKey = useMemo(
    () => dateKey || dateParam || getTodayDateKeyTokyo(),
    [dateKey, dateParam]
  );

  const load = useCallback(async () => {
    if (!contentUid) return;
    const dk = resolvedDateKey;
    try {
      const doc = await getTrial4wDailyPlain(contentUid, dk);
      setData(doc);
      setDateKey(doc.dateKey || dk);
      setMsg(null);
    } catch (e) {
      console.error(e);
      const permission = e instanceof Error && /permission|insufficient/i.test(e.message);
      setDateKey(dk);
      setMsg(
        isCoachView
          ? permission
            ? 'この日の朝・晩はクライアントが共有していません（日次の「コーチと共有」が OFF、または権限不足）。‹ › で他の日へ移動できます。'
            : 'クライアントの朝・晩の読み込みに失敗しました。'
          : '読み込みに失敗しました。Firestore ルールのデプロイ（journal_daily）とログイン状態を確認してください。'
      );
      if (!isCoachView) {
        setData({
          dateKey: dk,
          tz: 'Asia/Tokyo',
          morningAffirmationDeclaration: null,
          morningTodayActionText: null,
          morningActionGoalText: null,
          morningActionContentText: null,
          morningImagingDone: null,
          eveningExecution: null,
          eveningSpecificActionsText: null,
          eveningResultText: null,
          eveningResultExecutionText: null,
          eveningResultGoalProgressText: null,
          eveningSatisfaction: null,
          eveningEmotionThoughtText: null,
          eveningReflectionThoughtText: null,
          eveningBrake: null,
          eveningBrakeRebuttalChoice: null,
          eveningRebuttalText: null,
          eveningBrakeWorkedText: null,
          eveningBrakeRebuttedText: null,
          eveningBrakeWordsText: null,
          eveningInsightText: null,
          eveningImprovementText: null,
          eveningAiQuestionText: null,
          eveningAiSuggestionText: null,
          eveningAiSuggestionRunCount: null,
          eveningMessageToSelfText: null,
          eveningTomorrowActionSeedText: null,
          eveningTomorrowGoalText: null,
          eveningTomorrowActionContentText: null,
          eveningTomorrowImagingDone: null,
          sharedWithCoach: false,
        });
      } else {
        setData(null);
      }
    }
  }, [contentUid, resolvedDateKey, isCoachView]);

  useEffect(() => {
    if (loading) return;
    if (isCoachView && !coachClientUid) return;
    if (!coachContextReady) return;
    if (!contentUid) return;
    void load();
  }, [loading, contentUid, load, isCoachView, coachClientUid, coachContextReady]);

  useEffect(() => {
    // 日付切替時のみ、保存済みの Aiコーチからのコメントを初期表示へ反映する。
    // 同日内の再生成後に runCount 保存で再読込しても、直前の生成結果を上書きしないため。
    setAiSuggestion(data?.eveningAiSuggestionText ?? null);
  }, [data?.dateKey]);

  const savePatch = useCallback(
    async (patch: Partial<Trial4wDailyPlain>) => {
      if (!canEdit || !user || !data || !contentUid) return;
      setSaving(true);
      setMsg(null);
      try {
        await saveTrial4wDailyPlain({ uid: contentUid, dateKey: data.dateKey, patch });
        await load();
        setMsg('保存しました。');
        setTimeout(() => setMsg(null), 2500);
      } catch (e) {
        console.error(e);
        setMsg(e instanceof Error ? e.message : '保存に失敗しました。');
      } finally {
        setSaving(false);
      }
    },
    [canEdit, user, data, contentUid, load]
  );

  const gotoDate = useCallback(
    (nextKey: string) => {
      setDateKey(nextKey);
      setData(null);
      setMsg(null);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'morning_evening');
      url.searchParams.set('date', nextKey);
      if (coachClientUid) {
        url.searchParams.set('coachClient', coachClientUid);
      }
      router.replace(url.pathname + url.search);
    },
    [router, coachClientUid]
  );
  const aiReflectionText = useMemo(
    () => (data ? buildEveningReflectionText(data) : ''),
    [data]
  );
  const aiActionReferenceText = useMemo(
    () => (data ? buildEveningActionReferenceText(data) : ''),
    [data]
  );
  const aiUserQuestion = useMemo(
    () => (data ? normalizeEveningUserQuestion(data.eveningAiQuestionText) : null),
    [data]
  );
  const aiSuggestionDisplay = useMemo(
    () =>
      aiSuggestion
        ? applyClientDisplayNameToAiSuggestion(aiSuggestion, journalProfile?.displayName)
        : null,
    [aiSuggestion, journalProfile?.displayName]
  );

  const aiRunCount = Math.max(0, data?.eveningAiSuggestionRunCount ?? 0);
  const isAiRunLimitReached = aiRunCount >= AI_SUGGESTION_DAILY_LIMIT;
  const canRunAiSuggestion =
    canEdit &&
    countUnicodeChars(aiReflectionText) >= MIN_REFLECTION_TEXT_CHARS &&
    !aiLoading &&
    !isAiRunLimitReached;

  const handleGenerateAiSuggestion = async () => {
    if (!canEdit) return;
    if (isAiRunLimitReached) {
      setAiError(
        `本日のAiコーチからのコメントは上限（${AI_SUGGESTION_DAILY_LIMIT}回）に達しました。明日再度お試しください。`
      );
      return;
    }
    if (!canRunAiSuggestion) {
      setAiError(
        `気づき・学びの入力（項目a〜f）を合わせて${MIN_REFLECTION_TEXT_CHARS}文字以上入力してから実行してください。`
      );
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);
    try {
      const authHeaders = await buildJsonAuthHeaders(user);
      const body: {
        reflectionText: string;
        userQuestion?: string;
        actionReferenceText?: string;
      } = {
        reflectionText: aiReflectionText,
      };
      if (aiUserQuestion) body.userQuestion = aiUserQuestion;
      if (aiActionReferenceText) body.actionReferenceText = aiActionReferenceText;
      const res = await fetch('/api/ai/improvement', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const raw = await res.text();
      let json: { suggestion?: string; error?: string | { message?: string } } = {};
      if (raw.trim()) {
        try {
          json = JSON.parse(raw) as typeof json;
        } catch {
          throw new Error('Aiコーチからのコメントの生成に失敗しました（サーバー応答の解析に失敗）。');
        }
      }
      if (!res.ok) throw new Error(messageFromApiErrorPayload(json) || 'Aiコーチからのコメントの生成に失敗しました。');
      if (!json.suggestion || typeof json.suggestion !== 'string') {
        throw new Error('Aiコーチからのコメントの形式が不正です。');
      }
      setAiSuggestion(json.suggestion);
      await savePatch({ eveningAiSuggestionRunCount: aiRunCount + 1 });
    } catch (e) {
      console.error(e);
      setAiError(
        e instanceof Error
          ? e.message
          : 'Aiコーチからのコメントの生成に失敗しました。時間をおいて再実行してください。'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAiSuggestion = async () => {
    if (!canEdit) return;
    if (!aiSuggestion || !data) return;
    const toSave =
      applyClientDisplayNameToAiSuggestion(aiSuggestion, journalProfile?.displayName) || aiSuggestion;
    try {
      setAiSaving(true);
      setAiError(null);
      await savePatch({ eveningAiSuggestionText: toSave });
      setAiSuggestion(toSave);
      setMsg('Aiコーチからのコメントを保存しました。');
    } catch (e) {
      setAiError(
        e instanceof Error
          ? e.message
          : 'Aiコーチからのコメントの保存に失敗しました。時間をおいて再実行してください。'
      );
    } finally {
      setAiSaving(false);
    }
  };

  if (isCoachView && !coachClientUid) {
    return (
      <div className="trial-tab-content">
        <div className="morning-evening-container">
          <div className="trial-tab-heading-row">
            <h2 id="morning-evening-section-title">朝・晩のアクション</h2>
          </div>
          <p className="text-sm text-gray-600">メニューバーの「共有」からクライアントを選択してください。</p>
        </div>
      </div>
    );
  }

  if (coachContextError) {
    return (
      <div className="trial-tab-content">
        <div className="morning-evening-container">
          <div className="trial-tab-heading-row">
            <h2 id="morning-evening-section-title">朝・晩のアクション</h2>
          </div>
          <p className="text-sm text-red-600" role="alert">
            {coachContextError}
          </p>
        </div>
      </div>
    );
  }

  if (!coachContextReady) {
    return (
      <div className="trial-tab-content">
        <div className="morning-evening-container">
          <div className="trial-tab-heading-row">
            <h2 id="morning-evening-section-title">朝・晩のアクション</h2>
          </div>
          <p className="text-sm text-gray-500">読み込み中…</p>
        </div>
      </div>
    );
  }

  if (!user && !loading) {
    return (
      <div className="trial-tab-content">
        <div className="morning-evening-container">
          <div className="trial-tab-heading-row">
            <h2 id="morning-evening-section-title">朝・晩のアクション</h2>
          </div>
          <p className="text-sm text-gray-600">ログインすると日次記録を保存できます。</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="trial-tab-content">
        <div className="morning-evening-container">
          <div className="trial-tab-heading-row">
            <h2 id="morning-evening-section-title">朝・晩のアクション</h2>
          </div>
          {isCoachView ? (
            <p className="text-sm text-gray-600 mb-2">
              クライアントの朝・晩を閲覧中です（編集不可。日次の「コーチと共有」が ON の日のみ本文を表示できます）。
            </p>
          ) : null}
          {msg ? (
            <p className="text-sm text-red-600" role="alert">
              {msg}
            </p>
          ) : (
            <p className="text-sm text-gray-500">読み込み中…</p>
          )}
          {isCoachView ? (
            <div className="date-nav mt-3">
              <button
                type="button"
                className="date-nav-btn"
                aria-label="前の日"
                onClick={() => gotoDate(addDaysDateKey(resolvedDateKey, -1))}
              >
                ‹
              </button>
              <span className="date-nav-label">{formatDateLabelJa(resolvedDateKey)}</span>
              <button
                type="button"
                className="date-nav-btn"
                aria-label="次の日"
                onClick={() => gotoDate(addDaysDateKey(resolvedDateKey, 1))}
              >
                ›
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="trial-tab-content">
      <div className="morning-evening-container">
        <div className="trial-tab-heading-row trial-tab-heading-row--journal">
          <h2 id="morning-evening-section-title">朝・晩のアクション</h2>
          <JournalCoachShareHeader
            enabled={coachCommentsEnabled}
            checked={!!data.sharedWithCoach}
            disabled={inputDisabled}
            readOnly={isCoachView}
            ariaLabel="この日の朝・晩をコーチに共有する"
            onChange={(v) => {
              setData((prev) => (prev ? { ...prev, sharedWithCoach: v } : prev));
              void savePatch({ sharedWithCoach: v });
            }}
          />
        </div>
        {isCoachView ? (
          <p className="text-sm text-gray-600 mb-2">
            クライアントの朝・晩を閲覧中です（編集不可。日次の「コーチと共有」が ON の日のみ表示できます）。
          </p>
        ) : coachCommentsEnabled ? (
          <p className="text-xs text-gray-500 mb-2">
            デフォルトは共有オフです。コミュニケーションで合意のうえ、必要な日だけ共有を ON
            にしてください（週次共有とは別です）。
          </p>
        ) : null}
        <div className="date-nav">
          <button
            type="button"
            className="date-nav-btn"
            aria-label="前の日"
            onClick={() => gotoDate(addDaysDateKey(data.dateKey, -1))}
          >
            ‹
          </button>
          <span className="date-nav-label">{formatDateLabelJa(data.dateKey)}</span>
          <button
            type="button"
            className="date-nav-btn"
            aria-label="次の日"
            onClick={() => gotoDate(addDaysDateKey(data.dateKey, 1))}
          >
            ›
          </button>
        </div>

        <TrialSaveStatusLine message={msg} saving={saving} />

        {/* 朝コンテナ */}
        <div className="action-sub-section" data-section="morning">
          <h3>朝のアクション</h3>

          <h4 className="trial-form-heading-l2">
            <span className="trial-heading-mark" aria-hidden="true">◇</span>
            アファメーション宣言
          </h4>
          <div className="trial-form-block-l3">
            <div className="form-row">
              <button
                type="button"
                className={`trial-segmented-toggle__btn${data.morningAffirmationDeclaration === 'done' ? ' trial-segmented-toggle__btn--active' : ''}`}
                disabled={inputDisabled}
                aria-pressed={data.morningAffirmationDeclaration === 'done'}
                onClick={() =>
                  void savePatch({
                    morningAffirmationDeclaration:
                      data.morningAffirmationDeclaration === 'done' ? null : 'done',
                  })
                }
              >
                実施
              </button>
            </div>
          </div>

          <h4 className="trial-form-heading-l2">
            <span className="trial-heading-mark" aria-hidden="true">◇</span>
            今日の行動
          </h4>
          <div className="trial-form-block-l3">
            {journalShowSupplementaryDetails(level) ? (
              <InfoDetails
                title="補足（クリックで表示）"
                body={`昨日と同様の行動であっても、昨日の改善点やうまくできたことなどを踏まえた行動内容にすることが重要です。\n○○を◇◇にかえて行ってみる。\n昨日うまくできた○○を今日もできるようにする\nなど。`}
              />
            ) : null}
            <div className="form-row">
              <span className="trial-l3-label">行動目標：何を実行する（1文で）</span>
              <AutosizeTextarea
                className="w-full text-sm border border-gray-300 rounded p-2"
                value={data.morningTodayActionText ?? ''}
                disabled={inputDisabled}
                onChange={(e) => setData((prev) => (prev ? { ...prev, morningTodayActionText: e.target.value } : prev))}
                onBlur={() => void savePatch({ morningTodayActionText: data.morningTodayActionText })}
                placeholder="入力してください"
              />
            </div>
            {journalShowMorningActionContent(level) ? (
              <div className="form-row">
                <span className="trial-l3-label">行動内容：どのように</span>
                <AutosizeTextarea
                  className="w-full text-sm border border-gray-300 rounded p-2"
                  value={data.morningActionContentText ?? ''}
                  disabled={inputDisabled}
                  onChange={(e) =>
                    setData((prev) =>
                      prev ? { ...prev, morningActionContentText: e.target.value } : prev
                    )
                  }
                  onBlur={() =>
                    void savePatch({ morningActionContentText: data.morningActionContentText })
                  }
                  placeholder="入力してください"
                />
              </div>
            ) : null}
          </div>

          {journalShowMorningImaging(level) ? (
            <>
              <h4 className="trial-form-heading-l2">
                <span className="trial-heading-mark" aria-hidden="true">◇</span>
                今日の行動のイメージング
              </h4>
              <div className="trial-form-block-l3">
                {journalShowSupplementaryDetails(level) ? (
                  <InfoDetails
                    title="補足（クリックで表示）"
                    body={`今日の行動内容を実際に行う場面を想定し、うまくできるようにイメージングします。\nどのように体を動かすのか、どのように話をするなど、より具体的にイメージしあたまの中でシミュレーションすることが大切です。`}
                  />
                ) : null}
                <div className="form-row">
                  <button
                    type="button"
                    className={`trial-segmented-toggle__btn${data.morningImagingDone === true ? ' trial-segmented-toggle__btn--active' : ''}`}
                    disabled={inputDisabled}
                    aria-pressed={data.morningImagingDone === true}
                    onClick={() =>
                      void savePatch({
                        morningImagingDone: data.morningImagingDone === true ? false : true,
                      })
                    }
                  >
                    実施
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* 晩コンテナ — §4.z */}
        <div className="action-sub-section" data-section="evening">
          <h3>晩のアクション</h3>

          <h4 className="trial-form-heading-l2">
            <span className="trial-heading-mark" aria-hidden="true">◇</span>
            行動
          </h4>
          <div className="trial-form-block-l3">
            <div className="form-row">
              <span className="trial-l3-label">行動目標に対してどのくらい実施できましたか？</span>
              <TrialSegmentedToggle<Trial4wEveningExecution>
                value={data.eveningExecution}
                disabled={inputDisabled}
                options={EVENING_EXECUTION_OPTIONS}
                onPick={(v) => void savePatch({ eveningExecution: v })}
              />
            </div>
            {journalShowEveningSpecificActions(level) &&
              (data.eveningExecution === 'done' || data.eveningExecution === 'partial') && (
                <EveningQuestionField
                  label="どのように行動できましたか？"
                  value={data.eveningSpecificActionsText ?? ''}
                  saving={inputDisabled}
                  onChange={(v) =>
                    setData((prev) => (prev ? { ...prev, eveningSpecificActionsText: v } : prev))
                  }
                  onBlur={() => void savePatch({ eveningSpecificActionsText: data.eveningSpecificActionsText })}
                />
              )}
            <div className="form-row">
                <span className="trial-l3-label">行動の満足度を10点のうちどのくらいでしたか？</span>
              <div className="satisfaction-input">
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={data.eveningSatisfaction ?? ''}
                  disabled={inputDisabled}
                  onChange={(e) =>
                    setData((prev) =>
                      prev
                        ? { ...prev, eveningSatisfaction: e.target.value === '' ? null : Number(e.target.value) }
                        : prev
                    )
                  }
                  onBlur={() => void savePatch({ eveningSatisfaction: data.eveningSatisfaction })}
                  aria-label="満足度"
                />
                <span>点/10点</span>
              </div>
            </div>
          </div>

          <h4 className="trial-form-heading-l2">
            <span className="trial-heading-mark" aria-hidden="true">◇</span>
            気づき
          </h4>
          <div className="trial-form-block-l3">
            <EveningQuestionField
              label="今日印象に残ったできごとは何でしたか？"
              value={data.eveningResultExecutionText ?? ''}
              saving={inputDisabled}
              onChange={(v) =>
                setData((prev) => (prev ? { ...prev, eveningResultExecutionText: v } : prev))
              }
              onBlur={() => void savePatch({ eveningResultExecutionText: data.eveningResultExecutionText })}
            />
            {journalShowEveningEmotionThought(level) ? (
              <EveningQuestionField
                label="その時、どんな気持ちになりましたか？"
                value={data.eveningEmotionThoughtText ?? ''}
                saving={inputDisabled}
                onChange={(v) =>
                  setData((prev) => (prev ? { ...prev, eveningEmotionThoughtText: v } : prev))
                }
                onBlur={() => void savePatch({ eveningEmotionThoughtText: data.eveningEmotionThoughtText })}
              />
            ) : null}
            {journalShowEveningReflectionThought(level) ? (
              <EveningQuestionField
                label="その時、どのような考えが思い浮かびましたか？"
                value={data.eveningReflectionThoughtText ?? ''}
                saving={inputDisabled}
                onChange={(v) =>
                  setData((prev) => (prev ? { ...prev, eveningReflectionThoughtText: v } : prev))
                }
                onBlur={() => void savePatch({ eveningReflectionThoughtText: data.eveningReflectionThoughtText })}
              />
            ) : null}
            {journalShowEveningInsightFollowUp(level) ? (
              <EveningQuestionField
                label="そこから、なにか気づくことはありましたか？"
                value={data.eveningBrakeWorkedText ?? ''}
                saving={inputDisabled}
                onChange={(v) =>
                  setData((prev) => (prev ? { ...prev, eveningBrakeWorkedText: v } : prev))
                }
                onBlur={() => void savePatch({ eveningBrakeWorkedText: data.eveningBrakeWorkedText })}
              />
            ) : null}
            <EveningQuestionField
              label="この出来事から何を学びましたか？"
              value={data.eveningInsightText ?? ''}
              saving={inputDisabled}
              onChange={(v) => setData((prev) => (prev ? { ...prev, eveningInsightText: v } : prev))}
              onBlur={() => void savePatch({ eveningInsightText: data.eveningInsightText })}
            />
            {journalShowEveningImprovement(level) ? (
              <EveningQuestionField
                label="今日の学びをどう明日に活かしますか？"
                value={data.eveningImprovementText ?? ''}
                saving={inputDisabled}
                onChange={(v) =>
                  setData((prev) => (prev ? { ...prev, eveningImprovementText: v } : prev))
                }
                onBlur={() => void savePatch({ eveningImprovementText: data.eveningImprovementText })}
              />
            ) : null}

            {journalShowEveningAiCoach(level) ? (
              <>
                <EveningQuestionField
                  label="Aiコーチに聞きたい事はありますか？"
                  value={data.eveningAiQuestionText ?? ''}
                  saving={inputDisabled}
                  onChange={(v) =>
                    setData((prev) => (prev ? { ...prev, eveningAiQuestionText: v } : prev))
                  }
                  onBlur={() => void savePatch({ eveningAiQuestionText: data.eveningAiQuestionText })}
                />
                <div className="form-row">
                  <button
                    type="button"
                    className={`trial-action-btn ${canRunAiSuggestion && !saving ? 'ai-action-btn-ready' : ''}`}
                    disabled={!canRunAiSuggestion || saving}
                    onClick={() => void handleGenerateAiSuggestion()}
                  >
                    Aiコーチへ送信
                  </button>
                  {isAiRunLimitReached ? (
                    <p className="text-xs text-amber-700">
                      本日のAiコーチからのコメントの上限（{AI_SUGGESTION_DAILY_LIMIT}回）に達したため、明日再度ご利用ください。
                    </p>
                  ) : null}
                  {!canRunAiSuggestion && !isAiRunLimitReached ? (
                    <p className="text-xs text-gray-600">
                      気づき・学びの入力（項目a〜f）を合わせて{MIN_REFLECTION_TEXT_CHARS}文字以上入力すると実行できます。
                    </p>
                  ) : null}
                  {aiLoading ? (
                    <p className="text-xs text-gray-600">Aiコーチからのコメントを生成中です…</p>
                  ) : null}
                  {aiError ? <p className="text-xs text-red-600">{aiError}</p> : null}
                </div>
                <div className="form-row">
                  <span className="trial-l3-label">Aiコーチからのコメント</span>
                  {aiSuggestionDisplay ? (
                    <>
                      <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 whitespace-pre-wrap">
                        {aiSuggestionDisplay}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="trial-action-btn"
                          disabled={saving || aiSaving}
                          onClick={() => void handleSaveAiSuggestion()}
                        >
                          {aiSaving ? '保存中…' : 'Aiコーチからのコメントを保存'}
                        </button>
                        {data.eveningAiSuggestionText ? (
                          <span className="text-xs text-gray-600">保存済み（上書き保存可）</span>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">「Aiコーチへ送信」の結果がここに表示されます。</p>
                  )}
                </div>
              </>
            ) : null}

            {journalShowEveningSelfMessage(level) ? (
              <EveningQuestionField
                label="他に残しておきたいこと"
                value={data.eveningMessageToSelfText ?? ''}
                saving={inputDisabled}
                onChange={(v) =>
                  setData((prev) => (prev ? { ...prev, eveningMessageToSelfText: v } : prev))
                }
                onBlur={() => void savePatch({ eveningMessageToSelfText: data.eveningMessageToSelfText })}
              />
            ) : null}
          </div>

          <h4 className="trial-form-heading-l2">
            <span className="trial-heading-mark" aria-hidden="true">◇</span>
            明日の行動
          </h4>
          {level === 'simple' ? (
            <p className="text-xs text-gray-600 mb-2 -mt-1">
              簡易表示では目標を一文で十分です。「普通」表示にするとAiコーチを利用できます。
            </p>
          ) : null}
          <div className="trial-form-block-l3">
            <EveningQuestionField
              label="明日の行動目標（1文）"
              value={data.eveningTomorrowActionSeedText ?? ''}
              saving={inputDisabled}
              placeholder="入力してください（保存すると翌日の朝「今日の行動内容（目標）」に反映されます）"
              onChange={(v) =>
                setData((prev) => (prev ? { ...prev, eveningTomorrowActionSeedText: v } : prev))
              }
              onBlur={() => void savePatch({ eveningTomorrowActionSeedText: data.eveningTomorrowActionSeedText })}
            />
            <p className="text-xs text-gray-600">
              保存時、翌日の「今日の行動内容（目標）」が未入力なら自動でコピーします。
            </p>
            {journalShowEveningTomorrowActionContent(level) ? (
              <EveningQuestionField
                label="明日の行動内容"
                value={data.eveningTomorrowActionContentText ?? ''}
                saving={inputDisabled}
                onChange={(v) =>
                  setData((prev) => (prev ? { ...prev, eveningTomorrowActionContentText: v } : prev))
                }
                onBlur={() =>
                  void savePatch({ eveningTomorrowActionContentText: data.eveningTomorrowActionContentText })
                }
              />
            ) : null}
            {journalShowEveningTomorrowImaging(level) ? (
              <div className="form-row">
                <span className="trial-l3-label">明日の行動のイメージング（実施）</span>
                <button
                  type="button"
                  className={`trial-segmented-toggle__btn${data.eveningTomorrowImagingDone === true ? ' trial-segmented-toggle__btn--active' : ''}`}
                  disabled={inputDisabled}
                  aria-pressed={data.eveningTomorrowImagingDone === true}
                  onClick={() =>
                    void savePatch({
                      eveningTomorrowImagingDone:
                        data.eveningTomorrowImagingDone === true ? false : true,
                    })
                  }
                >
                  実施
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
