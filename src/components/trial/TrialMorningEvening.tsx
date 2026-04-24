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
  type Trial4wMorningAffirmationDeclaration,
  type Trial4wDailyPlain,
} from '@/lib/firestore';
import TrialSaveStatusLine from '@/components/trial/TrialSaveStatusLine';
import {
  journalShowEveningBrakeRebutted,
  journalShowEveningEmotionThought,
  journalShowEveningSelfMessage,
  journalShowEveningSpecificActions,
  journalShowMorningImaging,
  journalShowSupplementaryDetails,
} from '@/lib/journalDetailLevel';

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
        eveningRebuttalText: null,
        eveningBrakeWorkedText: null,
        eveningBrakeRebuttedText: null,
        eveningBrakeWordsText: null,
        eveningInsightText: null,
        eveningImprovementText: null,
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

  const aiInputText =
    ((data?.eveningResultExecutionText ?? '').trim() || (data?.eveningResultText ?? '').trim());
  const canRunAiSuggestion = aiInputText.length >= 10 && !aiLoading;

  const handleGenerateAiSuggestion = async () => {
    if (!canRunAiSuggestion) {
      setAiError('「行動の結果」を10文字以上入力してから実行してください。');
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
      if (!res.ok) throw new Error(json.error || 'AI改善提案の生成に失敗しました。');
      if (!json.suggestion || typeof json.suggestion !== 'string') {
        throw new Error('AI改善提案の形式が不正です。');
      }
      setAiSuggestion(json.suggestion);
    } catch (e) {
      console.error(e);
      setAiError(
        e instanceof Error
          ? e.message
          : 'AI改善提案の生成に失敗しました。時間をおいて再実行してください。'
      );
    } finally {
      setAiLoading(false);
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
            今日の行動目標
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
            <div className="form-row">
              <span className="trial-l3-label">どのように行いどの程度できたか</span>
              <textarea
                className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                value={data.eveningResultText ?? ''}
                disabled={saving}
                onChange={(e) => setData((prev) => (prev ? { ...prev, eveningResultText: e.target.value } : prev))}
                onBlur={() => void savePatch({ eveningResultText: data.eveningResultText })}
                placeholder="入力してください"
              />
              <button
                type="button"
                className={`trial-action-btn ${canRunAiSuggestion && !saving ? 'ai-action-btn-ready' : ''}`}
                disabled={!canRunAiSuggestion || saving}
                onClick={() => void handleGenerateAiSuggestion()}
              >
                Ai改善提案
              </button>
              {!canRunAiSuggestion ? (
                <p className="text-xs text-gray-600">「行動の結果」を10文字以上入力すると実行できます。</p>
              ) : null}
              {aiLoading ? <p className="text-xs text-gray-600">改善提案を生成中です…</p> : null}
              {aiError ? <p className="text-xs text-red-600">{aiError}</p> : null}
              {aiSuggestion ? (
                <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 whitespace-pre-wrap">
                  {aiSuggestion}
                </p>
              ) : null}
            </div>
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
            {journalShowEveningBrakeRebutted(level) &&
            (data.eveningBrake === 'yes' || data.eveningBrake === 'partial') && (
              <div className="form-row">
                <span className="trial-l3-label">その時に反論できたか？ できた時の反論の言葉は何か</span>
                <textarea
                  className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                  value={data.eveningRebuttalText ?? ''}
                  disabled={saving}
                  onChange={(e) =>
                    setData((prev) =>
                      prev ? { ...prev, eveningRebuttalText: e.target.value } : prev
                    )
                  }
                  onBlur={() => void savePatch({ eveningRebuttalText: data.eveningRebuttalText })}
                  placeholder="入力してください"
                />
              </div>
            )}
          </div>

          <h4 className="trial-form-heading-l2">
            <span className="trial-heading-mark" aria-hidden="true">◇</span>
            今日の気づき・感動・学び
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

          <h4 className="trial-form-heading-l2">
            <span className="trial-heading-mark" aria-hidden="true">◇</span>
            明日の行動
          </h4>
          <div className="trial-form-block-l3">
            <div className="form-row">
              <span className="trial-l3-label">目標（一文で）</span>
              <textarea
                className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
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
