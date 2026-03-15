'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import { useAuth } from '@/hooks/useAuth';
import TrialAffirmation from '@/components/trial/TrialAffirmation';
import TrialMorningEvening from '@/components/trial/TrialMorningEvening';
import TrialWeekly from '@/components/trial/TrialWeekly';
import TrialMonthly from '@/components/trial/TrialMonthly';

const TAB_KEYS = ['affirmation', 'morning_evening', 'weekly', 'monthly'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  affirmation: 'アファメーション',
  morning_evening: '朝・晩',
  weekly: '週',
  monthly: '月',
};

const TAB_ICONS: Record<TabKey, string> = {
  affirmation: 'auto_awesome', // アファメーション＝肯定的な言葉・キラキラのイメージ（format_quote は 99 に見えやすいため変更）
  morning_evening: 'wb_sunny',
  weekly: 'date_range',
  monthly: 'calendar_month',
};

function parseTab(param: string | null): TabKey {
  if (param && TAB_KEYS.includes(param as TabKey)) return param as TabKey;
  return 'affirmation';
}

function Trial4wContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = useMemo(() => parseTab(tabParam), [tabParam]);
  const [currentTab, setCurrentTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    setCurrentTab(parseTab(searchParams.get('tab')));
  }, [searchParams]);

  const setTab = useCallback((tab: TabKey) => {
    setCurrentTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);

  const { user, loading } = useAuth();
  const loggedIn = !loading && !!user;
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <nav className="trial-menu-bar" aria-label="トライアルメニュー">
            {TAB_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={`trial-menu-item ${currentTab === key ? 'active' : ''}`}
                onClick={() => setTab(key)}
              >
                <span className="material-symbols-outlined">{TAB_ICONS[key]}</span>
                <span>{TAB_LABELS[key]}</span>
              </button>
            ))}
          </nav>

          {currentTab === 'affirmation' && <TrialAffirmation />}
          {currentTab === 'morning_evening' && <TrialMorningEvening />}
          {currentTab === 'weekly' && <TrialWeekly />}
          {currentTab === 'monthly' && <TrialMonthly />}
        </div>
      </div>
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
