'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  formatWeekRangeLabelJa,
  getWeekStartDateKeyForToday,
  getTodayDateKeyTokyo,
  getWeekStartDateKeyForDateKey,
  getJsWeekdayInTokyo,
  resolveJournalWeekStartsOn,
  shiftWeekStartDateKey,
} from '@/lib/journalWeek';
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

export default function TrialWeekly() {
  const { user, userProfile, loading } = useAuth();
  const searchParams = useSearchParams();
  const [weekStartKey, setWeekStartKey] = useState('');
  const [data, setData] = useState<JournalWeeklyPlain | null>(null);
  const [dailyByDateKey, setDailyByDateKey] = useState<Record<string, Trial4wDailyPlain>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
        nextWeekActionGoalText: data.nextWeekActionGoalText,
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
          <span className="week-nav-label">{formatWeekRangeLabelJa(displayWeekStartKey)}</span>
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

        {msg && <p className="text-sm text-gray-700 mb-3">{msg}</p>}

        <div className="action-sub-section" data-section="weekly-goal">
          <h3>今週の行動目標</h3>
          <WeeklyTextRow
            label="目標"
            value={data.thisWeekActionGoalText ?? ''}
            disabled={saving}
            onChange={(v) => setData((prev) => (prev ? { ...prev, thisWeekActionGoalText: v } : prev))}
            onBlur={() => void savePatch({ thisWeekActionGoalText: data.thisWeekActionGoalText })}
            placeholder="入力してください"
          />
        </div>

        <div className="action-sub-section" data-section="weekly-results">
          <h3>行動の結果</h3>
          <p className="text-sm text-gray-600 mb-3">各日の朝・晩の実行結果。記号をクリックすると当該日の朝・晩へ移動します。</p>
          <div className="weekly-result-grid" role="grid" aria-label="行動の結果（7日）">
            {weekDates.map((dk) => {
              const d = dailyByDateKey[dk];
              const m = computeMorningSymbol(d, dk);
              const e = computeEveningSymbol(d, dk);
              const [yy, mm, dd] = dk.split('-').map((x) => Number(x));
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
        </div>

        <div className="action-sub-section" data-section="weekly-review">
          <h3>今週の振り返り</h3>
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

            <div className="weekly-satisfaction-chart" aria-label="満足度（折れ線）">
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

          <WeeklyTextRow
            label="行動内容と成果"
            value={data.actionContentAndOutcomeText ?? ''}
            disabled={saving}
            onChange={(v) =>
              setData((prev) => (prev ? { ...prev, actionContentAndOutcomeText: v } : prev))
            }
            onBlur={() => void savePatch({ actionContentAndOutcomeText: data.actionContentAndOutcomeText })}
            placeholder="どのような行動を実施し、目標指標に対してどの程度できたか"
          />
          <WeeklyTextRow
            label="行動時の思考・感情"
            value={data.emotionAndThoughtText ?? ''}
            disabled={saving}
            onChange={(v) => setData((prev) => (prev ? { ...prev, emotionAndThoughtText: v } : prev))}
            onBlur={() => void savePatch({ emotionAndThoughtText: data.emotionAndThoughtText })}
            placeholder="入力してください"
          />
          <WeeklyTextRow
            label="今週の気づき・感動・学び"
            value={data.insightAndLearningText ?? ''}
            disabled={saving}
            onChange={(v) =>
              setData((prev) => (prev ? { ...prev, insightAndLearningText: v } : prev))
            }
            onBlur={() => void savePatch({ insightAndLearningText: data.insightAndLearningText })}
            placeholder="入力してください"
          />
          <WeeklyTextRow
            label="今週の改善まとめ"
            value={data.improvementSummaryText ?? ''}
            disabled={saving}
            onChange={(v) =>
              setData((prev) => (prev ? { ...prev, improvementSummaryText: v } : prev))
            }
            onBlur={() => void savePatch({ improvementSummaryText: data.improvementSummaryText })}
            placeholder="入力してください"
          />
        </div>

        <div className="action-sub-section" data-section="next-week-goal">
          <h3>来週の行動目標</h3>
          <WeeklyTextRow
            label="来週の目標"
            value={data.nextWeekActionGoalText ?? ''}
            disabled={saving}
            onChange={(v) =>
              setData((prev) => (prev ? { ...prev, nextWeekActionGoalText: v } : prev))
            }
            onBlur={() => void savePatch({ nextWeekActionGoalText: data.nextWeekActionGoalText })}
            placeholder="入力してください（翌週へ進むときの繰り越しは後続フェーズ）"
          />
        </div>
      </div>
    </div>
  );
}
