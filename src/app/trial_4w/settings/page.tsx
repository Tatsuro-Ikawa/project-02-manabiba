'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import { useJournalDetailLevel } from '@/context/JournalDetailLevelContext';
import { useAuth } from '@/hooks/useAuth';
import { updateTrialAffirmationUiMetaFields, updateWeeklyAiReportWriteMode } from '@/lib/firestore';
import {
  JOURNAL_DETAIL_LEVEL_LABELS,
  type JournalDetailLevel,
} from '@/lib/journalDetailLevel';
import type { WeeklyAiReportWriteMode } from '@/types/auth';
import { canAccessKizukiNoteApp } from '@/lib/enrollmentCourse';
import { shouldRedirectUnauthenticatedToLogin } from '@/lib/intentionalSignOut';

const LEVELS: JournalDetailLevel[] = ['simple', 'normal', 'detailed'];

export default function TrialJournalSettingsPage() {
  const router = useRouter();
  const { level, setDefaultLevel, hydrated } = useJournalDetailLevel();
  const { user, userProfile, refreshUserProfile, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draft, setDraft] = useState<JournalDetailLevel>(level);
  const [aiWriteMode, setAiWriteMode] = useState<WeeklyAiReportWriteMode>('append');
  /** 未設定時は表示する（true） */
  const [showAffirmationEditPreview, setShowAffirmationEditPreview] = useState(true);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hydrated) setDraft(level);
  }, [hydrated, level]);

  useEffect(() => {
    setAiWriteMode(userProfile?.weeklyAiReportWriteMode ?? 'append');
  }, [userProfile?.weeklyAiReportWriteMode]);

  useEffect(() => {
    setShowAffirmationEditPreview(userProfile?.trialAffirmationMeta?.showEditPreview !== false);
  }, [userProfile?.trialAffirmationMeta?.showEditPreview]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (!shouldRedirectUnauthenticatedToLogin()) return;
      router.replace('/trial_4w/landing');
      return;
    }
    if (!userProfile) return;
    if (!canAccessKizukiNoteApp(userProfile)) {
      router.replace('/trial_4w/landing');
    }
  }, [loading, user, userProfile, router]);

  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    try {
      setDefaultLevel(draft);
      if (user) {
        await updateWeeklyAiReportWriteMode(user.uid, aiWriteMode);
        await updateTrialAffirmationUiMetaFields(user.uid, {
          showEditPreview: showAffirmationEditPreview,
        });
        await refreshUserProfile();
      }
      setSavedMsg('設定を保存しました。');
    } catch (e) {
      setSavedMsg(e instanceof Error ? e.message : '設定保存に失敗しました。');
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(null), 2500);
    }
  }, [
    aiWriteMode,
    draft,
    refreshUserProfile,
    setDefaultLevel,
    showAffirmationEditPreview,
    user,
  ]);

  const actionsBar = (
    <div className="action-sub-section" data-section="journal-settings-actions">
      <h3>設定の保存</h3>
      <p className="text-sm text-gray-600 mb-2">
        このページのすべての項目（入力表示・アファメーション編集プレビュー・Aiレポート反映方式）をまとめて保存します。
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          className="trial-action-btn"
          disabled={!hydrated || saving}
          onClick={() => void handleSaveAll()}
        >
          {saving ? '保存中…' : '保存'}
        </button>
        <Link
          href="/trial_4w"
          className="trial-action-btn"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
        >
          気づきノートへ戻る
        </Link>
      </div>
      {savedMsg ? (
        <p className="text-sm text-gray-700 mt-2" role="status">
          {savedMsg}
        </p>
      ) : null}
    </div>
  );

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
                  気づきノートの表示設定
                </h1>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                各項目を変更したあと、ページ最下部の「保存」でまとめて反映します。入力表示のデフォルトはトライアル画面上部のラジオボタンとも同期されます。
              </p>

              {actionsBar}

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
              </div>

              <div className="action-sub-section" data-section="affirmation-edit-preview">
                <h3>アファメーション編集時のプレビュー</h3>
                <p className="text-sm text-gray-600 mb-2">
                  行動宣言タブの「編集」モーダルで、本文の右側に表示するプレビューの有無です。Markdown
                  に慣れていない場合は非表示にできます（本文の編集はそのまま行えます）。
                </p>
                <div
                  className="radio-group"
                  role="radiogroup"
                  aria-label="アファメーション編集時のプレビュー表示"
                >
                  <label>
                    <input
                      type="radio"
                      name="affirmation-edit-preview"
                      value="show"
                      checked={showAffirmationEditPreview}
                      onChange={() => setShowAffirmationEditPreview(true)}
                    />{' '}
                    表示する（既定）
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="affirmation-edit-preview"
                      value="hide"
                      checked={!showAffirmationEditPreview}
                      onChange={() => setShowAffirmationEditPreview(false)}
                    />{' '}
                    表示しない
                  </label>
                </div>
              </div>

              <div className="action-sub-section" data-section="journal-ai-report-write-mode">
                <h3>気づきノート Aiレポート作成の既存入力反映方式（週・月共通）</h3>
                <p className="text-sm text-gray-600 mb-2">
                  週タブ・月タブの「Aiレポート作成を実行」で出力した下書きを、行動面・成果面・心理面・気づき・学び・成長の各欄にどう反映するかです。Firestore のユーザープロファイルに保存されます。
                </p>
                <div className="radio-group" role="radiogroup" aria-label="気づきノート Aiレポートの反映方式（週・月共通）">
                  <label>
                    <input
                      type="radio"
                      name="journal-ai-report-write-mode"
                      value="skip_if_nonempty"
                      checked={aiWriteMode === 'skip_if_nonempty'}
                      onChange={() => setAiWriteMode('skip_if_nonempty')}
                    />{' '}
                    既に入力がある欄は上書きしない（空欄のみ反映）
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="journal-ai-report-write-mode"
                      value="overwrite"
                      checked={aiWriteMode === 'overwrite'}
                      onChange={() => setAiWriteMode('overwrite')}
                    />{' '}
                    上書き
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="journal-ai-report-write-mode"
                      value="append"
                      checked={aiWriteMode === 'append'}
                      onChange={() => setAiWriteMode('append')}
                    />{' '}
                    追記（既定）
                  </label>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  未ログイン時はブラウザ内のみで表示され、Firestore には保存されません。
                </p>
              </div>

              {actionsBar}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
