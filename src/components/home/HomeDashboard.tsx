'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/context/ViewModeContext';
import {
  addDaysDateKey,
  getJournalWeeklyPlain,
  getTrial4wDailyPlain,
  listJournalDailyPlainInRange,
  type Trial4wDailyPlain,
} from '@/lib/firestore';
import {
  formatWeekRangeShortJa,
  getJsWeekdayInTokyo,
  getTodayDateKeyTokyo,
  getWeekStartDateKeyForToday,
} from '@/lib/journalWeek';
import { computeEveningExecutionSymbol, computeMorningCompletionSymbol } from '@/lib/trialDailyWeekSymbols';
import { isStart7dOnly } from '@/lib/enrollmentCourse';

/** コーチ新着（ダミー・プレミアム仕様確定後に接続） */
const DUMMY_COACH_NEWS = 'コーチからの新着情報（ダミー）は、プレミアム対象の仕様確定後に表示します。';

function TodayActionGoalBlock() {
  const { user, loading } = useAuth();
  const { mode } = useViewMode();
  const todayKey = useMemo(() => getTodayDateKeyTokyo(), []);
  const [goalText, setGoalText] = useState<string | null>(null);
  const [loadingGoal, setLoadingGoal] = useState(false);

  const showCoachAdminBlock = !!user && !loading && (mode === 'coach' || mode === 'admin');
  const showClientData = !!user && !loading && mode === 'client';

  useEffect(() => {
    if (!user?.uid || !showClientData) {
      setGoalText(null);
      setLoadingGoal(false);
      return;
    }
    let cancelled = false;
    setLoadingGoal(true);
    void (async () => {
      try {
        const doc = await getTrial4wDailyPlain(user.uid, todayKey);
        const t = doc.morningTodayActionText?.trim();
        if (!cancelled) setGoalText(t ?? '');
      } catch (e) {
        console.error(e);
        if (!cancelled) setGoalText('');
      } finally {
        if (!cancelled) setLoadingGoal(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, todayKey, showClientData]);

  if (!user && !loading) {
    return (
      <div className="home-dashboard-placeholder-card">
        <p className="home-dashboard-muted mb-0">
          ログインすると、当日（JST）に朝入力された行動目標がここに表示されます。
        </p>
      </div>
    );
  }

  if (user && loading) {
    return (
      <div className="home-dashboard-placeholder-card">
        <p className="home-dashboard-muted mb-0">読み込み中…</p>
      </div>
    );
  }

  if (showCoachAdminBlock) {
    return (
      <div className="home-dashboard-placeholder-card">
        <p className="home-dashboard-muted mb-0">
          コーチモードまたは管理者モードでは、今日の行動目標は表示できません。
        </p>
      </div>
    );
  }

  if (!showClientData) {
    return null;
  }

  if (loadingGoal) {
    return (
      <div className="home-dashboard-placeholder-card">
        <p className="home-dashboard-muted mb-0">読み込み中…</p>
      </div>
    );
  }

  const empty = !goalText?.trim();

  return (
    <div className="home-dashboard-goal-card">
      {empty ? (
        <p className="home-dashboard-muted mb-0">入力されていません。</p>
      ) : (
        <p className="home-dashboard-goal-text mb-0">{goalText}</p>
      )}
    </div>
  );
}

function WeeklyActionGoalBlock() {
  const { user, userProfile, loading } = useAuth();
  const { mode } = useViewMode();
  const weekStartKey = useMemo(
    () => (user ? getWeekStartDateKeyForToday(userProfile ?? null) : ''),
    [user, userProfile]
  );
  const [goalText, setGoalText] = useState<string | null>(null);
  const [loadingGoal, setLoadingGoal] = useState(false);

  const showCoachAdminBlock = !!user && !loading && (mode === 'coach' || mode === 'admin');
  const showClientData = !!user && !loading && mode === 'client';

  useEffect(() => {
    if (!user?.uid || !weekStartKey || !showClientData) {
      setGoalText(null);
      setLoadingGoal(false);
      return;
    }
    let cancelled = false;
    setLoadingGoal(true);
    void (async () => {
      try {
        const doc = await getJournalWeeklyPlain(user.uid, weekStartKey);
        const t = doc.thisWeekActionGoalText?.trim();
        if (!cancelled) setGoalText(t ?? '');
      } catch (e) {
        console.error(e);
        if (!cancelled) setGoalText('');
      } finally {
        if (!cancelled) setLoadingGoal(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, weekStartKey, showClientData]);

  if (!user && !loading) {
    return (
      <div className="home-dashboard-placeholder-card">
        <p className="home-dashboard-muted mb-0">
          ログインすると、今週の行動目標（週次タブで入力した内容・JST 基準の週）がここに表示されます。
        </p>
      </div>
    );
  }

  if (user && loading) {
    return (
      <div className="home-dashboard-placeholder-card">
        <p className="home-dashboard-muted mb-0">読み込み中…</p>
      </div>
    );
  }

  if (showCoachAdminBlock) {
    return (
      <div className="home-dashboard-placeholder-card">
        <p className="home-dashboard-muted mb-0">
          コーチモードまたは管理者モードでは、今週の行動目標は表示できません。
        </p>
      </div>
    );
  }

  if (!showClientData) {
    return null;
  }

  if (loadingGoal) {
    return (
      <div className="home-dashboard-placeholder-card">
        <p className="home-dashboard-muted mb-0">読み込み中…</p>
      </div>
    );
  }

  const empty = !goalText?.trim();

  return (
    <div className="home-dashboard-goal-card">
      {empty ? (
        <p className="home-dashboard-muted mb-0">入力されていません。</p>
      ) : (
        <p className="home-dashboard-goal-text mb-0">{goalText}</p>
      )}
    </div>
  );
}

function ClientWeeklyPreview() {
  const { user, userProfile, loading } = useAuth();
  const { mode } = useViewMode();
  const todayKey = useMemo(() => getTodayDateKeyTokyo(), []);
  const weekStartKey = useMemo(
    () => (user ? getWeekStartDateKeyForToday(userProfile ?? null) : ''),
    [user, userProfile]
  );
  const weekEndKey = useMemo(
    () => (weekStartKey ? addDaysDateKey(weekStartKey, 6) : ''),
    [weekStartKey]
  );
  const weekDates = useMemo(() => {
    if (!weekStartKey) return [];
    return Array.from({ length: 7 }, (_, i) => addDaysDateKey(weekStartKey, i));
  }, [weekStartKey]);

  const [dailyByDateKey, setDailyByDateKey] = useState<Record<string, Trial4wDailyPlain>>({});
  const [fetching, setFetching] = useState(false);

  const showCoachAdminBlock = !!user && !loading && (mode === 'coach' || mode === 'admin');
  const showClientData = !!user && !loading && mode === 'client';

  useEffect(() => {
    if (!user?.uid || !weekStartKey || !weekEndKey || !showClientData) {
      setDailyByDateKey({});
      setFetching(false);
      return;
    }
    let cancelled = false;
    setFetching(true);
    void (async () => {
      try {
        const rows = await listJournalDailyPlainInRange({
          uid: user.uid,
          startDateKey: weekStartKey,
          endDateKey: weekEndKey,
        });
        if (!cancelled) setDailyByDateKey(rows);
      } catch (e) {
        console.error(e);
        if (!cancelled) setDailyByDateKey({});
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, weekStartKey, weekEndKey, showClientData]);

  const dowJa = ['日', '月', '火', '水', '木', '金', '土'];

  if (!user && !loading) {
    return (
      <p className="home-dashboard-muted mb-0">
        ログインすると、開いている時間帯で入力された朝・晩の記録に基づく「今週の実施状況」プレビューが表示されます。
      </p>
    );
  }

  if (user && loading) {
    return <p className="home-dashboard-muted mb-0">読み込み中…</p>;
  }

  if (showCoachAdminBlock) {
    return (
      <p className="home-dashboard-muted mb-0">
        コーチモードまたは管理者モードでは、今週の実施状況プレビューは表示できません。
      </p>
    );
  }

  if (!showClientData) {
    return null;
  }

  if (!weekStartKey) {
    return <p className="home-dashboard-muted mb-0">週の開始日を取得できませんでした。</p>;
  }

  if (fetching && Object.keys(dailyByDateKey).length === 0) {
    return <p className="home-dashboard-muted mb-0">読み込み中…</p>;
  }

  return (
    <div className="trial-weekly-container home-dashboard-weekly-wrap">
      <p className="text-sm text-gray-600 mb-2">
        {formatWeekRangeShortJa(weekStartKey)}（JST）
        <span className="home-dashboard-week-note">
          ・朝は宣言・行動目標・イメージングの達成度、晩は実行（done / partial / none）。未来日は「—」。
        </span>
      </p>
      <div className="weekly-result-grid" role="grid" aria-label="今週の実施状況（プレビュー）">
        {weekDates.map((dk) => {
          const d = dailyByDateKey[dk];
          const m = computeMorningCompletionSymbol(d, dk, todayKey);
          const e = computeEveningExecutionSymbol(d, dk, todayKey);
          const [, mm, dd] = dk.split('-').map((x) => Number(x));
          const wd = getJsWeekdayInTokyo(dk);
          const href = `/trial_4w?tab=morning_evening&date=${encodeURIComponent(dk)}`;
          return (
            <div key={dk} className="weekly-result-cell" role="row">
              <div className="weekly-result-date-row" aria-label={`${mm}/${dd} ${dowJa[wd]}`}>
                <span className="weekly-result-date">
                  {mm}/{dd}
                </span>
                <span className="weekly-result-dow">{dowJa[wd]}</span>
              </div>
              <div className="weekly-result-symbols">
                <Link href={href} className={`weekly-symbol ${m.cls}`} aria-label={`${dk} の朝・晩へ（左は朝）`}>
                  {m.sym}
                </Link>
                <Link href={href} className={`weekly-symbol ${e.cls}`} aria-label={`${dk} の朝・晩へ（右は晩）`}>
                  {e.sym}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-2 mb-0">記号をタップすると、その日の朝・晩の入力画面へ移動します。</p>
    </div>
  );
}

export default function HomeDashboard() {
  const { user, userProfile, loading } = useAuth();
  const start7dOnly = !loading && !!user && isStart7dOnly(userProfile);

  if (start7dOnly) {
    return (
      <section id="home-section-dashboard-management" className="content-section">
        <h2 className="section-title">マネジメント情報</h2>
        <p className="home-dashboard-muted mb-0">
          7日間スタートプログラム利用中です。気づきノートのマネジメント情報は、ノートを開始したあとに表示されます。
        </p>
      </section>
    );
  }

  return (
    <section id="home-section-dashboard-management" className="content-section">
      <h2 className="section-title">マネジメント情報</h2>

      <div className="home-dashboard-grid">
        <div className="home-dashboard-left">
          <div className="home-dashboard-split-left-block">
            <h3 className="home-dashboard-subheading">今日の行動目標</h3>
            <TodayActionGoalBlock />
          </div>

          <div className="home-dashboard-split-left-block">
            <h3 className="home-dashboard-subheading">今週の行動目標</h3>
            <WeeklyActionGoalBlock />
          </div>

          <div className="home-dashboard-split-left-block">
            <h3 className="home-dashboard-subheading">今週の実施状況</h3>
            <ClientWeeklyPreview />
          </div>
        </div>

        <aside className="home-dashboard-right" aria-label="コーチからの新着情報">
          <div className="home-coach-news">
            <div className="home-coach-news-head">
              <h3 className="home-coach-news-title">コーチからの新着情報</h3>
              <Link
                href="/communication"
                className="home-message-detail-link"
                aria-label="コーチからの新着情報の詳細・一覧へ"
              >
                詳細
                <span className="material-symbols-outlined" aria-hidden style={{ fontSize: 18 }}>
                  chevron_right
                </span>
              </Link>
            </div>

            <p className="home-coach-news-body">{DUMMY_COACH_NEWS}</p>
            <div className="home-coach-news-premium-note" role="note">
              プレミアム仕様の確定後に表示されます。
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
