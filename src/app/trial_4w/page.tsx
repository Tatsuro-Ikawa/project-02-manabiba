'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/context/ViewModeContext';
import TrialAffirmation from '@/components/trial/TrialAffirmation';
import TrialMorningEvening from '@/components/trial/TrialMorningEvening';
import TrialWeekly from '@/components/trial/TrialWeekly';
import TrialMonthly from '@/components/trial/TrialMonthly';
import CoachClientPickerModal from '@/components/trial/CoachClientPickerModal';
import JournalDetailLevelSwitch from '@/components/trial/JournalDetailLevelSwitch';
import { getUserProfile } from '@/lib/firestore';

const TAB_KEYS = ['affirmation', 'morning_evening', 'weekly', 'monthly'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  affirmation: '行動宣言',
  morning_evening: '朝・晩',
  weekly: '週',
  monthly: '月',
};

const TAB_ICONS: Record<TabKey, string> = {
  affirmation: 'auto_awesome', // 行動宣言＝肯定的な言葉・キラキラのイメージ（format_quote は 99 に見えやすいため変更）
  morning_evening: 'wb_sunny',
  weekly: 'date_range',
  monthly: 'calendar_month',
};

function parseTab(param: string | null): TabKey {
  if (param && TAB_KEYS.includes(param as TabKey)) return param as TabKey;
  return 'affirmation';
}

/** ボタン内表示用: 長いクライアント名は省略（メニューバー折り返し防止） */
const CLIENT_NAME_DISPLAY_MAX = 12;

function truncateForShareButton(raw: string, maxLen: number): string {
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen)}…`;
}

function Trial4wContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = useMemo(() => parseTab(tabParam), [tabParam]);
  const [currentTab, setCurrentTab] = useState<TabKey>(initialTab);
  const coachClientParam = searchParams.get('coachClient');
  const coachClientUid = useMemo(() => (coachClientParam ? coachClientParam : null), [coachClientParam]);

  useEffect(() => {
    setCurrentTab(parseTab(searchParams.get('tab')));
  }, [searchParams]);

  const setTab = useCallback((tab: TabKey) => {
    setCurrentTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);

  const { user, loading, userProfile } = useAuth();
  const loggedIn = !loading && !!user;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { mode } = useViewMode();
  const isCoachView =
    loggedIn &&
    mode === 'coach' &&
    !!userProfile &&
    (userProfile.role === 'coach' || userProfile.role === 'senior_coach');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coachClientLabel, setCoachClientLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!coachClientUid) {
      setCoachClientLabel(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const prof = await getUserProfile(coachClientUid);
        if (cancelled) return;
        setCoachClientLabel(prof?.displayName?.trim() || prof?.email || coachClientUid);
      } catch {
        if (!cancelled) setCoachClientLabel(coachClientUid);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coachClientUid]);

  const coachClientNameForButton = useMemo(() => {
    if (!coachClientUid) return '';
    if (coachClientLabel == null) return '取得中…';
    return truncateForShareButton(coachClientLabel, CLIENT_NAME_DISPLAY_MAX);
  }, [coachClientUid, coachClientLabel]);

  const coachShareButtonTitle =
    coachClientUid && coachClientLabel && coachClientLabel.length > CLIENT_NAME_DISPLAY_MAX
      ? coachClientLabel
      : undefined;

  const setCoachClientUid = useCallback((next: string | null) => {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('coachClient', next);
    else url.searchParams.delete('coachClient');
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div style={{ fontFamily: 'var(--font-family-jp)' }}>
      <ProtoHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <LeftSidebar
        variant="trial"
        trialTab={currentTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="trial-main-wrapper">
        <div className="trial-main">
          <nav
            className={`trial-menu-bar${isCoachView && coachClientUid ? ' coach-share-active' : ''}`}
            aria-label="トライアルメニュー"
          >
            {TAB_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={`trial-menu-item ${currentTab === key ? 'active' : ''}`}
                aria-label={TAB_LABELS[key]}
                aria-current={currentTab === key ? 'page' : undefined}
                onClick={() => setTab(key)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {TAB_ICONS[key]}
                </span>
                <span className="menu-text" aria-hidden="true">
                  {TAB_LABELS[key]}
                </span>
              </button>
            ))}
            <div className="trial-menu-spacer" aria-hidden="true" />
            <JournalDetailLevelSwitch />
            {isCoachView && (
              <>
                <button
                  type="button"
                  className={`trial-menu-share-btn${coachClientUid ? ' trial-menu-share-btn--active' : ''}`}
                  onClick={() => setPickerOpen(true)}
                  title={coachShareButtonTitle}
                  aria-label={
                    coachClientUid && coachClientLabel
                      ? `共有（表示中: ${coachClientLabel}）`
                      : coachClientUid
                        ? '共有（クライアント表示中）'
                        : '共有（クライアント選択）'
                  }
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    group
                  </span>
                  {coachClientUid ? (
                    <span className="trial-menu-share-btn-label">
                      <span className="trial-menu-share-status">共有中:</span>
                      <span className="trial-menu-share-client">{coachClientNameForButton}</span>
                    </span>
                  ) : (
                    <span className="trial-menu-share-btn-label">共有</span>
                  )}
                </button>
              </>
            )}
          </nav>

          {currentTab === 'affirmation' && <TrialAffirmation coachClientUid={coachClientUid} />}
          {currentTab === 'morning_evening' && <TrialMorningEvening />}
          {currentTab === 'weekly' && <TrialWeekly />}
          {currentTab === 'monthly' && <TrialMonthly />}
        </div>
      </div>

      {isCoachView && user && (
        <CoachClientPickerModal
          open={pickerOpen}
          coachUid={user.uid}
          currentClientUid={coachClientUid}
          onClose={() => setPickerOpen(false)}
          onShare={(clientUid) => {
            setCoachClientUid(clientUid);
            setPickerOpen(false);
          }}
          onClear={() => {
            setCoachClientUid(null);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default function Trial4wPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen" style={{ fontFamily: 'var(--font-family-jp)' }}>読み込み中...</div>}>
      <Trial4wContent />
    </Suspense>
  );
}
