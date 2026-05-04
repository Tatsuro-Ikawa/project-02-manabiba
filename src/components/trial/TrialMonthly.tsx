'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  getJournalMonthlyPlain,
  getJournalWeeklyPlain,
  journalMonthlyPlainEmpty,
  journalWeeklyPlainEmpty,
  listJournalDailyPlainInRange,
  saveJournalMonthlyPlain,
  type JournalMonthlyPlain,
  type JournalWeeklyPlain,
  type Trial4wDailyPlain,
} from '@/lib/firestore';
import {
  getTodayDateKeyTokyo,
  listWeekStartKeysInCalendarMonth,
  resolveJournalWeekStartsOn,
} from '@/lib/journalWeek';
import { useJournalDetailLevel } from '@/context/JournalDetailLevelContext';
import TrialSaveStatusLine from '@/components/trial/TrialSaveStatusLine';
import { AutosizeTextarea } from '@/components/trial/AutosizeTextarea';
import {
  journalShowMonthlyActionReviewText,
  journalShowMonthlyAiImprovementSuggestion,
  journalShowMonthlyAiReportSection,
  journalShowMonthlyInsightLearning,
  journalShowMonthlyIssueRootCauseSection,
  journalShowMonthlyMetricAchievement,
  journalShowMonthlyNextImprovementSection,
  journalShowMonthlyNextMonthActionContent,
  journalShowMonthlyNextMonthGoal,
  journalShowMonthlyOutcomeReview,
  journalShowMonthlyPsychologySection,
  journalShowMonthlySpecialNotes,
  journalShowMonthlyThisMonthActionContent,
} from '@/lib/journalDetailLevel';
import { buildMonthlyAiReportInputFromWeeklies } from '@/lib/monthlyAiReportInputFromWeeklies';
import { AI_REPORT_INPUT_MIN_TOTAL_CHARS, applyAiReportWriteMode } from '@/lib/journalAiReportWriteMode';
import {
  buildMonthlyImprovementInputText,
  MONTHLY_IMPROVEMENT_MIN_CHARS_PER_FIELD,
  validateMonthlyImprovementInput,
} from '@/lib/monthlyImprovementAi';

function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const [yy, mm] = monthKey.split('-').map((x) => Number(x));
  if (!yy || !mm) return monthKey;
  const d = new Date(yy, mm - 1 + deltaMonths, 1);
  const y2 = d.getFullYear();
  const m2 = d.getMonth() + 1;
  return `${y2}-${String(m2).padStart(2, '0')}`;
}

function formatMonthNavShort(monthKey: string): string {
  const [yy, mm] = monthKey.split('-').map((x) => Number(x));
  if (!yy || !mm) return monthKey;
  return `${yy}/${String(mm).padStart(2, '0')}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function dateKeyFromYmd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function getMonthStartEndDateKey(monthKey: string): { startKey: string; endKey: string; y: number; m: number } | null {
  const [yy, mm] = monthKey.split('-').map((x) => Number(x));
  if (!yy || !mm) return null;
  const lastDay = new Date(yy, mm, 0).getDate();
  return { startKey: dateKeyFromYmd(yy, mm, 1), endKey: dateKeyFromYmd(yy, mm, lastDay), y: yy, m: mm };
}

function countChars(text: string): number {
  return [...text].length;
}

type MonthlyReportsResponse = {
  reports: {
    actionAspect: string;
    outcomeAspect: string;
    psychologyAspect: string;
    insightGrowth: string;
  };
  charCountTotal?: number;
  usageTotalTokenCount?: number;
};

const MONTHLY_AI_DAILY_LIMIT = 3;

function MonthlyTextRow({
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

export default function TrialMonthly() {
  const { user, userProfile, loading } = useAuth();
  const { level } = useJournalDetailLevel();
  const searchParams = useSearchParams();
  const [monthKey, setMonthKey] = useState('');
  const [data, setData] = useState<JournalMonthlyPlain | null>(null);
  const [dailyByDateKey, setDailyByDateKey] = useState<Record<string, Trial4wDailyPlain>>({});
  /** 当月に含まれる週の journal_weekly（Aiレポート用インプット） */
  const [weeklyDocsForMonth, setWeeklyDocsForMonth] = useState<JournalWeeklyPlain[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [monthlyAiUsageTotalTokens, setMonthlyAiUsageTotalTokens] = useState<number | null>(null);
  const [monthlyImprovementPreview, setMonthlyImprovementPreview] = useState<string | null>(null);
  const [monthlyImprovementPreviewUsageTokens, setMonthlyImprovementPreviewUsageTokens] = useState<number | null>(
    null
  );
  const [monthlyImprovementLoading, setMonthlyImprovementLoading] = useState(false);
  const [monthlyImprovementError, setMonthlyImprovementError] = useState<string | null>(null);

  const monthParam = searchParams.get('month');
  const fallbackMonthKey = user ? getTodayDateKeyTokyo().slice(0, 7) : '';
  const displayMonthKey = monthKey || fallbackMonthKey;
  const todayKey = useMemo(() => getTodayDateKeyTokyo(), []);
  const canEdit = !!user && !loading;
  const coachCommentsEnabled = !!userProfile?.subscription?.features?.coachComments;
  const monthBounds = useMemo(() => getMonthStartEndDateKey(displayMonthKey), [displayMonthKey]);

  useEffect(() => {
    if (!user) return;
    setMonthKey(monthParam || getTodayDateKeyTokyo().slice(0, 7));
  }, [user, monthParam]);

  useEffect(() => {
    if (!user) return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'monthly');
    if (displayMonthKey) url.searchParams.set('month', displayMonthKey);
    window.history.replaceState({}, '', url.pathname + url.search);
  }, [user, displayMonthKey]);

  const load = useCallback(async () => {
    if (!user) return;
    if (!displayMonthKey) return;
    try {
      const d = await getJournalMonthlyPlain(user.uid, displayMonthKey);
      setData(d);
    } catch (e) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? (e as { code?: string }).code : null;
      if (code === 'permission-denied') {
        console.warn('getJournalMonthlyPlain permission-denied (rules not deployed yet?)', e);
        setData(journalMonthlyPlainEmpty(displayMonthKey));
        setMsg('月次（journal_monthly）の権限が未反映です。Firestore ルールをデプロイ後に再読み込みしてください。');
        return;
      }
      console.error('getJournalMonthlyPlain error:', e);
      setData(journalMonthlyPlainEmpty(displayMonthKey));
      setMsg('読み込みに失敗しました。時間をおいて再度お試しください。');
    }
  }, [user, displayMonthKey]);

  const loadDaily = useCallback(async () => {
    if (!user) return;
    if (!displayMonthKey) return;
    const r = getMonthStartEndDateKey(displayMonthKey);
    if (!r) return;
    try {
      const rows = await listJournalDailyPlainInRange({ uid: user.uid, startDateKey: r.startKey, endDateKey: r.endKey });
      setDailyByDateKey(rows);
    } catch (e) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? (e as { code?: string }).code : null;
      if (code === 'permission-denied') {
        console.warn('listJournalDailyPlainInRange permission-denied', e);
        setDailyByDateKey({});
        return;
      }
      console.error('listJournalDailyPlainInRange error:', e);
      setDailyByDateKey({});
    }
  }, [user, displayMonthKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadDaily();
  }, [loadDaily]);

  useEffect(() => {
    if (!user?.uid || !displayMonthKey) {
      setWeeklyDocsForMonth([]);
      return;
    }
    let cancelled = false;
    const weekStarts = listWeekStartKeysInCalendarMonth(
      displayMonthKey,
      resolveJournalWeekStartsOn(userProfile ?? null)
    );
    void (async () => {
      try {
        const docs = await Promise.all(
          weekStarts.map(async (ws) => {
            try {
              return await getJournalWeeklyPlain(user.uid, ws);
            } catch {
              return journalWeeklyPlainEmpty(ws);
            }
          })
        );
        if (!cancelled) setWeeklyDocsForMonth(docs);
      } catch (e) {
        console.error(e);
        if (!cancelled) setWeeklyDocsForMonth([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, displayMonthKey, userProfile]);

  useEffect(() => {
    if (!journalShowMonthlyAiImprovementSuggestion(level)) {
      setMonthlyImprovementPreview(null);
      setMonthlyImprovementPreviewUsageTokens(null);
      setMonthlyImprovementError(null);
    }
  }, [level]);

  useEffect(() => {
    setMonthlyAiUsageTotalTokens(null);
    setMonthlyImprovementPreview(null);
    setMonthlyImprovementPreviewUsageTokens(null);
    setMonthlyImprovementError(null);
  }, [displayMonthKey]);

  const savePatch = useCallback(
    async (patch: Partial<JournalMonthlyPlain>) => {
      if (!user || !data) return;
      setSaving(true);
      setMsg(null);
      try {
        await saveJournalMonthlyPlain({ uid: user.uid, monthKey: data.monthKey, patch });
        const fresh = await getJournalMonthlyPlain(user.uid, data.monthKey);
        setData(fresh);
        setMsg('保存しました。');
        setTimeout(() => setMsg(null), 2500);
      } catch (e) {
        console.error('saveJournalMonthlyPlain error:', e);
        setMsg('保存に失敗しました。');
      } finally {
        setSaving(false);
      }
    },
    [user, data]
  );

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

  const monthCalendarCells = useMemo(() => {
    const r = getMonthStartEndDateKey(displayMonthKey);
    if (!r) return { headers: [] as string[], cells: [] as Array<{ kind: 'empty' } | { kind: 'day'; dateKey: string; day: number }> };
    const headers = ['日', '月', '火', '水', '木', '金', '土'];
    const firstDow = new Date(r.y, r.m - 1, 1).getDay();
    const lastDay = new Date(r.y, r.m, 0).getDate();
    const cells: Array<{ kind: 'empty' } | { kind: 'day'; dateKey: string; day: number }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ kind: 'empty' });
    for (let d = 1; d <= lastDay; d++) {
      const dk = dateKeyFromYmd(r.y, r.m, d);
      cells.push({ kind: 'day', dateKey: dk, day: d });
    }
    while (cells.length % 7 !== 0) cells.push({ kind: 'empty' });
    return { headers, cells };
  }, [displayMonthKey]);

  const generateAiMonthlyReport = useCallback(async () => {
    if (!user || !data) return;
    const monthlyInputText = buildMonthlyAiReportInputFromWeeklies(weeklyDocsForMonth);
    if (countChars(monthlyInputText) < AI_REPORT_INPUT_MIN_TOTAL_CHARS) {
      setMsg(
        `月次AIレポート作成の入力が不足しています（当月の週報を連結したテキストが合計${AI_REPORT_INPUT_MIN_TOTAL_CHARS}文字以上になるよう、各週の学び帳を記入してください）。`
      );
      return;
    }
    const currentRunCount =
      data.monthlyAiReportRunDateKey === todayKey ? data.monthlyAiReportRunCount ?? 0 : 0;
    if (currentRunCount >= MONTHLY_AI_DAILY_LIMIT) {
      setMsg(`Aiレポート作成は1日${MONTHLY_AI_DAILY_LIMIT}回までです。`);
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/ai/monthly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyInputText }),
      });
      const payload = (await res.json()) as MonthlyReportsResponse & { error?: string };
      if (!res.ok || !payload?.reports) {
        throw new Error(payload?.error || '月次AIレポートの作成に失敗しました。');
      }

      const writeMode = userProfile?.weeklyAiReportWriteMode ?? 'append';
      const patch: Partial<JournalMonthlyPlain> = {
        monthlyActionReviewText: applyAiReportWriteMode(
          data.monthlyActionReviewText,
          payload.reports.actionAspect,
          writeMode
        ),
        monthlyOutcomeReviewText: applyAiReportWriteMode(
          data.monthlyOutcomeReviewText,
          payload.reports.outcomeAspect,
          writeMode
        ),
        monthlyPsychologyText: applyAiReportWriteMode(
          data.monthlyPsychologyText,
          payload.reports.psychologyAspect,
          writeMode
        ),
        insightAndLearningText: applyAiReportWriteMode(
          data.insightAndLearningText,
          payload.reports.insightGrowth,
          writeMode
        ),
        monthlyAiReportRunDateKey: todayKey,
        monthlyAiReportRunCount: currentRunCount + 1,
      };

      await saveJournalMonthlyPlain({ uid: user.uid, monthKey: data.monthKey, patch });
      const fresh = await getJournalMonthlyPlain(user.uid, data.monthKey);
      setData(fresh);
      setMonthlyAiUsageTotalTokens((prev) => {
        if (typeof payload.usageTotalTokenCount !== 'number' || !Number.isFinite(payload.usageTotalTokenCount)) {
          return prev;
        }
        return Math.max(0, Math.floor(payload.usageTotalTokenCount));
      });
      setMsg('月次AIレポートを反映しました。');
    } catch (e) {
      console.error(e);
      setMsg(e instanceof Error ? e.message : '月次AIレポートの作成に失敗しました。');
    } finally {
      setSaving(false);
    }
  }, [user, data, todayKey, weeklyDocsForMonth, userProfile?.weeklyAiReportWriteMode]);

  const runMonthlyImprovementAi = useCallback(async () => {
    if (!user || !data) return;
    const v = validateMonthlyImprovementInput(data);
    if (!v.ok) {
      setMonthlyImprovementError(
        `次の項目をそれぞれ${MONTHLY_IMPROVEMENT_MIN_CHARS_PER_FIELD}文字以上入力してください: ${v.shortLabels.join('、')}`
      );
      return;
    }
    const improvementRunCount =
      data.monthlyAiImprovementRunDateKey === todayKey ? data.monthlyAiImprovementRunCount ?? 0 : 0;
    if (improvementRunCount >= MONTHLY_AI_DAILY_LIMIT) {
      setMonthlyImprovementError(`Ai改善提案は1日${MONTHLY_AI_DAILY_LIMIT}回までです。`);
      return;
    }
    const input = buildMonthlyImprovementInputText(data);
    setMonthlyImprovementError(null);
    setMonthlyImprovementPreview(null);
    setMonthlyImprovementPreviewUsageTokens(null);
    setMonthlyImprovementLoading(true);
    try {
      const res = await fetch('/api/ai/monthly-improvement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyImprovementInputText: input }),
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
      await saveJournalMonthlyPlain({
        uid: user.uid,
        monthKey: data.monthKey,
        patch: {
          monthlyAiImprovementRunDateKey: todayKey,
          monthlyAiImprovementRunCount: nextImprovementCount,
        },
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              monthlyAiImprovementRunDateKey: todayKey,
              monthlyAiImprovementRunCount: nextImprovementCount,
            }
          : prev
      );
      setMonthlyImprovementPreview(json.suggestion.trim());
      setMonthlyImprovementPreviewUsageTokens(
        typeof json.usageTotalTokenCount === 'number' && Number.isFinite(json.usageTotalTokenCount)
          ? Math.max(0, Math.floor(json.usageTotalTokenCount))
          : null
      );
    } catch (e) {
      console.error(e);
      setMonthlyImprovementError(
        e instanceof Error ? e.message : 'Ai改善提案の生成に失敗しました。時間をおいて再試行してください。'
      );
    } finally {
      setMonthlyImprovementLoading(false);
    }
  }, [user, data, todayKey]);

  const saveMonthlyImprovementPreview = useCallback(async () => {
    if (!monthlyImprovementPreview || !user || !data) return;
    setMonthlyImprovementError(null);
    setSaving(true);
    setMsg(null);
    try {
      await saveJournalMonthlyPlain({
        uid: user.uid,
        monthKey: data.monthKey,
        patch: { aiImprovementSuggestionText: monthlyImprovementPreview },
      });
      const fresh = await getJournalMonthlyPlain(user.uid, data.monthKey);
      setData(fresh);
      setMonthlyImprovementPreview(null);
      setMonthlyImprovementPreviewUsageTokens(null);
      setMsg('Ai改善提案を保存しました。');
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      console.error(e);
      setMonthlyImprovementError(
        e instanceof Error ? e.message : 'Ai改善提案の保存に失敗しました。時間をおいて再試行してください。'
      );
    } finally {
      setSaving(false);
    }
  }, [monthlyImprovementPreview, user, data]);

  const monthNavShort = useMemo(() => formatMonthNavShort(displayMonthKey), [displayMonthKey]);

  if (!user && !loading) {
    return (
      <div className="trial-tab-content">
        <div className="trial-monthly-container">
          <div className="trial-tab-heading-row">
            <h2 id="monthly-section-title">月</h2>
          </div>
          <p className="text-sm text-gray-600">ログインすると月次を記録できます。</p>
        </div>
      </div>
    );
  }

  if (user && loading && !userProfile) {
    return (
      <div className="trial-tab-content">
        <div className="trial-monthly-container">
          <div className="trial-tab-heading-row">
            <h2 id="monthly-section-title">月</h2>
          </div>
          <p className="text-sm text-gray-500">読み込み中…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="trial-tab-content">
        <div className="trial-monthly-container">
          <div className="trial-tab-heading-row">
            <h2 id="monthly-section-title">月</h2>
          </div>
          <p className="text-sm text-gray-500">読み込み中…</p>
        </div>
      </div>
    );
  }

  const aiRunCountToday =
    data.monthlyAiReportRunDateKey === todayKey ? data.monthlyAiReportRunCount ?? 0 : 0;
  const canRunAiMonthlyReport = aiRunCountToday < MONTHLY_AI_DAILY_LIMIT;
  const hasRunAiToday = aiRunCountToday > 0;

  const improvementAiRunCountToday =
    data.monthlyAiImprovementRunDateKey === todayKey ? data.monthlyAiImprovementRunCount ?? 0 : 0;
  const canRunAiImprovementByLimit = improvementAiRunCountToday < MONTHLY_AI_DAILY_LIMIT;
  const hasRunImprovementAiToday = improvementAiRunCountToday > 0;

  return (
    <div className="trial-tab-content">
      <div className="trial-monthly-container">
        <div className="trial-tab-heading-row">
          <h2 id="monthly-section-title">月</h2>
        </div>
        <div className="week-nav" aria-label="月ナビ">
          <button
            type="button"
            className="week-nav-btn"
            onClick={() => setMonthKey((k) => shiftMonthKey(k || fallbackMonthKey, -1))}
            disabled={!canEdit}
            aria-label="前月"
          >
            ◁
          </button>
          <div className="week-nav-label">{monthNavShort}</div>
          <button
            type="button"
            className="week-nav-btn"
            onClick={() => setMonthKey((k) => shiftMonthKey(k || fallbackMonthKey, 1))}
            disabled={!canEdit}
            aria-label="翌月"
          >
            ▷
          </button>
        </div>

        <TrialSaveStatusLine message={msg} saving={saving} variant="compact-secondary" />

        <div className="action-sub-section" data-section="monthly-this-month-action">
          <h3>今月の行動</h3>
          <MonthlyTextRow
            label="◇行動目標：何を実行する（1文で）"
            value={data.thisMonthActionGoalText ?? ''}
            disabled={!canEdit || saving}
            onChange={(v) => setData((prev) => (prev ? { ...prev, thisMonthActionGoalText: v } : prev))}
            onBlur={() => void savePatch({ thisMonthActionGoalText: data.thisMonthActionGoalText })}
            placeholder="今月注力する行動を一文で設定します。"
          />
          {journalShowMonthlyThisMonthActionContent(level) ? (
            <MonthlyTextRow
              label="◇行動内容：どのように"
              value={data.thisMonthActionContentText ?? ''}
              disabled={!canEdit || saving}
              onChange={(v) => setData((prev) => (prev ? { ...prev, thisMonthActionContentText: v } : prev))}
              onBlur={() => void savePatch({ thisMonthActionContentText: data.thisMonthActionContentText })}
              placeholder="例：毎朝のルーティンと振り返りのやり方を具体的に"
            />
          ) : null}
        </div>

        <div className="action-sub-section" data-section="monthly-reflection">
          <h3>今月の振り返り</h3>

          {journalShowMonthlyAiReportSection(level) ? (
            <div className="mb-4">
              <h4>◇Aiレポート作成</h4>
              <div className="form-row mt-2 mb-2">
                <button
                  type="button"
                  className={`trial-action-btn ${
                    hasRunAiToday ? 'ai-action-btn-done' : canRunAiMonthlyReport ? 'ai-action-btn-ready' : ''
                  }`}
                  disabled={saving || !canRunAiMonthlyReport}
                  onClick={() => void generateAiMonthlyReport()}
                >
                  Aiレポート作成を実行
                </button>
              </div>
              <p className="text-sm text-gray-600">
                当月に含まれる各週の週次学び帳（所定フィールド）を連結したテキストをもとに、「行動面」「成果面」「心理面」「気づき・学び・成長」欄へ下書きを出力します。連結テキストは合計
                {AI_REPORT_INPUT_MIN_TOTAL_CHARS}
                文字以上で実行できます（手動で編集できます）。
                {monthlyAiUsageTotalTokens != null
                  ? `（使用トークン合計: ${monthlyAiUsageTotalTokens}）`
                  : '（使用トークン合計: —）'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                本日の成功実行回数: {aiRunCountToday}/{MONTHLY_AI_DAILY_LIMIT}（失敗はカウントしません）
              </p>
            </div>
          ) : null}

          <div className="action-sub-section" data-section="monthly-action-aspect">
            <h4>◇行動面</h4>
            <p className="text-sm text-gray-600 mb-3">各日の朝・晩の実行結果。記号をクリックすると当該日の朝・晩へ移動します。</p>
            <div className="month-calendar-grid" role="grid" aria-label="行動の結果（月間カレンダー）">
              {monthCalendarCells.headers.map((h) => (
                <div key={h} className="month-cal-header" role="columnheader">
                  {h}
                </div>
              ))}
              {monthCalendarCells.cells.map((c, idx) => {
                if (c.kind === 'empty') {
                  return <div key={`e-${idx}`} className="month-cal-cell empty" role="gridcell" aria-hidden />;
                }
                const d = dailyByDateKey[c.dateKey];
                const m = computeMorningSymbol(d, c.dateKey);
                const e = computeEveningSymbol(d, c.dateKey);
                return (
                  <div key={c.dateKey} className="month-cal-cell" role="gridcell">
                    <span className="cell-date">{c.day}</span>
                    <div className="cell-symbols">
                      <button
                        type="button"
                        className={`monthly-symbol ${m.cls}`}
                        onClick={() => gotoDaily(c.dateKey)}
                        aria-label={`${c.dateKey} 朝`}
                        disabled={!user}
                      >
                        {m.sym}
                      </button>
                      <button
                        type="button"
                        className={`monthly-symbol ${e.cls}`}
                        onClick={() => gotoDaily(c.dateKey)}
                        aria-label={`${c.dateKey} 晩`}
                        disabled={!user}
                      >
                        {e.sym}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {journalShowMonthlyActionReviewText(level) ? (
              <MonthlyTextRow
                label="・行動の振り返り"
                value={data.monthlyActionReviewText ?? ''}
                disabled={!canEdit || saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, monthlyActionReviewText: v } : prev))}
                onBlur={() => void savePatch({ monthlyActionReviewText: data.monthlyActionReviewText })}
                placeholder="ここに、Aiレポート作成のアウトプット（行動面）を入力します。手動入力も可能です。"
              />
            ) : null}
          </div>

          <div className="action-sub-section" data-section="monthly-outcome-aspect">
            <h4>◇成果面</h4>
            {journalShowMonthlyOutcomeReview(level) ? (
              <MonthlyTextRow
                label="・振り返り"
                value={data.monthlyOutcomeReviewText ?? ''}
                disabled={!canEdit || saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, monthlyOutcomeReviewText: v } : prev))}
                onBlur={() => void savePatch({ monthlyOutcomeReviewText: data.monthlyOutcomeReviewText })}
                placeholder="ここに、Aiレポート作成のアウトプット（成果面）を入力します。手動入力も可能です。"
              />
            ) : null}
            {journalShowMonthlyMetricAchievement(level) ? (
              <MonthlyTextRow
                label="・指標の達成度"
                value={data.monthlyMetricAchievementText ?? ''}
                disabled={!canEdit || saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, monthlyMetricAchievementText: v } : prev))}
                onBlur={() => void savePatch({ monthlyMetricAchievementText: data.monthlyMetricAchievementText })}
                placeholder="例：今月の指標（回数・時間・成果など）と達成度を記載してください。"
              />
            ) : null}
          </div>

          {journalShowMonthlyPsychologySection(level) ? (
            <div className="action-sub-section" data-section="monthly-psychology">
              <h4>◇心理面</h4>
              <MonthlyTextRow
                label="行動時の思考・感情の変化"
                value={data.monthlyPsychologyText ?? ''}
                disabled={!canEdit || saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, monthlyPsychologyText: v } : prev))}
                onBlur={() => void savePatch({ monthlyPsychologyText: data.monthlyPsychologyText })}
                placeholder="思考・感情の変化について記載してください。"
              />
            </div>
          ) : null}

          {journalShowMonthlyInsightLearning(level) ? (
            <div className="action-sub-section" data-section="monthly-insight">
              <h4>◇気づき・学び・成長</h4>
              <MonthlyTextRow
                label="内容"
                value={data.insightAndLearningText ?? ''}
                disabled={!canEdit || saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, insightAndLearningText: v } : prev))}
                onBlur={() => void savePatch({ insightAndLearningText: data.insightAndLearningText })}
                placeholder="入力してください"
              />
            </div>
          ) : null}

          {journalShowMonthlyIssueRootCauseSection(level) ? (
            <div className="action-sub-section" data-section="monthly-root-cause">
              <h4>◇課題と原因の深掘り</h4>
              <MonthlyTextRow
                label="内容"
                value={data.monthlyIssueRootCauseText ?? ''}
                disabled={!canEdit || saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, monthlyIssueRootCauseText: v } : prev))}
                onBlur={() => void savePatch({ monthlyIssueRootCauseText: data.monthlyIssueRootCauseText })}
                placeholder="課題（何が起きたか）と原因（なぜ起きたか）を分けて整理してください。"
              />
            </div>
          ) : null}

          {journalShowMonthlyNextImprovementSection(level) ? (
            <div className="action-sub-section" data-section="monthly-next-improvement">
              <h4>◇来月への改善点</h4>
              <MonthlyTextRow
                label="内容"
                value={data.nextMonthImprovementText ?? ''}
                disabled={!canEdit || saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, nextMonthImprovementText: v } : prev))}
                onBlur={() => void savePatch({ nextMonthImprovementText: data.nextMonthImprovementText })}
                placeholder="来月に向けて改善したい点を記載してください。"
              />
              {journalShowMonthlyAiImprovementSuggestion(level) ? (
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
                        disabled={saving || monthlyImprovementLoading || !canRunAiImprovementByLimit}
                        onClick={() => void runMonthlyImprovementAi()}
                      >
                        {monthlyImprovementLoading ? '生成中…' : 'Ai改善提案を実行'}
                      </button>
                      <button
                        type="button"
                        className="trial-action-btn"
                        disabled={saving || monthlyImprovementLoading || !monthlyImprovementPreview}
                        onClick={() => void saveMonthlyImprovementPreview()}
                      >
                        Ai改善提案に保存
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      行動目標・行動内容・行動の振り返り・成果の振り返り・心理面・気づき・学び・成長・課題と原因の深掘り・来月への改善点・特記事項の
                      <strong>各欄を{MONTHLY_IMPROVEMENT_MIN_CHARS_PER_FIELD}文字以上</strong>
                      入力すると実行できます（特記事項は未入力でも可）。成功した生成は1日あたり最大{MONTHLY_AI_DAILY_LIMIT}回までです。
                    </p>
                    <p className="text-xs text-gray-600 mb-2">
                      本日の成功実行回数: {improvementAiRunCountToday}/{MONTHLY_AI_DAILY_LIMIT}（失敗はカウントしません）
                    </p>
                    {monthlyImprovementError ? (
                      <p className="text-xs text-red-600 mb-2" role="alert">
                        {monthlyImprovementError}
                      </p>
                    ) : null}
                    {monthlyImprovementPreview ? (
                      <div
                        className="mb-3 p-3 border border-gray-300 rounded bg-gray-50 text-sm whitespace-pre-wrap"
                        aria-live="polite"
                      >
                        {monthlyImprovementPreview}
                        {monthlyImprovementPreviewUsageTokens != null
                          ? `\n\n（使用トークン合計: ${monthlyImprovementPreviewUsageTokens}）`
                          : ''}
                      </div>
                    ) : null}
                    <AutosizeTextarea
                      className="w-full text-sm border border-gray-300 rounded p-2"
                      value={data.aiImprovementSuggestionText ?? ''}
                      disabled={saving || monthlyImprovementLoading}
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
        </div>

        {journalShowMonthlyNextMonthGoal(level) ? (
          <div className="action-sub-section" data-section="monthly-next-month-action">
            <h3>来月の行動</h3>
            <MonthlyTextRow
              label="・目標（一文で）"
              value={data.nextMonthGoalText ?? ''}
              disabled={!canEdit || saving}
              onChange={(v) => setData((prev) => (prev ? { ...prev, nextMonthGoalText: v } : prev))}
              onBlur={() => void savePatch({ nextMonthGoalText: data.nextMonthGoalText })}
              placeholder="来月の目標を一文で記載してください。"
            />
            {journalShowMonthlyNextMonthActionContent(level) ? (
              <MonthlyTextRow
                label="・行動内容（具体的に）"
                value={data.nextMonthActionContentText ?? ''}
                disabled={!canEdit || saving}
                onChange={(v) => setData((prev) => (prev ? { ...prev, nextMonthActionContentText: v } : prev))}
                onBlur={() => void savePatch({ nextMonthActionContentText: data.nextMonthActionContentText })}
                placeholder="来月の行動内容を具体的に記載してください。"
              />
            ) : null}
          </div>
        ) : null}

        {journalShowMonthlySpecialNotes(level) ? (
          <div className="action-sub-section" data-section="monthly-special-notes">
            <h3>特記事項（その他自由欄）</h3>
            <MonthlyTextRow
              label="内容"
              value={data.monthlySpecialNotesText ?? ''}
              disabled={!canEdit || saving}
              onChange={(v) => setData((prev) => (prev ? { ...prev, monthlySpecialNotesText: v } : prev))}
              onBlur={() => void savePatch({ monthlySpecialNotesText: data.monthlySpecialNotesText })}
              placeholder="その他メモや特記事項があれば記載してください。"
            />
          </div>
        ) : null}

        <div className="action-sub-section">
          <h3>コーチ共有</h3>
          <label className="flex gap-2 items-center text-gray-600 text-sm">
            <input
              type="checkbox"
              checked={!!data.sharedWithCoach}
              disabled={!canEdit || !coachCommentsEnabled}
              onChange={(e) => {
                const v = e.target.checked;
                setData((prev) => (prev ? { ...prev, sharedWithCoach: v } : prev));
                void savePatch({ sharedWithCoach: v });
              }}
            />
            コーチに共有する（閲覧）
          </label>
          {!coachCommentsEnabled && user && (
            <p className="mt-2 text-gray-600 text-xs">現在のプランではパーソナルコーチ機能が無効です。</p>
          )}
          <div className="mt-3">
            <button type="button" className="trial-action-btn" disabled>
              コーチへ質問を送信（後続）
            </button>
            <p className="mt-2 text-gray-600 text-xs">
              ※送信（＝暦月1回の消費）とスレッド作成は、クォータ実装（M2/M6）で対応します。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
