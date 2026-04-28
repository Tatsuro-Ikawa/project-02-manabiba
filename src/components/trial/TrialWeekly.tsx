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
import {
  journalShowWeeklySatisfactionChart,
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
  const { level } = useJournalDetailLevel();
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

  const generateAiWeeklyReport = useCallback(async () => {
    if (!user || !data) return;
    const doneDays = weekDates.filter((dk) => dk <= todayKey && dailyByDateKey[dk]?.eveningExecution === 'done').length;
    const partialDays = weekDates.filter((dk) => dk <= todayKey && dailyByDateKey[dk]?.eveningExecution === 'partial').length;
    const noneDays = weekDates.filter((dk) => dk <= todayKey && dailyByDateKey[dk]?.eveningExecution === 'none').length;

    const actionText = [
      '【行動面】',
      `今週は「できた」${doneDays}日、「一部できた」${partialDays}日、「できなかった」${noneDays}日でした。`,
      'できた日の条件（時間帯・環境・きっかけ）を1つ特定し、来週はその条件を再現してみましょう。',
    ].join('\n');

    const outcomeText = [
      '【成果面】',
      `満足度の平均は ${satisfactionStats.avg == null ? '—' : satisfactionStats.avg.toFixed(1)} / 10 でした。`,
      '満足度が高い日/低い日の差を1つだけ言語化し、来週は「高い日」の要素を小さく足してみましょう。',
    ].join('\n');

    const psychologyText = [
      '【心理面】',
      '行動前・行動中・行動後で、思考（捉え方）と感情がどう変化したかを1〜2行でまとめましょう。',
      'つまずきがあった場合は「どんなブレーキが働いたか」「反論の言葉」を来週の支えとして再利用できる形に整えるのがおすすめです。',
    ].join('\n');

    const patch: Partial<JournalWeeklyPlain> = {
      weeklyActionReviewText: actionText,
      weeklyOutcomeReviewText: outcomeText,
      weeklyPsychologyText: psychologyText,
    };

    setData((prev) => (prev ? { ...prev, ...patch } : prev));
    await savePatch(patch);
  }, [user, data, weekDates, todayKey, dailyByDateKey, satisfactionStats, savePatch]);

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
            placeholder="例：毎朝10分、振り返りを書く"
          />
          <WeeklyTextRow
            label="◇行動内容：どのように"
            value={data.thisWeekActionContentText ?? ''}
            disabled={saving}
            onChange={(v) => setData((prev) => (prev ? { ...prev, thisWeekActionContentText: v } : prev))}
            onBlur={() => void savePatch({ thisWeekActionContentText: data.thisWeekActionContentText })}
            placeholder="例：起床後すぐに机に座り、昨日の行動と気づきを3行で書く"
          />
        </div>

        <div className="action-sub-section" data-section="weekly-reflection">
          <h3>今週の振り返り</h3>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="label-wrap">
                <span>◇Ai レポート作成</span>
              </div>
              <button
                type="button"
                className="trial-ai-btn"
                disabled={saving}
                onClick={() => void generateAiWeeklyReport()}
              >
                Aiレポート作成
              </button>
            </div>
            <p className="text-sm text-gray-600">
              ボタンを押すと「行動面」「成果面」「心理面」の入力欄に下書きを自動で出力します（手動で編集できます）。
            </p>
          </div>

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

            <WeeklyTextRow
              label="・行動の振り返り"
              value={data.weeklyActionReviewText ?? ''}
              disabled={saving}
              onChange={(v) => setData((prev) => (prev ? { ...prev, weeklyActionReviewText: v } : prev))}
              onBlur={() => void savePatch({ weeklyActionReviewText: data.weeklyActionReviewText })}
              placeholder="ここに、Aiレポート作成のアウトプット（行動面）を入力します。手動入力も可能です。"
            />
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

              {journalShowWeeklySatisfactionChart(level) ? (
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
              ) : null}
            </div>

            <WeeklyTextRow
              label="・行動の振り返り"
              value={data.weeklyOutcomeReviewText ?? ''}
              disabled={saving}
              onChange={(v) => setData((prev) => (prev ? { ...prev, weeklyOutcomeReviewText: v } : prev))}
              onBlur={() => void savePatch({ weeklyOutcomeReviewText: data.weeklyOutcomeReviewText })}
              placeholder="ここに、Aiレポート作成のアウトプット（成果面）を入力します。手動入力も可能です。"
            />

            <WeeklyTextRow
              label="・指標の達成度"
              value={data.weeklyMetricAchievementText ?? ''}
              disabled={saving}
              onChange={(v) => setData((prev) => (prev ? { ...prev, weeklyMetricAchievementText: v } : prev))}
              onBlur={() => void savePatch({ weeklyMetricAchievementText: data.weeklyMetricAchievementText })}
              placeholder="例：今週の指標（回数・時間・成果など）と達成度を記載してください。"
            />
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
            <WeeklyTextRow
              label="・Ai改善提案"
              value={data.aiImprovementSuggestionText ?? ''}
              disabled={saving}
              onChange={(v) => setData((prev) => (prev ? { ...prev, aiImprovementSuggestionText: v } : prev))}
              onBlur={() => void savePatch({ aiImprovementSuggestionText: data.aiImprovementSuggestionText })}
              placeholder="（準備中）Ai改善提案の出力先です。現段階では手動入力してください。"
            />
          </div>

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
            <WeeklyTextRow
              label="・行動内容（具体的に）"
              value={data.nextWeekActionContentText ?? ''}
              disabled={saving}
              onChange={(v) => setData((prev) => (prev ? { ...prev, nextWeekActionContentText: v } : prev))}
              onBlur={() => void savePatch({ nextWeekActionContentText: data.nextWeekActionContentText })}
              placeholder="入力してください（次週へ進むとき、今週の行動へ繰り越されます）"
            />
          </div>

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
        </div>
      </div>
    </div>
  );
}
