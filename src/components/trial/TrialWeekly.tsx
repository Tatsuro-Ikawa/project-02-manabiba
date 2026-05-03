'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
  WEEKLY_IMPROVEMENT_MIN_CHARS_PER_FIELD,
} from '@/lib/weeklyImprovementAi';

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

function hasText(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function executionLabel(v: Trial4wDailyPlain['eveningExecution']): string {
  if (v === 'done') return 'できた';
  if (v === 'partial') return '一部できた';
  if (v === 'none') return 'できなかった';
  return '';
}

function brakeLabel(v: Trial4wDailyPlain['eveningBrake']): string {
  if (v === 'yes') return '働いた';
  if (v === 'partial') return '一部働いた';
  if (v === 'no') return '働かなかった';
  return '';
}

function formatTokyoDateTime(d = new Date()): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

function applyWriteMode(
  current: string | null,
  generated: string,
  mode: 'overwrite' | 'append'
): string {
  if (mode === 'overwrite') return generated;
  if (!hasText(current)) return generated;
  return `${current.trim()}\n\n---\nAIレポート（${formatTokyoDateTime()}）\n${generated}`;
}

function buildWeeklyAiInputText(
  weekDates: string[],
  todayKey: string,
  dailyByDateKey: Record<string, Trial4wDailyPlain>
): string {
  const blocks: string[] = [];
  for (const dk of weekDates) {
    if (dk > todayKey) continue;
    const d = dailyByDateKey[dk];
    if (!d) continue;
    const lines: string[] = [`【日付】${dk}`];

    const todayAction: string[] = [];
    if (hasText(d.morningActionGoalText)) todayAction.push(`- 行動目標: ${d.morningActionGoalText.trim()}`);
    if (hasText(d.morningActionContentText)) todayAction.push(`- 行動内容: ${d.morningActionContentText.trim()}`);
    if (todayAction.length > 0) {
      lines.push('【今日の行動】', ...todayAction);
    }

    const ex = executionLabel(d.eveningExecution);
    if (ex) lines.push('【行動の実行状況】', `- 実行状況: ${ex}`);

    const resultLines: string[] = [];
    if (hasText(d.eveningResultExecutionText)) {
      resultLines.push(`- どのように行いどの程度できたか: ${d.eveningResultExecutionText.trim()}`);
    }
    if (hasText(d.eveningResultGoalProgressText)) {
      resultLines.push(`- 目標・指標に対しどの程度近づけたか: ${d.eveningResultGoalProgressText.trim()}`);
    }
    if (typeof d.eveningSatisfaction === 'number') {
      resultLines.push(`- 満足度: ${d.eveningSatisfaction}/10`);
    }
    if (resultLines.length > 0) lines.push('【行動の結果】', ...resultLines);

    if (hasText(d.eveningEmotionThoughtText)) {
      lines.push('【行動時の感情・思考】', `- 内容: ${d.eveningEmotionThoughtText.trim()}`);
    }

    const brake = brakeLabel(d.eveningBrake);
    if (brake) {
      const brakeLines = [`- 作動: ${brake}`];
      if (d.eveningBrake === 'yes' || d.eveningBrake === 'partial') {
        if (hasText(d.eveningBrakeWorkedText)) brakeLines.push(`- どんなブレーキだったか: ${d.eveningBrakeWorkedText.trim()}`);
        if (hasText(d.eveningBrakeWordsText)) brakeLines.push(`- どんな反論の言葉を使ったか: ${d.eveningBrakeWordsText.trim()}`);
      }
      lines.push('【こころのブレーキ】', ...brakeLines);
    }

    if (hasText(d.eveningInsightText)) {
      lines.push('【今日の気づき・感動・学びと課題】', `- 内容: ${d.eveningInsightText.trim()}`);
    }
    if (hasText(d.eveningImprovementText)) {
      lines.push('【明日への改善点】', `- 内容: ${d.eveningImprovementText.trim()}`);
    }

    if (lines.length > 1) blocks.push(lines.join('\n'));
  }
  return blocks.join('\n\n');
}

export default function TrialWeekly() {
  const { user, userProfile, loading } = useAuth();
  const { level } = useJournalDetailLevel();
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

  const fallbackWeekStart = user ? getWeekStartDateKeyForToday(userProfile ?? null) : '';
  const weekParam = searchParams.get('week'); // YYYY-MM-DD（週の開始日）
  const displayWeekStartKey = weekStartKey || fallbackWeekStart;
  const weekEndKey = useMemo(() => (displayWeekStartKey ? addDaysDateKey(displayWeekStartKey, 6) : ''), [displayWeekStartKey]);
  const todayKey = useMemo(() => getTodayDateKeyTokyo(), []);
  const weekDates = useMemo(() => {
    if (!displayWeekStartKey) return [];
    return Array.from({ length: 7 }, (_, i) => addDaysDateKey(displayWeekStartKey, i));
  }, [displayWeekStartKey]);
  const dowJa = ['日', '月', '火', '水', '木', '金', '土'];

  const satisfactionStats = useMemo(() => {
    const points = weekDates
      .map((dk) => {
        if (dk > todayKey) return null;
        const v = dailyByDateKey[dk]?.eveningSatisfaction;
        return typeof v === 'number' ? v : null;
      })
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    const avg = points.length ? points.reduce((a, b) => a + b, 0) / points.length : null;
    return { avg, count: points.length };
  }, [weekDates, dailyByDateKey, todayKey]);

  const satisfactionChartData = useMemo(() => {
    return weekDates.map((dk) => {
      const [yy, mm, dd] = dk.split('-').map((x) => Number(x));
      const wd = getJsWeekdayInTokyo(dk);
      const isFuture = dk > todayKey;
      const v = !isFuture ? dailyByDateKey[dk]?.eveningSatisfaction : null;
      return {
        dateKey: dk,
        label: `${mm}/${dd}`,
        satisfaction: typeof v === 'number' ? v : null,
        dow: dowJa[wd],
      };
    });
  }, [weekDates, dailyByDateKey, todayKey, dowJa]);

  useEffect(() => {
    if (!user) return;
    // 初期値: URL の week があればそれを採用。なければ「今日を含む週」。
    setWeekStartKey(weekParam || getWeekStartDateKeyForToday(userProfile ?? null));
  }, [user, userProfile, weekParam]);

  useEffect(() => {
    if (!user) return;
    // 週が変わったら URL を同期（tab は親が持つが、週キーは本コンポーネントが正）
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'weekly');
    if (displayWeekStartKey) url.searchParams.set('week', displayWeekStartKey);
    window.history.replaceState({}, '', url.pathname + url.search);
  }, [user, displayWeekStartKey]);

  useEffect(() => {
    if (!user?.uid || !displayWeekStartKey) return;
    let cancelled = false;
    setData(journalWeeklyPlainEmpty(displayWeekStartKey));
    setMsg(null);
    setWeeklyAiUsageTotalTokens(null);
    setWeeklyImprovementPreview(null);
    setWeeklyImprovementPreviewUsageTokens(null);
    setWeeklyImprovementError(null);
    void (async () => {
      try {
        const doc = await getJournalWeeklyPlain(user.uid, displayWeekStartKey);
        if (!cancelled) setData(doc);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setMsg(
            '読み込みに失敗しました。Firestore ルールのデプロイ（journal_weekly）とログイン状態を確認してください。'
          );
          setData(journalWeeklyPlainEmpty(displayWeekStartKey));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, displayWeekStartKey]);

  useEffect(() => {
    if (!user?.uid || !displayWeekStartKey || !weekEndKey) return;
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
      if (!user || !data) return;
      setSaving(true);
      setMsg(null);
      try {
        await saveJournalWeeklyPlain({
          uid: user.uid,
          weekStartKey: data.weekStartKey,
          patch,
        });
        const fresh = await getJournalWeeklyPlain(user.uid, data.weekStartKey);
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
    [user, data]
  );

  const generateAiWeeklyReport = useCallback(async () => {
    if (!user || !data) return;

    const currentRunCount =
      data.weeklyAiReportRunDateKey === todayKey ? data.weeklyAiReportRunCount ?? 0 : 0;
    if (currentRunCount >= WEEKLY_AI_DAILY_LIMIT) {
      setMsg(`Aiレポート作成は1日${WEEKLY_AI_DAILY_LIMIT}回までです。`);
      return;
    }

    const weeklyInputText = buildWeeklyAiInputText(weekDates, todayKey, dailyByDateKey);
    if (!weeklyInputText.trim()) {
      setMsg('週次AIレポート作成に必要な入力データが不足しています。');
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/ai/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyInputText }),
      });
      const payload = (await res.json()) as WeeklyReportsResponse & { error?: string };
      if (!res.ok || !payload?.reports) {
        throw new Error(payload?.error || '週次AIレポートの作成に失敗しました。');
      }

      const writeMode = userProfile?.weeklyAiReportWriteMode ?? 'append';
      const patch: Partial<JournalWeeklyPlain> = {
        weeklyActionReviewText: applyWriteMode(
          data.weeklyActionReviewText,
          payload.reports.actionAspect,
          writeMode
        ),
        weeklyOutcomeReviewText: applyWriteMode(
          data.weeklyOutcomeReviewText,
          payload.reports.outcomeAspect,
          writeMode
        ),
        weeklyPsychologyText: applyWriteMode(
          data.weeklyPsychologyText,
          payload.reports.psychologyAspect,
          writeMode
        ),
        insightAndLearningText: applyWriteMode(
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
  }, [user, data, todayKey, weekDates, dailyByDateKey, userProfile?.weeklyAiReportWriteMode, savePatch]);

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
        `次の項目をそれぞれ${WEEKLY_IMPROVEMENT_MIN_CHARS_PER_FIELD}文字以上入力してください: ${v.shortLabels.join('、')}`
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
      const res = await fetch('/api/ai/weekly-improvement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyImprovementInputText: input }),
      });
      const json = (await res.json()) as {
        suggestion?: string;
        error?: string;
        usageTotalTokenCount?: number;
      };
      if (!res.ok) throw new Error(json.error || 'Ai改善提案の生成に失敗しました。');
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
      getWeekStartDateKeyForDateKey(getTodayDateKeyTokyo(), resolveJournalWeekStartsOn(userProfile ?? null))
    );
  }, [weekStartKey, userProfile]);

  const gotoPrevWeek = useCallback(() => {
    const base = getBaseWeekStartKey();
    setWeekStartKey(shiftWeekStartDateKey(base, -1));
  }, [getBaseWeekStartKey]);

  const gotoNextWeek = useCallback(async () => {
    if (!user || !data) return;
    const base = getBaseWeekStartKey();
    const nextKey = shiftWeekStartDateKey(base, 1);

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
  }, [user, data, getBaseWeekStartKey]);

  const gotoDaily = useCallback((dateKey: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'morning_evening');
    url.searchParams.set('date', dateKey);
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);

  function computeMorningSymbol(d: Trial4wDailyPlain | undefined, dateKey: string): { sym: string; cls: string } {
    if (dateKey > todayKey) return { sym: '—', cls: 'symbol-none' };
    const done1 = d?.morningAffirmationDeclaration === 'done';
    const done2 = !!(d?.morningTodayActionText && d.morningTodayActionText.trim());
    const done3 = d?.morningImagingDone === true;
    const score = Number(done1) + Number(done2) + Number(done3);
    if (score === 3) return { sym: '〇', cls: 'symbol-o' };
    if (score >= 1) return { sym: '△', cls: 'symbol-delta' };
    return { sym: '×', cls: 'symbol-x' };
  }

  function computeEveningSymbol(d: Trial4wDailyPlain | undefined, dateKey: string): { sym: string; cls: string } {
    if (dateKey > todayKey) return { sym: '—', cls: 'symbol-none' };
    if (d?.eveningExecution === 'done') return { sym: '〇', cls: 'symbol-o' };
    if (d?.eveningExecution === 'partial') return { sym: '△', cls: 'symbol-delta' };
    if (d?.eveningExecution === 'none') return { sym: '×', cls: 'symbol-x' };
    return { sym: '—', cls: 'symbol-none' };
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

  if (user && loading && !userProfile) {
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

  const effectiveStart = resolveJournalWeekStartsOn(userProfile ?? null);
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
        <div className="trial-tab-heading-row">
          <h2 id="weekly-section-title">週</h2>
        </div>
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
            label="◇行動目標：何を実行する（1文で）"
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
                ボタンを押すと「行動面」「成果面」「心理面」「気づき・学び・成長」の入力欄に下書きを自動で出力します（手動で編集できます）。
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
            <p className="text-sm text-gray-600 mb-3">各日の朝・晩の実行結果。記号をクリックすると当該日の朝・晩へ移動します。</p>
            <div className="weekly-result-grid" role="grid" aria-label="行動の結果（7日）">
              {weekDates.map((dk) => {
                const d = dailyByDateKey[dk];
                const m = computeMorningSymbol(d, dk);
                const e = computeEveningSymbol(d, dk);
                const [, mm, dd] = dk.split('-').map((x) => Number(x));
                const wd = getJsWeekdayInTokyo(dk);
                return (
                  <div key={dk} className="weekly-result-cell" role="row">
                    <div className="weekly-result-date">{mm}/{dd}</div>
                    <div className="weekly-result-dow">{dowJa[wd]}</div>
                    <div className="weekly-result-symbols">
                      <button type="button" className={`weekly-symbol ${m.cls}`} onClick={() => gotoDaily(dk)} aria-label={`${dk} 朝`}>
                        {m.sym}
                      </button>
                      <button type="button" className={`weekly-symbol ${e.cls}`} onClick={() => gotoDaily(dk)} aria-label={`${dk} 晩`}>
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
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={satisfactionChartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="satisfaction"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
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
                      <strong>各欄を{WEEKLY_IMPROVEMENT_MIN_CHARS_PER_FIELD}文字以上</strong>
                      入力すると実行できます（薄い入力のまま生成しません）。未満の欄があるとき実行すると、その旨をメッセージ表示します。実行後は下にプレビューが表示され、「Ai改善提案に保存」でこの欄に反映されます（来週への改善点には転記しません）。
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

          <div className="action-sub-section" data-section="weekly-next-week-action">
            <h4>◇来週の行動</h4>
            <WeeklyTextRow
              label="・目標（一文で）"
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

          {journalShowWeeklySelfPraiseSection(level) ? (
            <div className="action-sub-section" data-section="weekly-self-praise">
              <h4>◇今週の自分へのねぎらいの言葉</h4>
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
        </div>
      </div>
    </div>
  );
}
