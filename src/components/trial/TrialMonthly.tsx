'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  getJournalMonthlyPlain,
  journalMonthlyPlainEmpty,
  listJournalDailyPlainInRange,
  saveJournalMonthlyPlain,
  type JournalMonthlyPlain,
  type Trial4wDailyPlain,
} from '@/lib/firestore';
import { getTodayDateKeyTokyo } from '@/lib/journalWeek';
import { useJournalDetailLevel } from '@/context/JournalDetailLevelContext';
import TrialSaveStatusLine from '@/components/trial/TrialSaveStatusLine';
import {
  journalShowMonthlyActionGoal,
  journalShowMonthlyActionSummary,
  journalShowMonthlyImprovementPoints,
  journalShowMonthlyNextMonthGoal,
  journalShowMonthlyOutcomeGoal,
} from '@/lib/journalDetailLevel';

function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const [yy, mm] = monthKey.split('-').map((x) => Number(x));
  if (!yy || !mm) return monthKey;
  const d = new Date(yy, mm - 1 + deltaMonths, 1);
  const y2 = d.getFullYear();
  const m2 = d.getMonth() + 1;
  return `${y2}-${String(m2).padStart(2, '0')}`;
}

/** 月ナビ用の短い表記（例: 2026/04） */
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
  const lastDay = new Date(yy, mm, 0).getDate(); // 0日=前月末日
  return { startKey: dateKeyFromYmd(yy, mm, 1), endKey: dateKeyFromYmd(yy, mm, lastDay), y: yy, m: mm };
}

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
      <textarea
        className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
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
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const monthParam = searchParams.get('month'); // YYYY-MM
  const fallbackMonthKey = user ? getTodayDateKeyTokyo().slice(0, 7) : '';
  const displayMonthKey = monthKey || fallbackMonthKey;
  const todayKey = useMemo(() => getTodayDateKeyTokyo(), []);
  const canEdit = !!user && !loading;
  const coachCommentsEnabled = !!userProfile?.subscription?.features?.coachComments;

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
      const code = typeof e === 'object' && e !== null && 'code' in e ? (e as any).code : null;
      // Firestore rules が未デプロイ等の場合、permission-denied になる。
      // ここではクラッシュ原因を「準備中」として明示し、開発時の不安を減らす。
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
      const code = typeof e === 'object' && e !== null && 'code' in e ? (e as any).code : null;
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

  const patchAndSave = useCallback(
    async (patch: Partial<JournalMonthlyPlain>) => {
      if (!user) return;
      if (!displayMonthKey) return;
      setSaving(true);
      setMsg(null);
      try {
        await saveJournalMonthlyPlain({ uid: user.uid, monthKey: displayMonthKey, patch });
        setMsg('保存しました');
      } catch (e) {
        console.error('saveJournalMonthlyPlain error:', e);
        setMsg('保存に失敗しました。');
      } finally {
        setSaving(false);
      }
    },
    [user, displayMonthKey]
  );

  const local = data ?? journalMonthlyPlainEmpty(displayMonthKey || '');
  const setField = useCallback(
    <K extends keyof JournalMonthlyPlain>(k: K, v: JournalMonthlyPlain[K]) => {
      setData((prev) => ({ ...(prev ?? journalMonthlyPlainEmpty(displayMonthKey)), [k]: v }));
    },
    [displayMonthKey]
  );

  const monthNavShort = useMemo(() => formatMonthNavShort(displayMonthKey), [displayMonthKey]);

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
    if (!r) return { headers: [], cells: [] as Array<{ kind: 'empty' } | { kind: 'day'; dateKey: string; day: number }> };
    const headers = ['日', '月', '火', '水', '木', '金', '土'];
    const firstDow = new Date(r.y, r.m - 1, 1).getDay(); // 0=日
    const lastDay = new Date(r.y, r.m, 0).getDate();
    const cells: Array<{ kind: 'empty' } | { kind: 'day'; dateKey: string; day: number }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ kind: 'empty' });
    for (let d = 1; d <= lastDay; d++) {
      const dk = dateKeyFromYmd(r.y, r.m, d);
      cells.push({ kind: 'day', dateKey: dk, day: d });
    }
    // 端数を埋めて矩形にする（見た目安定）
    while (cells.length % 7 !== 0) cells.push({ kind: 'empty' });
    return { headers, cells };
  }, [displayMonthKey]);

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

        {!user && (
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
            ログインすると月次を記録できます。
          </p>
        )}

        <TrialSaveStatusLine message={msg} saving={saving} variant="compact-secondary" />

        <section className="monthly-section">
          <h3>行動の結果</h3>
          <p className="form-row" style={{ marginBottom: 0, color: 'var(--color-text-secondary)' }}>
            各日の朝・晩の実行結果（〇実行できた／△一部実行／×できなかった）。記号をクリックすると当該日の朝・晩画面へ移動します。
          </p>
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
        </section>

        <div className="action-sub-section">
          <h3>コーチ共有</h3>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-text-secondary)' }}>
            <input
              type="checkbox"
              checked={!!local.sharedWithCoach}
              disabled={!canEdit || !coachCommentsEnabled}
              onChange={(e) => {
                const v = e.target.checked;
                setField('sharedWithCoach', v);
                void patchAndSave({ sharedWithCoach: v });
              }}
            />
            コーチに共有する（閲覧）
          </label>
          {!coachCommentsEnabled && user && (
            <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: 12 }}>
              現在のプランではパーソナルコーチ機能が無効です。
            </p>
          )}
          <div style={{ marginTop: 12 }}>
            <button type="button" className="trial-action-btn" disabled>
              コーチへ質問を送信（後続）
            </button>
            <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: 12 }}>
              ※送信（＝暦月1回の消費）とスレッド作成は、クォータ実装（M2/M6）で対応します。
            </p>
          </div>
        </div>

        <div className="action-sub-section">
          <h3>今月の振り返り</h3>
          {journalShowMonthlyOutcomeGoal(level) ? (
            <MonthlyTextRow
              label="今月成果目標"
              value={local.thisMonthOutcomeGoalText ?? ''}
              disabled={!canEdit}
              onChange={(v) => setField('thisMonthOutcomeGoalText', v)}
              onBlur={() => patchAndSave({ thisMonthOutcomeGoalText: local.thisMonthOutcomeGoalText ?? '' })}
            />
          ) : null}
          {journalShowMonthlyActionGoal(level) ? (
            <MonthlyTextRow
              label="今月行動目標"
              value={local.thisMonthActionGoalText ?? ''}
              disabled={!canEdit}
              onChange={(v) => setField('thisMonthActionGoalText', v)}
              onBlur={() => patchAndSave({ thisMonthActionGoalText: local.thisMonthActionGoalText ?? '' })}
            />
          ) : null}
          {journalShowMonthlyActionSummary(level) ? (
            <MonthlyTextRow
              label="行動概要と成果達成状況"
              value={local.actionSummaryAndOutcomeProgressText ?? ''}
              disabled={!canEdit}
              onChange={(v) => setField('actionSummaryAndOutcomeProgressText', v)}
              onBlur={() =>
                patchAndSave({ actionSummaryAndOutcomeProgressText: local.actionSummaryAndOutcomeProgressText ?? '' })
              }
            />
          ) : null}
          <MonthlyTextRow
            label="気づき・感動・学び"
            value={local.insightAndLearningText ?? ''}
            disabled={!canEdit}
            onChange={(v) => setField('insightAndLearningText', v)}
            onBlur={() => patchAndSave({ insightAndLearningText: local.insightAndLearningText ?? '' })}
          />
          {journalShowMonthlyImprovementPoints(level) ? (
            <MonthlyTextRow
              label="改善点"
              value={local.improvementPointsText ?? ''}
              disabled={!canEdit}
              onChange={(v) => setField('improvementPointsText', v)}
              onBlur={() => patchAndSave({ improvementPointsText: local.improvementPointsText ?? '' })}
            />
          ) : null}
        </div>

        {journalShowMonthlyNextMonthGoal(level) ? (
          <div className="action-sub-section">
            <h3>来月の目標</h3>
            <MonthlyTextRow
              label="来月の行動目標"
              value={local.nextMonthActionGoalText ?? ''}
              disabled={!canEdit}
              onChange={(v) => setField('nextMonthActionGoalText', v)}
              onBlur={() => patchAndSave({ nextMonthActionGoalText: local.nextMonthActionGoalText ?? '' })}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
