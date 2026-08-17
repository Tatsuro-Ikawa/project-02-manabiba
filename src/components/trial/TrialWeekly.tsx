'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatWeekRangeShortJa,
  getWeekStartDateKeyForToday,
  getTodayDateKeyTokyo,
  getWeekStartDateKeyForDateKey,
  getJsWeekdayInTokyo,
  resolveJournalWeekStartsOn,
  shiftWeekStartDateKey,
} from '@/lib/journalWeek';
import { useJournalDetailLevel } from '@/context/JournalDetailLevelContext';
import TrialSaveStatusLine from '@/components/trial/TrialSaveStatusLine';
import { JournalCoachShareHeader } from '@/components/trial/JournalCoachShareHeader';
import { AutosizeTextarea } from '@/components/trial/AutosizeTextarea';
import {
  journalShowWeeklyActionReviewText,
  journalShowWeeklyAiImprovementSuggestion,
  journalShowWeeklyAiReportSection,
  journalShowWeeklyIssueRootCauseSection,
  journalShowWeeklyMetricAchievement,
  journalShowWeeklyNextImprovementSection,
  journalShowWeeklyNextWeekActionContent,
  journalShowWeeklyOutcomeReview,
  journalShowWeeklySelfPraiseSection,
  journalShowWeeklyThisWeekActionContent,
} from '@/lib/journalDetailLevel';
import {
  addDaysDateKey,
  carryOverNextWeekGoalToNextThisWeek,
  getJournalWeeklyPlain,
  journalWeeklyPlainEmpty,
  listJournalDailyPlainInRange,
  saveJournalWeeklyPlain,
  type Trial4wDailyPlain,
  type JournalWeeklyPlain,
} from '@/lib/firestore';
import {
  buildWeeklyImprovementInputText,
  validateWeeklyImprovementInput,
  WEEKLY_IMPROVEMENT_MIN_TOTAL_CHARS,
} from '@/lib/weeklyImprovementAi';
import { AI_REPORT_INPUT_MIN_TOTAL_CHARS, applyAiReportWriteMode } from '@/lib/journalAiReportWriteMode';
import { buildJsonAuthHeaders } from '@/lib/clientAuthHeaders';
import { messageFromApiErrorPayload } from '@/lib/apiErrorMessage';
import { buildWeeklyAiReportInputFromDailies } from '@/lib/weeklyAiReportInputFromDailies';
import { computeEveningExecutionSymbol, computeMorningCompletionSymbol } from '@/lib/trialDailyWeekSymbols';
import { WeeklySatisfactionChart } from '@/components/trial/WeeklySatisfactionChart';
import { useTrialJournalCoachContext } from '@/hooks/useTrialJournalCoachContext';

const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

function WeeklyTextRow({
  label,
  value,
  disabled,
  onChange,
  onBlur,
  placeholder,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
}) {
  return (
    <div className="form-row">
      <div className="label-wrap">
        <span>{label}</span>
      </div>
      <AutosizeTextarea
        className="w-full text-sm border border-gray-300 rounded p-2"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => void onBlur()}
        placeholder={placeholder}
      />
    </div>
  );
}

type WeeklyReportsResponse = {
  reports: {
    actionAspect: string;
    outcomeAspect: string;
    psychologyAspect: string;
    insightGrowth: string;
  };
  charCountTotal?: number;
  usageTotalTokenCount?: number;
};

/** 週次の各 Ai 機能（レポート作成・改善提案）あたりの 1 日上限（JST）。成功時のみカウント */
const WEEKLY_AI_DAILY_LIMIT = 3;

type TrialWeeklyProps = {
  coachClientUid?: string | null;
};

export default function TrialWeekly({ coachClientUid = null }: TrialWeeklyProps) {
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
  const [weekStartKey, setWeekStartKey] = useState('');
  const [data, setData] = useState<JournalWeeklyPlain | null>(null);
  const [dailyByDateKey, setDailyByDateKey] = useState<Record<string, Trial4wDailyPlain>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [weeklyAiUsageTotalTokens, setWeeklyAiUsageTotalTokens] = useState<number | null>(null);
  const [weeklyImprovementPreview, setWeeklyImprovementPreview] = useState<string | null>(null);
  /** API の usageTotalTokenCount。本文とは分離し、プレビュー表示時のみ文末に結合する */
  const [weeklyImprovementPreviewUsageTokens, setWeeklyImprovementPreviewUsageTokens] = useState<number | null>(
    null
  );
  const [weeklyImprovementLoading, setWeeklyImprovementLoading] = useState(false);
  const [weeklyImprovementError, setWeeklyImprovementError] = useState<string | null>(null);

  const fallbackWeekStart = contentUid ? getWeekStartDateKeyForToday(journalProfile ?? null) : '';
  const weekParam = searchParams.get('week'); // YYYY-MM-DD（週の開始日）
  const displayWeekStartKey = weekStartKey || fallbackWeekStart;
  const weekEndKey = useMemo(() => (displayWeekStartKey ? addDaysDateKey(displayWeekStartKey, 6) : ''), [displayWeekStartKey]);
  const todayKey = useMemo(() => getTodayDateKeyTokyo(), []);
  const weekDates = useMemo(() => {
    if (!displayWeekStartKey) return [];
    return Array.from({ length: 7 }, (_, i) => addDaysDateKey(displayWeekStartKey, i));
  }, [displayWeekStartKey]);

  const coachSummaryByDate = data?.coachDailySummaryByDate ?? {};

  const satisfactionStats = useMemo(() => {
    const points = weekDates
      .map((dk) => {
        if (dk > todayKey) return null;
        const v = isCoachView
          ? coachSummaryByDate[dk]?.eveningSatisfaction
          : dailyByDateKey[dk]?.eveningSatisfaction;
        return typeof v === 'number' ? v : null;
      })
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    const avg = points.length ? points.reduce((a, b) => a + b, 0) / points.length : null;
    return { avg, count: points.length };
  }, [weekDates, dailyByDateKey, coachSummaryByDate, todayKey, isCoachView]);

  const satisfactionChartData = useMemo(() => {
    return weekDates.map((dk) => {
      const [, mm, dd] = dk.split('-').map((x) => Number(x));
      const wd = getJsWeekdayInTokyo(dk);
      const isFuture = dk > todayKey;
      const v = !isFuture
        ? isCoachView
          ? coachSummaryByDate[dk]?.eveningSatisfaction
          : dailyByDateKey[dk]?.eveningSatisfaction
        : null;
      return {
        dateKey: dk,
        label: `${mm}/${dd}`,
        satisfaction: typeof v === 'number' ? v : null,
        dow: DOW_JA[wd],
      };
    });
  }, [weekDates, dailyByDateKey, coachSummaryByDate, todayKey, isCoachView]);

  useEffect(() => {
    if (!contentUid || !coachContextReady) return;
    // 初期値: URL の week があればそれを採用。なければ「今日を含む週」。
    setWeekStartKey(weekParam || getWeekStartDateKeyForToday(journalProfile ?? null));
  }, [contentUid, journalProfile, weekParam, coachContextReady]);

  useEffect(() => {
    if (!contentUid) return;
    // 週が変わったら URL を同期（tab は親が持つが、週キーは本コンポーネントが正）
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'weekly');
    if (displayWeekStartKey) url.searchParams.set('week', displayWeekStartKey);
    window.history.replaceState({}, '', url.pathname + url.search);
  }, [contentUid, displayWeekStartKey]);

  useEffect(() => {
    if (!contentUid || !displayWeekStartKey || !coachContextReady) return;
    let cancelled = false;
    const shareDefault = !isCoachView && journalProfile?.journalCoachShareDefaultOn === true;
    setData(journalWeeklyPlainEmpty(displayWeekStartKey, shareDefault));
    setMsg(null);
    setWeeklyAiUsageTotalTokens(null);
    setWeeklyImprovementPreview(null);
    setWeeklyImprovementPreviewUsageTokens(null);
    setWeeklyImprovementError(null);
    void (async () => {
      try {
        const doc = await getJournalWeeklyPlain(contentUid, displayWeekStartKey, {
          sharedWithCoachDefault: shareDefault,
        });
        if (!cancelled) setData(doc);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const code = typeof e === 'object' && e !== null && 'code' in e ? (e as { code?: string }).code : null;
          if (isCoachView && code === 'permission-denied') {
            setMsg(
              coachCommentsEnabled
                ? 'この週はクライアントが「コーチと共有」を ON にしていないか、閲覧権限がありません。'
                : 'クライアントのプランにパーソナルコーチ機能（coachComments）がありません。'
            );
          } else {
            setMsg(
              '読み込みに失敗しました。Firestore ルールのデプロイ（journal_weekly）とログイン状態を確認してください。'
            );
          }
          setData(journalWeeklyPlainEmpty(displayWeekStartKey, shareDefault));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    contentUid,
    displayWeekStartKey,
    coachContextReady,
    isCoachView,
    coachCommentsEnabled,
    journalProfile?.journalCoachShareDefaultOn,
  ]);

  useEffect(() => {
    if (isCoachView || !user?.uid || !displayWeekStartKey || !weekEndKey) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listJournalDailyPlainInRange({
          uid: user.uid,
          startDateKey: displayWeekStartKey,
          endDateKey: weekEndKey,
        });
        if (!cancelled) setDailyByDateKey(rows);
      } catch (e) {
        console.error(e);
        if (!cancelled) setDailyByDateKey({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.uid, displayWeekStartKey, weekEndKey]);

  const savePatch = useCallback(
    async (patch: Partial<JournalWeeklyPlain>) => {
      if (!user || !data || !canEdit || !contentUid) return;
      setSaving(true);
      setMsg(null);
      try {
        await saveJournalWeeklyPlain({
          uid: contentUid,
          weekStartKey: data.weekStartKey,
          patch: { sharedWithCoach: !!data.sharedWithCoach, ...patch },
        });
        const fresh = await getJournalWeeklyPlain(contentUid, data.weekStartKey);
        setData(fresh);
        setMsg('保存しました。');
        setTimeout(() => setMsg(null), 2500);
      } catch (e) {
        console.error(e);
        setMsg(e instanceof Error ? e.message : '保存に失敗しました。');
      } finally {
        setSaving(false);
      }
    },
    [user, data, canEdit, contentUid]
  );

  const generateAiWeeklyReport = useCallback(async () => {
    if (!user || !data) return;

    const currentRunCount =
      data.weeklyAiReportRunDateKey === todayKey ? data.weeklyAiReportRunCount ?? 0 : 0;
    if (currentRunCount >= WEEKLY_AI_DAILY_LIMIT) {
      setMsg(`Aiレポート作成は1日${WEEKLY_AI_DAILY_LIMIT}回までです。`);
      return;
    }

    const weeklyInputText = buildWeeklyAiReportInputFromDailies(weekDates, todayKey, dailyByDateKey);
    if ([...weeklyInputText].length < AI_REPORT_INPUT_MIN_TOTAL_CHARS) {
      setMsg(
        `週次AIレポート作成の入力が不足しています（連結テキストは合計${AI_REPORT_INPUT_MIN_TOTAL_CHARS}文字以上になるまで、朝・晩の記入をお願いします）。`
      );
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const authHeaders = await buildJsonAuthHeaders(user);
      const res = await fetch('/api/ai/weekly-report', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyInputText }),
      });
      const payload = (await res.json()) as WeeklyReportsResponse & { error?: string | { message?: string } };
      if (!res.ok || !payload?.reports) {
        throw new Error(messageFromApiErrorPayload(payload) || '週次AIレポートの作成に失敗しました。');
      }

      const writeMode = journalProfile?.weeklyAiReportWriteMode ?? 'append';
      const patch: Partial<JournalWeeklyPlain> = {
        weeklyActionReviewText: applyAiReportWriteMode(
          data.weeklyActionReviewText,
          payload.reports.actionAspect,
          writeMode
        ),
        weeklyOutcomeReviewText: applyAiReportWriteMode(
          data.weeklyOutcomeReviewText,
          payload.reports.outcomeAspect,
          writeMode
        ),
        weeklyPsychologyText: applyAiReportWriteMode(
          data.weeklyPsychologyText,
          payload.reports.psychologyAspect,
          writeMode
        ),
        insightAndLearningText: applyAiReportWriteMode(
          data.insightAndLearningText,
          payload.reports.insightGrowth,
          writeMode
        ),
        weeklyAiReportRunDateKey: todayKey,
        weeklyAiReportRunCount: currentRunCount + 1,
      };

      await savePatch(patch);
      setWeeklyAiUsageTotalTokens((prev) => {
        if (typeof payload.usageTotalTokenCount !== 'number' || !Number.isFinite(payload.usageTotalTokenCount)) {
          return prev;
        }
        return Math.max(0, Math.floor(payload.usageTotalTokenCount));
      });
      setMsg('Aiレポートを反映しました。');
    } catch (e) {
      console.error(e);
      setMsg(e instanceof Error ? e.message : '週次AIレポートの作成に失敗しました。');
    } finally {
      setSaving(false);
    }
  }, [user, data, todayKey, weekDates, dailyByDateKey, journalProfile?.weeklyAiReportWriteMode, savePatch]);

  useEffect(() => {
    if (!journalShowWeeklyAiImprovementSuggestion(level)) {
      setWeeklyImprovementPreview(null);
      setWeeklyImprovementPreviewUsageTokens(null);
      setWeeklyImprovementError(null);
    }
  }, [level]);

  const runWeeklyImprovementAi = useCallback(async () => {
    if (!user || !data) return;
    const v = validateWeeklyImprovementInput(data);
    if (!v.ok) {
      setWeeklyImprovementError(
        `参照入力の合計が${WEEKLY_IMPROVEMENT_MIN_TOTAL_CHARS}文字以上必要です（現在 ${v.totalChars} 文字）。空欄のままの項目があっても構いません。`
      );
      return;
    }
    const improvementRunCount =
      data.weeklyAiImprovementRunDateKey === todayKey ? data.weeklyAiImprovementRunCount ?? 0 : 0;
    if (improvementRunCount >= WEEKLY_AI_DAILY_LIMIT) {
      setWeeklyImprovementError(`Ai改善提案は1日${WEEKLY_AI_DAILY_LIMIT}回までです。`);
      return;
    }
    const input = buildWeeklyImprovementInputText(data);
    setWeeklyImprovementError(null);
    setWeeklyImprovementPreview(null);
    setWeeklyImprovementPreviewUsageTokens(null);
    setWeeklyImprovementLoading(true);
    try {
      const authHeaders = await buildJsonAuthHeaders(user);
      const res = await fetch('/api/ai/weekly-improvement', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyImprovementInputText: input }),
      });
      const json = (await res.json()) as {
        suggestion?: string;
        error?: string | { message?: string };
        usageTotalTokenCount?: number;
      };
      if (!res.ok) throw new Error(messageFromApiErrorPayload(json) || 'Ai改善提案の生成に失敗しました。');
      if (!json.suggestion || typeof json.suggestion !== 'string') {
        throw new Error('Ai改善提案の形式が不正です。');
      }
      const nextImprovementCount = improvementRunCount + 1;
      await saveJournalWeeklyPlain({
        uid: user.uid,
        weekStartKey: data.weekStartKey,
        patch: {
          weeklyAiImprovementRunDateKey: todayKey,
          weeklyAiImprovementRunCount: nextImprovementCount,
        },
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              weeklyAiImprovementRunDateKey: todayKey,
              weeklyAiImprovementRunCount: nextImprovementCount,
            }
          : prev
      );
      setWeeklyImprovementPreview(json.suggestion.trim());
      setWeeklyImprovementPreviewUsageTokens(
        typeof json.usageTotalTokenCount === 'number' && Number.isFinite(json.usageTotalTokenCount)
          ? Math.max(0, Math.floor(json.usageTotalTokenCount))
          : null
      );
    } catch (e) {
      console.error(e);
      setWeeklyImprovementError(
        e instanceof Error ? e.message : 'Ai改善提案の生成に失敗しました。時間をおいて再試行してください。'
      );
    } finally {
      setWeeklyImprovementLoading(false);
    }
  }, [user, data, todayKey]);

  const saveWeeklyImprovementPreview = useCallback(async () => {
    if (!weeklyImprovementPreview || !user || !data) return;
    setWeeklyImprovementError(null);
    setSaving(true);
    setMsg(null);
    try {
      await saveJournalWeeklyPlain({
        uid: user.uid,
        weekStartKey: data.weekStartKey,
        patch: { aiImprovementSuggestionText: weeklyImprovementPreview },
      });
      const fresh = await getJournalWeeklyPlain(user.uid, data.weekStartKey);
      setData(fresh);
      setWeeklyImprovementPreview(null);
      setWeeklyImprovementPreviewUsageTokens(null);
      setMsg('Ai改善提案を保存しました。');
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      console.error(e);
      setWeeklyImprovementError(
        e instanceof Error ? e.message : 'Ai改善提案の保存に失敗しました。時間をおいて再試行してください。'
      );
    } finally {
      setSaving(false);
    }
  }, [weeklyImprovementPreview, user, data]);

  const getBaseWeekStartKey = useCallback(() => {
    return (
      weekStartKey ||
      getWeekStartDateKeyForDateKey(getTodayDateKeyTokyo(), resolveJournalWeekStartsOn(journalProfile ?? null))
    );
  }, [weekStartKey, journalProfile]);

  const gotoPrevWeek = useCallback(() => {
    const base = getBaseWeekStartKey();
    setWeekStartKey(shiftWeekStartDateKey(base, -1));
  }, [getBaseWeekStartKey]);

  const gotoNextWeek = useCallback(async () => {
    if (!data) return;
    const base = getBaseWeekStartKey();
    const nextKey = shiftWeekStartDateKey(base, 1);
    if (isCoachView) {
      setWeekStartKey(nextKey);
      return;
    }
    if (!user) return;

    // 来週目標があれば、翌週の「今週目標」に上書きなしでコピー
    setSaving(true);
    try {
      await carryOverNextWeekGoalToNextThisWeek({
        uid: user.uid,
        targetWeekStartKey: nextKey,
        nextWeekGoalText: data.nextWeekGoalText,
        nextWeekActionContentText: data.nextWeekActionContentText,
      });
      setWeekStartKey(nextKey);
    } catch (e) {
      console.error(e);
      setMsg(e instanceof Error ? e.message : '週の切り替えに失敗しました。');
      setSaving(false);
      return;
    }
    setSaving(false);
  }, [user, data, getBaseWeekStartKey, isCoachView]);

  const gotoDaily = useCallback(
    (dateKey: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'morning_evening');
      url.searchParams.set('date', dateKey);
      if (coachClientUid) {
        url.searchParams.set('coachClient', coachClientUid);
      }
      router.replace(url.pathname + url.search);
    },
    [router, coachClientUid]
  );

  if (isCoachView && !coachClientUid) {
    return (
      <div className="trial-tab-content">
        <div className="trial-weekly-container">
          <div className="trial-tab-heading-row">
            <h2 id="weekly-section-title">週</h2>
          </div>
          <p className="text-sm text-gray-600">メニューバーの「共有」からクライアントを選択してください。</p>
        </div>
      </div>
    );
  }

  if (coachContextError) {
    return (
      <div className="trial-tab-content">
        <div className="trial-weekly-container">
          <div className="trial-tab-heading-row">
            <h2 id="weekly-section-title">週</h2>
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
        <div className="trial-weekly-container">
          <div className="trial-tab-heading-row">
            <h2 id="weekly-section-title">週</h2>
          </div>
          <p className="text-sm text-gray-500">読み込み中…</p>
        </div>
      </div>
    );
  }

  if (!user && !loading) {
    return (
      <div className="trial-tab-content">
        <div className="trial-weekly-container">
          <div className="trial-tab-heading-row">
            <h2 id="weekly-section-title">週</h2>
          </div>
          <p className="text-sm text-gray-600">ログインすると週次を保存できます。</p>
        </div>
      </div>
    );
  }

  if (user && loading && !journalProfile && !isCoachView) {
    return (
      <div className="trial-tab-content">
        <div className="trial-weekly-container">
          <div className="trial-tab-heading-row">
            <h2 id="weekly-section-title">週</h2>
          </div>
          <p className="text-sm text-gray-500">読み込み中…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="trial-tab-content">
        <div className="trial-weekly-container">
          <div className="trial-tab-heading-row">
            <h2 id="weekly-section-title">週</h2>
          </div>
          <p className="text-sm text-gray-500">読み込み中…</p>
        </div>
      </div>
    );
  }

  const effectiveStart = resolveJournalWeekStartsOn(journalProfile ?? null);
  const aiRunCountToday =
    data.weeklyAiReportRunDateKey === todayKey ? data.weeklyAiReportRunCount ?? 0 : 0;
  const hasRunAiToday = aiRunCountToday > 0;
  const canRunAiWeeklyReport = aiRunCountToday < WEEKLY_AI_DAILY_LIMIT;

  const improvementAiRunCountToday =
    data.weeklyAiImprovementRunDateKey === todayKey ? data.weeklyAiImprovementRunCount ?? 0 : 0;
  const canRunAiImprovementByLimit = improvementAiRunCountToday < WEEKLY_AI_DAILY_LIMIT;
  const hasRunImprovementAiToday = improvementAiRunCountToday > 0;

  return (
    <div className="trial-tab-content">
      <div className="trial-weekly-container">
        <div className="trial-tab-heading-row trial-tab-heading-row--journal">
          <h2 id="weekly-section-title">週</h2>
          <JournalCoachShareHeader
            enabled={coachCommentsEnabled}
            checked={!!data.sharedWithCoach}
            disabled={!canEdit || saving}
            readOnly={isCoachView}
            ariaLabel="今週の学び帳をコーチに共有する"
            onChange={(v) => {
              setData((prev) => (prev ? { ...prev, sharedWithCoach: v } : prev));
              void savePatch({ sharedWithCoach: v });
            }}
          />
        </div>
        {isCoachView ? (
          <p className="text-sm text-gray-600 mb-2">
            クライアントの週次を閲覧中です（行動記号・満足度は週次共有に連動。日次本文は各日の「コーチと共有」ON
            のときのみ朝・晩タブで閲覧できます）。
          </p>
        ) : null}
        <p className="text-sm text-gray-600 mb-2">週の開始：{effectiveStart === 'monday' ? '月曜' : '日曜'}（JST）</p>

        <div className="week-nav">
          <button
            type="button"
            className="week-nav-btn"
            aria-label="前の週"
            disabled={saving}
            onClick={gotoPrevWeek}
          >
            ◁
          </button>
          <span className="week-nav-label">{formatWeekRangeShortJa(displayWeekStartKey)}</span>
          <button
            type="button"
            className="week-nav-btn"
            aria-label="次の週"
            disabled={saving}
            onClick={() => void gotoNextWeek()}
          >
            ▷
          </button>
        </div>

        <TrialSaveStatusLine message={msg} />

        <div className="action-sub-section" data-section="weekly-action">
          <h3>今週の行動</h3>
          <WeeklyTextRow
            label="◇行動目標：何を実行する"
            value={data.thisWeekActionGoalText ?? ''}
            disabled={saving}
            onChange={(v) => setData((prev) => (prev ? { ...prev, thisWeekActionGoalText: v } : prev))}
            onBlur={() => void savePatch({ thisWeekActionGoalText: data.thisWeekActionGoalText })}
            placeholder={"今週、特に注力して取組む行動を設定します。\n例：毎朝10分、振り返りを書く"}
          />
          {journalShowWeeklyThisWeekActionContent(level) ? (
            <WeeklyTextRow
              label="◇行動内容：どのように"
              value={data.thisWeekActionContentText ?? ''}
              disabled={saving}
              onChange={(v) => setData((prev) => (prev ? { ...prev, thisWeekActionContentText: v } : prev))}
              onBlur={() => void savePatch({ thisWeekActionContentText: data.thisWeekActionContentText })}
              placeholder="例：起床後すぐに机に座り、昨日の行動と気づきを3行で書く"
            />
          ) : null}
        </div>

        <div className="action-sub-section" data-section="weekly-reflection">
          <h3>今週の振り返り</h3>

          {journalShowWeeklyAiReportSection(level) ? (
            <div className="mb-4">
              <h4>◇Aiレポート作成</h4>
              <div className="form-row mt-2 mb-2">
                <button
                  type="button"
                  className={`trial-action-btn ${
                    hasRunAiToday ? 'ai-action-btn-done' : canRunAiWeeklyReport ? 'ai-action-btn-ready' : ''
                  }`}
                  disabled={saving || !canRunAiWeeklyReport}
                  onClick={() => void generateAiWeeklyReport()}
                >
                  Aiレポート作成を実行
                </button>
              </div>
              <p className="text-sm text-gray-600">
                当週の朝・晩の気づきノートを日付ごとに連結したテキスト（空欄は「無し」）をもとに、「行動面」「成果面」「心理面」「気づき・学び・成長」欄へ下書きを出力します。連結テキストは合計
                {AI_REPORT_INPUT_MIN_TOTAL_CHARS}
                文字以上で実行できます（手動で編集できます）。
                {weeklyAiUsageTotalTokens != null
                  ? `（使用トークン合計: ${weeklyAiUsageTotalTokens}）`
                  : '（使用トークン合計: —）'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                本日の成功実行回数: {aiRunCountToday}/{WEEKLY_AI_DAILY_LIMIT}（失敗はカウントしません）
              </p>
            </div>
          ) : null}

          <div className="action-sub-section" data-section="weekly-action-aspect">
            <h4>◇行動面</h4>
            <p className="text-sm text-gray-600 mb-3">
              {isCoachView
                ? '各日の朝・晩の実行結果（記号）。記号クリックで朝・晩へ移動できます（本文は日次「コーチと共有」ON の日のみ表示）。'
                : '各日の朝・晩の実行結果。記号をクリックすると当該日の朝・晩へ移動します。'}
            </p>
            <div className="weekly-result-grid" role="grid" aria-label="行動の結果（7日）">
              {weekDates.map((dk) => {
                const summary = isCoachView ? coachSummaryByDate[dk] : undefined;
                const d = isCoachView ? undefined : dailyByDateKey[dk];
                const m = summary
                  ? { sym: summary.morningSym, cls: summary.morningCls }
                  : computeMorningCompletionSymbol(d, dk, todayKey);
                const e = summary
                  ? { sym: summary.eveningSym, cls: summary.eveningCls }
                  : computeEveningExecutionSymbol(d, dk, todayKey);
                const [, mm, dd] = dk.split('-').map((x) => Number(x));
                const wd = getJsWeekdayInTokyo(dk);
                const openTitle = isCoachView
                  ? summary?.sharedWithCoach
                    ? '朝・晩本文を開く（日次共有 ON）'
                    : '朝・晩を開く（未共有の日は本文を表示できません）'
                  : undefined;
                return (
                  <div key={dk} className="weekly-result-cell" role="row">
                    <div className="weekly-result-date">{mm}/{dd}</div>
                    <div className="weekly-result-dow">{DOW_JA[wd]}</div>
                    <div className="weekly-result-symbols">
                      <button
                        type="button"
                        className={`weekly-symbol ${m.cls}`}
                        onClick={() => gotoDaily(dk)}
                        aria-label={`${dk} 朝`}
                        title={openTitle}
                      >
                        {m.sym}
                      </button>
                      <button
                        type="button"
                        className={`weekly-symbol ${e.cls}`}
                        onClick={() => gotoDaily(dk)}
                        aria-label={`${dk} 晩`}
                        title={openTitle}
                      >
                        {e.sym}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {journalShowWeeklyActionReviewText(level) ? (
              <WeeklyTextRow
                label="・行動の振り返り"
                value={data.weeklyActionReviewText ?? ''}
                disabled={saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, weeklyActionReviewText: v } : prev))}
                onBlur={() => void savePatch({ weeklyActionReviewText: data.weeklyActionReviewText })}
                placeholder="ここに、Aiレポート作成のアウトプット（行動面）を入力します。手動入力も可能です。"
              />
            ) : null}
          </div>

          <div className="action-sub-section" data-section="weekly-outcome-aspect">
            <h4>◇成果面</h4>
            <div className="weekly-satisfaction">
              <div className="weekly-satisfaction-row">
                <div className="label-wrap">
                  <span>満足度（今週の朝・晩の平均）</span>
                </div>
                <div className="weekly-satisfaction-value">
                  {satisfactionStats.avg == null ? '—' : satisfactionStats.avg.toFixed(1)} 点/10点
                  {satisfactionStats.count > 0 ? (
                    <span className="weekly-satisfaction-note">（{satisfactionStats.count}日分）</span>
                  ) : null}
                </div>
              </div>

              <div className="weekly-satisfaction-chart" aria-label="満足度の変化（折れ線）">
                <div className="text-sm text-gray-600 mb-2">満足度の変化</div>
                <WeeklySatisfactionChart data={satisfactionChartData} />
              </div>
            </div>

            {journalShowWeeklyOutcomeReview(level) ? (
              <WeeklyTextRow
                label="・成果への振り返り"
                value={data.weeklyOutcomeReviewText ?? ''}
                disabled={saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, weeklyOutcomeReviewText: v } : prev))}
                onBlur={() => void savePatch({ weeklyOutcomeReviewText: data.weeklyOutcomeReviewText })}
                placeholder="ここに、Aiレポート作成のアウトプット（成果面）を入力します。手動入力も可能です。"
              />
            ) : null}

            {journalShowWeeklyMetricAchievement(level) ? (
              <WeeklyTextRow
                label="・指標の達成度"
                value={data.weeklyMetricAchievementText ?? ''}
                disabled={saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, weeklyMetricAchievementText: v } : prev))}
                onBlur={() => void savePatch({ weeklyMetricAchievementText: data.weeklyMetricAchievementText })}
                placeholder="例：今週の指標（回数・時間・成果など）と達成度を記載してください。"
              />
            ) : null}
          </div>

          <div className="action-sub-section" data-section="weekly-psychology-aspect">
            <h4>◇心理面</h4>
            <WeeklyTextRow
              label="行動時の思考・感情の変化"
              value={data.weeklyPsychologyText ?? ''}
              disabled={saving}
              onChange={(v) => setData((prev) => (prev ? { ...prev, weeklyPsychologyText: v } : prev))}
              onBlur={() => void savePatch({ weeklyPsychologyText: data.weeklyPsychologyText })}
              placeholder="思考・感情の変化について記載してください。"
            />
          </div>

          <div className="action-sub-section" data-section="weekly-insight-growth">
            <h4>◇気づき・学び・成長</h4>
            <WeeklyTextRow
              label="内容"
              value={data.insightAndLearningText ?? ''}
              disabled={saving}
              onChange={(v) => setData((prev) => (prev ? { ...prev, insightAndLearningText: v } : prev))}
              onBlur={() => void savePatch({ insightAndLearningText: data.insightAndLearningText })}
              placeholder="入力してください"
            />
          </div>

          {journalShowWeeklyIssueRootCauseSection(level) ? (
            <div className="action-sub-section" data-section="weekly-root-cause">
              <h4>◇課題と原因の深掘り</h4>
              <WeeklyTextRow
                label="内容"
                value={data.weeklyIssueRootCauseText ?? ''}
                disabled={saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, weeklyIssueRootCauseText: v } : prev))}
                onBlur={() => void savePatch({ weeklyIssueRootCauseText: data.weeklyIssueRootCauseText })}
                placeholder="課題（何が起きたか）と原因（なぜ起きたか）を分けて整理してください。"
              />
            </div>
          ) : null}

          {journalShowWeeklyNextImprovementSection(level) ? (
            <div className="action-sub-section" data-section="weekly-next-improvement">
              <h4>◇来週への改善点</h4>
              <WeeklyTextRow
                label="内容"
                value={data.nextWeekImprovementText ?? ''}
                disabled={saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, nextWeekImprovementText: v } : prev))}
                onBlur={() => void savePatch({ nextWeekImprovementText: data.nextWeekImprovementText })}
                placeholder="来週に向けて改善したい点を記載してください。"
              />
              {journalShowWeeklyAiImprovementSuggestion(level) ? (
                <div className="form-row">
                  <div className="label-wrap">
                    <span>・Ai改善提案</span>
                  </div>
                  <div className="w-full min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <button
                        type="button"
                        className={`trial-action-btn ${
                          hasRunImprovementAiToday ? 'ai-action-btn-done' : canRunAiImprovementByLimit ? 'ai-action-btn-ready' : ''
                        }`}
                        disabled={saving || weeklyImprovementLoading || !canRunAiImprovementByLimit}
                        onClick={() => void runWeeklyImprovementAi()}
                      >
                        {weeklyImprovementLoading ? '生成中…' : 'Ai改善提案を実行'}
                      </button>
                      <button
                        type="button"
                        className="trial-action-btn"
                        disabled={saving || weeklyImprovementLoading || !weeklyImprovementPreview}
                        onClick={() => void saveWeeklyImprovementPreview()}
                      >
                        Ai改善提案に保存
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      行動目標・行動内容・行動の振り返り・成果の振り返り・心理面・気づき・学び・成長・課題と原因の深掘り・来週への改善点の
                      <strong>参照入力の合計が{WEEKLY_IMPROVEMENT_MIN_TOTAL_CHARS}文字以上</strong>
                      あれば実行できます（空欄可。薄い入力のまま生成しません）。不足のとき実行すると、その旨をメッセージ表示します。実行後は下にプレビューが表示され、「Ai改善提案に保存」でこの欄に反映されます（来週への改善点には転記しません）。
                      同一内容でも再実行できますが、
                      <strong>成功した生成は1日あたり最大{WEEKLY_AI_DAILY_LIMIT}回まで</strong>
                      （失敗・エラーは回数に含めません）。
                    </p>
                    <p className="text-xs text-gray-600 mb-2">
                      本日の成功実行回数: {improvementAiRunCountToday}/{WEEKLY_AI_DAILY_LIMIT}（失敗はカウントしません）
                    </p>
                    {weeklyImprovementError ? (
                      <p className="text-xs text-red-600 mb-2" role="alert">
                        {weeklyImprovementError}
                      </p>
                    ) : null}
                    {weeklyImprovementPreview ? (
                      <div
                        className="mb-3 p-3 border border-gray-300 rounded bg-gray-50 text-sm whitespace-pre-wrap"
                        aria-live="polite"
                      >
                        {weeklyImprovementPreview}
                        {weeklyImprovementPreviewUsageTokens != null
                          ? `\n\n（使用トークン合計: ${weeklyImprovementPreviewUsageTokens}）`
                          : ''}
                      </div>
                    ) : null}
                    <AutosizeTextarea
                      className="w-full text-sm border border-gray-300 rounded p-2"
                      value={data.aiImprovementSuggestionText ?? ''}
                      disabled={saving || weeklyImprovementLoading}
                      onChange={(e) =>
                        setData((prev) =>
                          prev ? { ...prev, aiImprovementSuggestionText: e.target.value } : prev
                        )
                      }
                      onBlur={() => void savePatch({ aiImprovementSuggestionText: data.aiImprovementSuggestionText })}
                      placeholder="Ai改善提案の本文。上のボタンで生成したあと保存するか、手入力もできます。"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {journalShowWeeklySelfPraiseSection(level) ? (
            <div className="action-sub-section" data-section="weekly-self-praise">
              <h4>◇他に残しておきたいこと</h4>
              <WeeklyTextRow
                label="内容"
                value={data.weeklySelfPraiseText ?? ''}
                disabled={saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, weeklySelfPraiseText: v } : prev))}
                onBlur={() => void savePatch({ weeklySelfPraiseText: data.weeklySelfPraiseText })}
                placeholder="入力してください"
              />
            </div>
          ) : null}

          <div className="action-sub-section" data-section="weekly-next-week-action">
            <h4>◇来週の行動</h4>
            <WeeklyTextRow
              label="・目標"
              value={data.nextWeekGoalText ?? ''}
              disabled={saving}
              onChange={(v) => setData((prev) => (prev ? { ...prev, nextWeekGoalText: v } : prev))}
              onBlur={() => void savePatch({ nextWeekGoalText: data.nextWeekGoalText })}
              placeholder="入力してください（次週へ進むとき、今週の行動へ繰り越されます）"
            />
            {journalShowWeeklyNextWeekActionContent(level) ? (
              <WeeklyTextRow
                label="・行動内容（具体的に）"
                value={data.nextWeekActionContentText ?? ''}
                disabled={saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, nextWeekActionContentText: v } : prev))}
                onBlur={() => void savePatch({ nextWeekActionContentText: data.nextWeekActionContentText })}
                placeholder="入力してください（次週へ進むとき、今週の行動へ繰り越されます）"
              />
            ) : null}
          </div>

          {!coachCommentsEnabled && user ? (
            <div className="action-sub-section" data-section="weekly-coach-share">
              <h3>コーチ共有</h3>
              <p className="mt-2 text-gray-600 text-xs">現在のプランではパーソナルコーチ機能が無効です。</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
