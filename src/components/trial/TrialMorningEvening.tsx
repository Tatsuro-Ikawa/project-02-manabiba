'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useJournalDetailLevel } from '@/context/JournalDetailLevelContext';
import {
  addDaysDateKey,
  getTrial4wDailyPlain,
  saveTrial4wDailyPlain,
  type Trial4wEveningBrake,
  type Trial4wEveningExecution,
  type Trial4wDailyPlain,
} from '@/lib/firestore';

function trialEveningExecutionLabel(v: Trial4wEveningExecution | null): string {
  if (v === 'done') return 'できた';
  if (v === 'partial') return '一部できた';
  if (v === 'none') return 'できなかった';
  return '';
}

function trialEveningBrakeLabel(v: Trial4wEveningBrake | null): string {
  if (v === 'yes') return '働いた';
  if (v === 'partial') return '一部働いた';
  if (v === 'no') return '働かなかった';
  return '';
}

/** Aiコーチからのコメント API へ送る本文（複数欄をラベル付きで連結） */
function buildAiReflectionInputText(data: Trial4wDailyPlain): string {
  const blocks: string[] = [];

  const pushBlock = (title: string, body: string | null | undefined) => {
    const t = (body ?? '').trim();
    if (t) blocks.push(`${title}\n${t}`);
  };

  pushBlock('【朝・今日の行動目標（1文）】', data.morningTodayActionText);

  if (data.eveningExecution) {
    blocks.push(`【行動の実行状況】\n${trialEveningExecutionLabel(data.eveningExecution)}`);
  }
  pushBlock('【具体的な行動内容】', data.eveningSpecificActionsText);

  const resultLines: string[] = [];
  if (data.eveningSatisfaction != null && !Number.isNaN(data.eveningSatisfaction)) {
    resultLines.push(`（満足度）${data.eveningSatisfaction}/10点`);
  }
  const ext = (data.eveningResultExecutionText ?? '').trim();
  if (ext) resultLines.push(`（補足・実行の記述）${ext}`);
  const rt = (data.eveningResultText ?? '').trim();
  if (rt) resultLines.push(`（どのように行いどの程度できたか）${rt}`);
  const gp = (data.eveningResultGoalProgressText ?? '').trim();
  if (gp) resultLines.push(`（目標・指標に対しどの程度近づけたか）${gp}`);
  if (resultLines.length) {
    blocks.push(`【行動の結果】\n${resultLines.join('\n')}`);
  }

  pushBlock('【行動時の感情・思考】', data.eveningEmotionThoughtText);

  const brakeLines: string[] = [];
  if (data.eveningBrake) {
    brakeLines.push(`ブレーキが働いたか: ${trialEveningBrakeLabel(data.eveningBrake)}`);
  }
  if (data.eveningBrake === 'yes' || data.eveningBrake === 'partial') {
    const bw = (data.eveningBrakeWorkedText ?? '').trim();
    if (bw) brakeLines.push(`どんなブレーキだったか: ${bw}`);
    if (data.eveningBrakeRebuttalChoice) {
      brakeLines.push(
        `反論できたか: ${trialEveningExecutionLabel(data.eveningBrakeRebuttalChoice)}`
      );
    }
    const words = (data.eveningBrakeWordsText ?? '').trim();
    if (words) brakeLines.push(`反論の言葉: ${words}`);
  }
  if (brakeLines.length) {
    blocks.push(`【こころのブレーキ】\n${brakeLines.join('\n')}`);
  }

  pushBlock('【今日の気づき・感動・学びと課題】', data.eveningInsightText);
  pushBlock('【自分の書いた明日への改善点】', data.eveningImprovementText);

  return blocks.join('\n\n');
}
import TrialSaveStatusLine from '@/components/trial/TrialSaveStatusLine';
import {
  journalShowEveningBrakeRebutted,
  journalShowEveningBrakeWhat,
  journalShowEveningBrakeWords,
  journalShowEveningEmotionThought,
  journalShowEveningImprovement,
  journalShowEveningResultDetailTexts,
  journalShowEveningSelfMessage,
  journalShowEveningSpecificActions,
  journalShowEveningTomorrowActionContent,
  journalShowEveningTomorrowImaging,
  journalShowMorningActionContent,
  journalShowMorningImaging,
  journalShowSupplementaryDetails,
} from '@/lib/journalDetailLevel';

const AI_SUGGESTION_DAILY_LIMIT = 3;

function formatDateLabelJa(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map((x) => Number(x));
  if (!y || !m || !d) return dateKey;
  return `${m}月${d}日 朝・晩のアクション`;
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

export default function TrialMorningEvening() {
  const { user, loading } = useAuth();
  const { level } = useJournalDetailLevel();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date'); // YYYY-MM-DD

  const [dateKey, setDateKey] = useState<string>(dateParam ?? '');
  const [data, setData] = useState<Trial4wDailyPlain | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (dateParam) setDateKey(dateParam);
  }, [dateParam]);

  const effectiveDateKey = useMemo(() => dateKey || dateParam || '', [dateKey, dateParam]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const doc = await getTrial4wDailyPlain(user.uid, effectiveDateKey || null);
      setData(doc);
    } catch (e) {
      console.error(e);
      setMsg(
        '読み込みに失敗しました。Firestore ルールのデプロイ（journal_daily）とログイン状態を確認してください。'
      );
      // 画面が止まらないように空の初期値で継続
      setData({
        dateKey: effectiveDateKey || '',
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
        eveningBrake: null,
        eveningBrakeRebuttalChoice: null,
        eveningRebuttalText: null,
        eveningBrakeWorkedText: null,
        eveningBrakeRebuttedText: null,
        eveningBrakeWordsText: null,
        eveningInsightText: null,
        eveningImprovementText: null,
        eveningAiSuggestionText: null,
        eveningAiSuggestionRunCount: null,
        eveningMessageToSelfText: null,
        eveningTomorrowActionSeedText: null,
        eveningTomorrowGoalText: null,
        eveningTomorrowActionContentText: null,
        eveningTomorrowImagingDone: null,
      });
    }
  }, [user, effectiveDateKey]);

  useEffect(() => {
    if (!loading && user) void load();
  }, [loading, user, load]);

  useEffect(() => {
    // 日付切替時のみ、保存済みの Aiコーチからのコメントを初期表示へ反映する。
    // 同日内の再生成後に runCount 保存で再読込しても、直前の生成結果を上書きしないため。
    setAiSuggestion(data?.eveningAiSuggestionText ?? null);
  }, [data?.dateKey]);

  const savePatch = useCallback(
    async (patch: Partial<Trial4wDailyPlain>) => {
      if (!user || !data) return;
      setSaving(true);
      setMsg(null);
      try {
        await saveTrial4wDailyPlain({ uid: user.uid, dateKey: data.dateKey, patch });
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
    [user, data, load]
  );

  const gotoDate = useCallback((nextKey: string) => {
    setDateKey(nextKey);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'morning_evening');
    url.searchParams.set('date', nextKey);
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);

  const aiInputText = useMemo(
    () => (data ? buildAiReflectionInputText(data) : ''),
    [data]
  );

  const aiRunCount = Math.max(0, data?.eveningAiSuggestionRunCount ?? 0);
  const aiRemainingCount = Math.max(0, AI_SUGGESTION_DAILY_LIMIT - aiRunCount);
  const isAiRunLimitReached = aiRunCount >= AI_SUGGESTION_DAILY_LIMIT;
  const canRunAiSuggestion = aiInputText.length >= 10 && !aiLoading && !isAiRunLimitReached;

  const handleGenerateAiSuggestion = async () => {
    if (isAiRunLimitReached) {
      setAiError(
        `本日のAiコーチからのコメントは上限（${AI_SUGGESTION_DAILY_LIMIT}回）に達しました。明日再度お試しください。`
      );
      return;
    }
    if (!canRunAiSuggestion) {
      setAiError(
        '振り返りの内容（行動の結果・感情・気づき・ブレーキ・明日への改善点など）を合わせて10文字以上入力してから実行してください。'
      );
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);
    try {
      const res = await fetch('/api/ai/improvement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionResultText: aiInputText }),
      });
      const json = (await res.json()) as { suggestion?: string; error?: string };
      if (!res.ok) throw new Error(json.error || 'Aiコーチからのコメントの生成に失敗しました。');
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
    if (!aiSuggestion || !data) return;
    try {
      setAiSaving(true);
      setAiError(null);
      await savePatch({ eveningAiSuggestionText: aiSuggestion });
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

  if (!user && !loading) {
    return (
      <div className="trial-tab-content">
        <div className="morning-evening-container">
          <div className="trial-tab-heading-row">
            <h2 id="morning-evening-section-title">朝・晩</h2>
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
            <h2 id="morning-evening-section-title">朝・晩</h2>
          </div>
          <p className="text-sm text-gray-500">読み込み中…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trial-tab-content">
      <div className="morning-evening-container">
        <div className="trial-tab-heading-row">
          <h2 id="morning-evening-section-title">朝・晩</h2>
        </div>
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
                disabled={saving}
                aria-pressed={data.morningAffirmationDeclaration === 'done'}
                onClick={() =>
                  void savePatch({
                    morningAffirmationDeclaration:
                      data.morningAffirmationDeclaration === 'done' ? 'undone' : 'done',
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
              <textarea
                className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                value={data.morningTodayActionText ?? ''}
                disabled={saving}
                onChange={(e) => setData((prev) => (prev ? { ...prev, morningTodayActionText: e.target.value } : prev))}
                onBlur={() => void savePatch({ morningTodayActionText: data.morningTodayActionText })}
                placeholder="入力してください"
              />
            </div>
            {journalShowMorningActionContent(level) ? (
              <div className="form-row">
                <span className="trial-l3-label">行動内容：どのように</span>
                <textarea
                  className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                  value={data.morningActionContentText ?? ''}
                  disabled={saving}
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
                    disabled={saving}
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

        {/* 晩コンテナ */}
        <div className="action-sub-section" data-section="evening">
          <h3>晩のアクション</h3>

          <h4 className="trial-form-heading-l2">
            <span className="trial-heading-mark" aria-hidden="true">◇</span>
            行動の実行状況
          </h4>
          <div className="trial-form-block-l3">
            <div className="form-row">
              <TrialSegmentedToggle<Trial4wEveningExecution>
                value={data.eveningExecution}
                disabled={saving}
                options={[
                  { value: 'done', label: 'できた' },
                  { value: 'partial', label: '一部できた' },
                  { value: 'none', label: 'できなかった' },
                ]}
                onPick={(v) => void savePatch({ eveningExecution: v })}
              />
            </div>
            {journalShowEveningSpecificActions(level) &&
            (data.eveningExecution === 'done' || data.eveningExecution === 'partial') && (
              <div className="form-row">
                <span className="trial-l3-label">具体的な行動内容</span>
                <textarea
                  className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                  value={data.eveningSpecificActionsText ?? ''}
                  disabled={saving}
                  onChange={(e) =>
                    setData((prev) =>
                      prev ? { ...prev, eveningSpecificActionsText: e.target.value } : prev
                    )
                  }
                  onBlur={() => void savePatch({ eveningSpecificActionsText: data.eveningSpecificActionsText })}
                  placeholder="入力してください"
                />
              </div>
            )}
          </div>

          <h4 className="trial-form-heading-l2">
            <span className="trial-heading-mark" aria-hidden="true">◇</span>
            行動の結果
          </h4>
          <div className="trial-form-block-l3">
            {journalShowSupplementaryDetails(level) ? (
              <InfoDetails
                title="補足（クリックで表示）"
                body={`行動の成果とは、実際に行ってみてどの程度達成できたか\nあるいは、最終目標にどの程度近づいたかを振り返ります。\n行動のし方に焦点をあてます。\n具体的に言語化することで、現在の行動のし方がどの程度\n成果につながっていけるかのヒントになります。`}
              />
            ) : null}
            {journalShowEveningResultDetailTexts(level) ? (
              <>
                <div className="form-row">
                  <span className="trial-l3-label">どのように行いどの程度できたか</span>
                  <textarea
                    className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                    value={data.eveningResultText ?? ''}
                    disabled={saving}
                    onChange={(e) =>
                      setData((prev) => (prev ? { ...prev, eveningResultText: e.target.value } : prev))
                    }
                    onBlur={() => void savePatch({ eveningResultText: data.eveningResultText })}
                    placeholder="入力してください"
                  />
                </div>
                <div className="form-row">
                  <span className="trial-l3-label">目標・指標に対しどの程度近づけたか</span>
                  <textarea
                    className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                    value={data.eveningResultGoalProgressText ?? ''}
                    disabled={saving}
                    onChange={(e) =>
                      setData((prev) =>
                        prev ? { ...prev, eveningResultGoalProgressText: e.target.value } : prev
                      )
                    }
                    onBlur={() =>
                      void savePatch({ eveningResultGoalProgressText: data.eveningResultGoalProgressText })
                    }
                    placeholder="入力してください"
                  />
                </div>
              </>
            ) : null}
            <div className="form-row">
              <span className="trial-l3-label">満足度：10点満点での評価</span>
              <div className="satisfaction-input">
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={data.eveningSatisfaction ?? ''}
                  disabled={saving}
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

          {journalShowEveningEmotionThought(level) ? (
            <>
              <h4 className="trial-form-heading-l2">
                <span className="trial-heading-mark" aria-hidden="true">◇</span>
                行動時の感情・思考
              </h4>
              <div className="trial-form-block-l3">
                <div className="form-row">
                  <textarea
                    className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                    value={data.eveningEmotionThoughtText ?? ''}
                    disabled={saving}
                    onChange={(e) =>
                      setData((prev) =>
                        prev ? { ...prev, eveningEmotionThoughtText: e.target.value } : prev
                      )
                    }
                    onBlur={() => void savePatch({ eveningEmotionThoughtText: data.eveningEmotionThoughtText })}
                    placeholder="入力してください"
                  />
                </div>
              </div>
            </>
          ) : null}

          <h4 className="trial-form-heading-l2">
            <span className="trial-heading-mark" aria-hidden="true">◇</span>
            こころのブレーキ
          </h4>
          <div className="trial-form-block-l3">
            <div className="form-row">
              <TrialSegmentedToggle<Trial4wEveningBrake>
                value={data.eveningBrake}
                disabled={saving}
                options={[
                  { value: 'yes', label: '働いた' },
                  { value: 'partial', label: '一部働いた' },
                  { value: 'no', label: '働かなかった' },
                ]}
                onPick={(v) => void savePatch({ eveningBrake: v })}
              />
            </div>
            {journalShowEveningBrakeWhat(level) &&
              (data.eveningBrake === 'yes' || data.eveningBrake === 'partial') && (
                <div className="form-row">
                  <span className="trial-l3-label">どんなブレーキだったか</span>
                  <textarea
                    className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                    value={data.eveningBrakeWorkedText ?? ''}
                    disabled={saving}
                    onChange={(e) =>
                      setData((prev) =>
                        prev ? { ...prev, eveningBrakeWorkedText: e.target.value } : prev
                      )
                    }
                    onBlur={() => void savePatch({ eveningBrakeWorkedText: data.eveningBrakeWorkedText })}
                    placeholder="入力してください"
                  />
                </div>
              )}
            {journalShowEveningBrakeRebutted(level) &&
              (data.eveningBrake === 'yes' || data.eveningBrake === 'partial') && (
                <div className="form-row">
                  <span className="trial-l3-label">反論できたか</span>
                  <TrialSegmentedToggle<Trial4wEveningExecution>
                    value={data.eveningBrakeRebuttalChoice}
                    disabled={saving}
                    options={[
                      { value: 'done', label: 'できた' },
                      { value: 'partial', label: '一部できた' },
                      { value: 'none', label: 'できなかった' },
                    ]}
                    onPick={(v) => void savePatch({ eveningBrakeRebuttalChoice: v })}
                  />
                </div>
              )}
            {journalShowEveningBrakeWords(level) &&
              (data.eveningBrake === 'yes' || data.eveningBrake === 'partial') && (
                <div className="form-row">
                  <span className="trial-l3-label">どんな反論の言葉を使ったか</span>
                  <textarea
                    className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                    value={data.eveningBrakeWordsText ?? ''}
                    disabled={saving}
                    onChange={(e) =>
                      setData((prev) =>
                        prev ? { ...prev, eveningBrakeWordsText: e.target.value } : prev
                      )
                    }
                    onBlur={() => void savePatch({ eveningBrakeWordsText: data.eveningBrakeWordsText })}
                    placeholder="入力してください"
                  />
                </div>
              )}
          </div>

          <h4 className="trial-form-heading-l2">
            <span className="trial-heading-mark" aria-hidden="true">◇</span>
            今日の気づき・感動・学びと課題
          </h4>
          <div className="trial-form-block-l3">
            <div className="form-row">
              <textarea
                className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                value={data.eveningInsightText ?? ''}
                disabled={saving}
                onChange={(e) => setData((prev) => (prev ? { ...prev, eveningInsightText: e.target.value } : prev))}
                onBlur={() => void savePatch({ eveningInsightText: data.eveningInsightText })}
                placeholder="入力してください"
              />
            </div>
          </div>

          {journalShowEveningImprovement(level) ? (
            <>
              <h4 className="trial-form-heading-l2">
                <span className="trial-heading-mark" aria-hidden="true">◇</span>
                明日への改善点
              </h4>
              <div className="trial-form-block-l3">
                <div className="form-row">
                  <textarea
                    className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                    value={data.eveningImprovementText ?? ''}
                    disabled={saving}
                    onChange={(e) =>
                      setData((prev) =>
                        prev ? { ...prev, eveningImprovementText: e.target.value } : prev
                      )
                    }
                    onBlur={() => void savePatch({ eveningImprovementText: data.eveningImprovementText })}
                    placeholder="入力してください"
                  />
                </div>
                <div className="form-row">
                  <button
                    type="button"
                    className={`trial-action-btn ${canRunAiSuggestion && !saving ? 'ai-action-btn-ready' : ''}`}
                    disabled={!canRunAiSuggestion || saving}
                    onClick={() => void handleGenerateAiSuggestion()}
                  >
                    Aiコーチからのコメント
                  </button>
                  <p className="text-xs text-gray-600">
                    本日の実行回数: {aiRunCount}/{AI_SUGGESTION_DAILY_LIMIT}（残り {aiRemainingCount} 回）
                  </p>
                  {isAiRunLimitReached ? (
                    <p className="text-xs text-amber-700">
                      本日のAiコーチからのコメントの上限（{AI_SUGGESTION_DAILY_LIMIT}回）に達したため、明日再度ご利用ください。
                    </p>
                  ) : null}
                  {!canRunAiSuggestion && !isAiRunLimitReached ? (
                    <p className="text-xs text-gray-600">
                      行動の結果・感情・気づき・ブレーキ・明日への改善点などを合わせて10文字以上入力すると実行できます。
                    </p>
                  ) : null}
                  {aiLoading ? (
                    <p className="text-xs text-gray-600">Aiコーチからのコメントを生成中です…</p>
                  ) : null}
                  {aiError ? <p className="text-xs text-red-600">{aiError}</p> : null}
                  {aiSuggestion ? (
                    <>
                      <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 whitespace-pre-wrap">
                        {aiSuggestion}
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
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          <h4 className="trial-form-heading-l2">
            <span className="trial-heading-mark" aria-hidden="true">◇</span>
            明日の行動
          </h4>
          {level === 'simple' ? (
            <p className="text-xs text-gray-600 mb-2 -mt-1">
              簡易表示では目標を一文で十分です。「詳細」表示にすると「明日への改善点」とAiコーチからのコメントを利用できます。
            </p>
          ) : null}
          <div className="trial-form-block-l3">
            <div className="form-row">
              <span className="trial-l3-label">目標（一文で）</span>
              <textarea
                className={`w-full text-sm border border-gray-300 rounded p-2 ${level === 'simple' ? 'min-h-[52px]' : 'min-h-[100px]'}`}
                rows={level === 'simple' ? 2 : 4}
                value={data.eveningTomorrowActionSeedText ?? ''}
                disabled={saving}
                onChange={(e) =>
                  setData((prev) =>
                    prev ? { ...prev, eveningTomorrowActionSeedText: e.target.value } : prev
                  )
                }
                onBlur={() => void savePatch({ eveningTomorrowActionSeedText: data.eveningTomorrowActionSeedText })}
                placeholder="入力してください（保存すると翌日の朝「今日の行動内容（目標）」に反映されます）"
              />
              <p className="text-xs text-gray-600">
                保存時、翌日の「今日の行動内容（目標）」が未入力なら自動でコピーします。
              </p>
            </div>
            {journalShowEveningTomorrowActionContent(level) ? (
              <div className="form-row">
                <span className="trial-l3-label">行動内容（具体的に）</span>
                <textarea
                  className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                  value={data.eveningTomorrowActionContentText ?? ''}
                  disabled={saving}
                  onChange={(e) =>
                    setData((prev) =>
                      prev ? { ...prev, eveningTomorrowActionContentText: e.target.value } : prev
                    )
                  }
                  onBlur={() =>
                    void savePatch({ eveningTomorrowActionContentText: data.eveningTomorrowActionContentText })
                  }
                  placeholder="入力してください"
                />
              </div>
            ) : null}
            {journalShowEveningTomorrowImaging(level) ? (
              <div className="form-row">
                <span className="trial-l3-label">明日の行動のイメージング</span>
                <button
                  type="button"
                  className={`trial-segmented-toggle__btn${data.eveningTomorrowImagingDone === true ? ' trial-segmented-toggle__btn--active' : ''}`}
                  disabled={saving}
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

          {journalShowEveningSelfMessage(level) ? (
            <>
              <h4 className="trial-form-heading-l2">
                <span className="trial-heading-mark" aria-hidden="true">◇</span>
                今日の自分へのねぎらいの一言
              </h4>
              <div className="trial-form-block-l3">
                <div className="form-row">
                  <textarea
                    className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                    value={data.eveningMessageToSelfText ?? ''}
                    disabled={saving}
                    onChange={(e) =>
                      setData((prev) =>
                        prev ? { ...prev, eveningMessageToSelfText: e.target.value } : prev
                      )
                    }
                    onBlur={() => void savePatch({ eveningMessageToSelfText: data.eveningMessageToSelfText })}
                    placeholder="入力してください"
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
