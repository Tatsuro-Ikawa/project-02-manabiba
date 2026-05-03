'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import { useJournalDetailLevel } from '@/context/JournalDetailLevelContext';
import { useAuth } from '@/hooks/useAuth';
import { updateWeeklyAiReportWriteMode } from '@/lib/firestore';
import {
  JOURNAL_DETAIL_LEVEL_LABELS,
  type JournalDetailLevel,
} from '@/lib/journalDetailLevel';
import type { WeeklyAiReportWriteMode } from '@/types/auth';

const LEVELS: JournalDetailLevel[] = ['simple', 'normal', 'detailed'];

export default function TrialJournalSettingsPage() {
  const { level, setDefaultLevel, hydrated } = useJournalDetailLevel();
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draft, setDraft] = useState<JournalDetailLevel>(level);
  const [aiWriteMode, setAiWriteMode] = useState<WeeklyAiReportWriteMode>('append');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated) setDraft(level);
  }, [hydrated, level]);

  useEffect(() => {
    setAiWriteMode(userProfile?.weeklyAiReportWriteMode ?? 'append');
  }, [userProfile?.weeklyAiReportWriteMode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div style={{ fontFamily: 'var(--font-family-jp)' }}>
      <ProtoHeader sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <LeftSidebar variant="trial" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="trial-main-wrapper">
        <div className="trial-main">
          <div className="trial-tab-content">
            <div className="morning-evening-container">
              <div className="trial-tab-heading-row">
                <h1 id="trial-settings-title" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                  学び帳の表示設定（仮）
                </h1>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                朝・晩・週・月の入力項目の表示を「簡易」「普通」「詳細」から選びます。ここで選んだ値はデフォルトとして保存され、トライアル画面上部のラジオボタンと同期されます。
              </p>

              <div className="action-sub-section" data-section="journal-settings">
                <h3>入力表示のデフォルト</h3>
                <div className="radio-group" role="radiogroup" aria-labelledby="trial-settings-title">
                  {LEVELS.map((k) => (
                    <label key={k}>
                      <input
                        type="radio"
                        name="journal-default-level"
                        value={k}
                        checked={draft === k}
                        disabled={!hydrated}
                        onChange={() => setDraft(k)}
                      />{' '}
                      {JOURNAL_DETAIL_LEVEL_LABELS[k]}
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="trial-action-btn"
                    disabled={!hydrated}
                    onClick={async () => {
                      try {
                        setDefaultLevel(draft);
                        if (user) {
                          await updateWeeklyAiReportWriteMode(user.uid, aiWriteMode);
                          await refreshUserProfile();
                        }
                        setSavedMsg('設定を保存しました。');
                      } catch (e) {
                        setSavedMsg(e instanceof Error ? e.message : '設定保存に失敗しました。');
                      }
                      setTimeout(() => setSavedMsg(null), 2500);
                    }}
                  >
                    保存
                  </button>
                  <Link href="/trial_4w" className="trial-action-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                    スタートへ戻る
                  </Link>
                </div>
                {savedMsg ? <p className="text-sm text-gray-700 mt-2">{savedMsg}</p> : null}
              </div>

              <div className="action-sub-section" data-section="weekly-ai-write-mode">
                <h3>週次 Aiレポートの既存入力反映方式</h3>
                <div className="radio-group" role="radiogroup" aria-label="週次 Aiレポートの反映方式">
                  <label>
                    <input
                      type="radio"
                      name="weekly-ai-write-mode"
                      value="append"
                      checked={aiWriteMode === 'append'}
                      onChange={() => setAiWriteMode('append')}
                    />{' '}
                    追記（既定）
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="weekly-ai-write-mode"
                      value="overwrite"
                      checked={aiWriteMode === 'overwrite'}
                      onChange={() => setAiWriteMode('overwrite')}
                    />{' '}
                    上書き
                  </label>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  未ログイン時はブラウザ内のみで表示され、Firestore には保存されません。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
