'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import { useJournalDetailLevel } from '@/context/JournalDetailLevelContext';
import { useAuth } from '@/hooks/useAuth';
import { useStartProgramAppSettings } from '@/hooks/useStartProgramAppSettings';
import { useStep03CandidateMax } from '@/hooks/useStep03CandidateMax';
import { updateCoachShareDefaults, updateTrialAffirmationUiMetaFields, updateWeeklyAiReportWriteMode } from '@/lib/firestore';
import {
  JOURNAL_DETAIL_LEVEL_LABELS,
  type JournalDetailLevel,
} from '@/lib/journalDetailLevel';
import type { WeeklyAiReportWriteMode } from '@/types/auth';
import { canAccessKizukiNoteApp } from '@/lib/enrollmentCourse';
import { shouldRedirectUnauthenticatedToLogin } from '@/lib/intentionalSignOut';
import {
  STEP03_CANDIDATE_MAX_DEFAULT,
  STEP03_CANDIDATE_MAX_MAX,
  STEP03_CANDIDATE_MAX_MIN,
} from '@/lib/startProgram/step03Constants';
import {
  STEP04_REASON_LIMIT_CEIL,
  STEP04_REASON_LIMIT_FLOOR,
  STEP04_REASON_MAX_DEFAULT,
  STEP04_REASON_MIN_DEFAULT,
} from '@/lib/startProgram/step04Constants';
import { normalizeStep04ReasonLimits } from '@/lib/startProgram/appSettings';

const LEVELS: JournalDetailLevel[] = ['simple', 'normal', 'detailed'];

const CANDIDATE_MAX_OPTIONS = Array.from(
  { length: STEP03_CANDIDATE_MAX_MAX - STEP03_CANDIDATE_MAX_MIN + 1 },
  (_, i) => STEP03_CANDIDATE_MAX_MIN + i
);

const REASON_LIMIT_OPTIONS = Array.from(
  { length: STEP04_REASON_LIMIT_CEIL - STEP04_REASON_LIMIT_FLOOR + 1 },
  (_, i) => STEP04_REASON_LIMIT_FLOOR + i
);

const SELECT_STYLE = {
  font: 'inherit',
  padding: '0.4rem 0.55rem',
  borderRadius: 8,
  border: '1px solid #c8c4bc',
  minWidth: '6rem',
} as const;

export default function AppSettingsPage() {
  const router = useRouter();
  const { level, setDefaultLevel, hydrated: journalHydrated } = useJournalDetailLevel();
  const {
    candidateMax,
    setCandidateMax,
    hydrated: candidateHydrated,
  } = useStep03CandidateMax();
  const {
    settings: startSettings,
    saveSettings: saveStartSettings,
    hydrated: startSettingsHydrated,
  } = useStartProgramAppSettings();
  const [draftReasonMin, setDraftReasonMin] = useState(startSettings.step04ReasonMin);
  const [draftReasonMax, setDraftReasonMax] = useState(startSettings.step04ReasonMax);
  const [draftJournalDatePopup, setDraftJournalDatePopup] = useState(startSettings.journalDatePopup);
  const { user, userProfile, refreshUserProfile, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draft, setDraft] = useState<JournalDetailLevel>(level);
  const [draftCandidateMax, setDraftCandidateMax] = useState(candidateMax);
  const [aiWriteMode, setAiWriteMode] = useState<WeeklyAiReportWriteMode>('append');
  /** 未設定時は表示する（true） */
  const [showAffirmationEditPreview, setShowAffirmationEditPreview] = useState(true);
  const [journalShareDefaultOn, setJournalShareDefaultOn] = useState(false);
  const [affirmationShareDefaultOn, setAffirmationShareDefaultOn] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showKizukiSettings = !!userProfile && canAccessKizukiNoteApp(userProfile);
  const hydrated = journalHydrated && candidateHydrated && startSettingsHydrated;

  useEffect(() => {
    if (!startSettingsHydrated) return;
    setDraftReasonMin(startSettings.step04ReasonMin);
    setDraftReasonMax(startSettings.step04ReasonMax);
    setDraftJournalDatePopup(startSettings.journalDatePopup);
  }, [
    startSettingsHydrated,
    startSettings.step04ReasonMin,
    startSettings.step04ReasonMax,
    startSettings.journalDatePopup,
  ]);

  useEffect(() => {
    if (journalHydrated) setDraft(level);
  }, [journalHydrated, level]);

  useEffect(() => {
    if (candidateHydrated) setDraftCandidateMax(candidateMax);
  }, [candidateHydrated, candidateMax]);

  useEffect(() => {
    setAiWriteMode(userProfile?.weeklyAiReportWriteMode ?? 'append');
  }, [userProfile?.weeklyAiReportWriteMode]);

  useEffect(() => {
    setShowAffirmationEditPreview(userProfile?.trialAffirmationMeta?.showEditPreview !== false);
  }, [userProfile?.trialAffirmationMeta?.showEditPreview]);

  useEffect(() => {
    setJournalShareDefaultOn(userProfile?.journalCoachShareDefaultOn === true);
    setAffirmationShareDefaultOn(userProfile?.affirmationCoachShareDefaultOn === true);
  }, [userProfile?.journalCoachShareDefaultOn, userProfile?.affirmationCoachShareDefaultOn]);

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
      router.replace('/');
    }
  }, [loading, user, router]);

  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    try {
      setCandidateMax(draftCandidateMax);
      const limits = normalizeStep04ReasonLimits(draftReasonMin, draftReasonMax);
      saveStartSettings({ step04ReasonMin: limits.min, step04ReasonMax: limits.max });
      if (showKizukiSettings) {
        saveStartSettings({ journalDatePopup: draftJournalDatePopup });
        setDefaultLevel(draft);
        if (user) {
          await updateWeeklyAiReportWriteMode(user.uid, aiWriteMode);
          await updateTrialAffirmationUiMetaFields(user.uid, {
            showEditPreview: showAffirmationEditPreview,
          });
          await updateCoachShareDefaults(user.uid, {
            journalCoachShareDefaultOn: journalShareDefaultOn,
            affirmationCoachShareDefaultOn: affirmationShareDefaultOn,
          });
          await refreshUserProfile();
        }
      }
      setSavedMsg('設定を保存しました。');
    } catch (e) {
      setSavedMsg(e instanceof Error ? e.message : '設定保存に失敗しました。');
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(null), 2500);
    }
  }, [
    affirmationShareDefaultOn,
    aiWriteMode,
    draft,
    draftCandidateMax,
    draftJournalDatePopup,
    draftReasonMax,
    draftReasonMin,
    journalShareDefaultOn,
    refreshUserProfile,
    saveStartSettings,
    setCandidateMax,
    setDefaultLevel,
    showAffirmationEditPreview,
    showKizukiSettings,
    user,
  ]);

  const actionsBar = (
    <div className="action-sub-section" data-section="app-settings-actions">
      <h3>設定の保存</h3>
      <p className="text-sm text-gray-600 mb-2">
        このページのすべての項目をまとめて保存します。
        {showKizukiSettings
          ? '（スタートプログラム・気づきノート・コーチ共有・Aiレポート反映方式）'
          : '（スタートプログラム）'}
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
          href="/start-program"
          className="trial-action-btn"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
        >
          スタートへ
        </Link>
        {showKizukiSettings ? (
          <Link
            href="/trial_4w"
            className="trial-action-btn"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            気づきノートへ
          </Link>
        ) : null}
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
      <LeftSidebar variant="home" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="trial-main-wrapper">
        <div className="trial-main">
          <div className="trial-tab-content">
            <div className="morning-evening-container">
              <div className="trial-tab-heading-row">
                <h1 id="app-settings-title" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                  設定
                </h1>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                スタートプログラムと気づきノートの共通設定です。各項目を変更したあと、ページの「保存」でまとめて反映します。
              </p>

              {actionsBar}

              <div className="action-sub-section" data-section="start-program-settings">
                <h3>スタートプログラム</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Step3「取組領域」で一度に選べる候補の上限です。既定は {STEP03_CANDIDATE_MAX_DEFAULT}
                  です（範囲 {STEP03_CANDIDATE_MAX_MIN}〜{STEP03_CANDIDATE_MAX_MAX}）。この端末のブラウザに保存されます。
                </p>
                <label className="text-sm font-medium text-gray-800" htmlFor="step03-candidate-max">
                  取組領域の候補選択の上限
                </label>
                <div style={{ marginTop: '0.35rem' }}>
                  <select
                    id="step03-candidate-max"
                    value={draftCandidateMax}
                    disabled={!candidateHydrated}
                    onChange={(e) => setDraftCandidateMax(Number(e.target.value))}
                    style={SELECT_STYLE}
                  >
                    {CANDIDATE_MAX_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                        {n === STEP03_CANDIDATE_MAX_DEFAULT ? '（既定）' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-sm text-gray-600 mb-2" style={{ marginTop: '1rem' }}>
                  Step4「理由」で書き出す個数の下限・上限です。下限に達すると次へ進めます。既定は下限{' '}
                  {STEP04_REASON_MIN_DEFAULT}・上限 {STEP04_REASON_MAX_DEFAULT}（範囲 {STEP04_REASON_LIMIT_FLOOR}〜
                  {STEP04_REASON_LIMIT_CEIL}）。上限は下限以上になるよう自動で調整されます。
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  <label className="text-sm font-medium text-gray-800">
                    理由の下限
                    <div style={{ marginTop: '0.35rem' }}>
                      <select
                        value={draftReasonMin}
                        disabled={!startSettingsHydrated}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setDraftReasonMin(v);
                          if (draftReasonMax < v) setDraftReasonMax(v);
                        }}
                        style={SELECT_STYLE}
                      >
                        {REASON_LIMIT_OPTIONS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                            {n === STEP04_REASON_MIN_DEFAULT ? '（既定）' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                  <label className="text-sm font-medium text-gray-800">
                    理由の上限
                    <div style={{ marginTop: '0.35rem' }}>
                      <select
                        value={draftReasonMax}
                        disabled={!startSettingsHydrated}
                        onChange={(e) => setDraftReasonMax(Number(e.target.value))}
                        style={SELECT_STYLE}
                      >
                        {REASON_LIMIT_OPTIONS.filter((n) => n >= draftReasonMin).map((n) => (
                          <option key={n} value={n}>
                            {n}
                            {n === STEP04_REASON_MAX_DEFAULT ? '（既定）' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>
              </div>

              {showKizukiSettings ? (
                <>
                  <div className="action-sub-section" data-section="journal-settings">
                    <h3>気づきノート：入力表示のデフォルト</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      気づきノート画面上部のラジオボタンとも同期されます。
                    </p>
                    <div className="radio-group" role="radiogroup" aria-labelledby="app-settings-title">
                      {LEVELS.map((k) => (
                        <label key={k}>
                          <input
                            type="radio"
                            name="journal-default-level"
                            value={k}
                            checked={draft === k}
                            disabled={!journalHydrated}
                            onChange={() => setDraft(k)}
                          />{' '}
                          {JOURNAL_DETAIL_LEVEL_LABELS[k]}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="action-sub-section" data-section="journal-date-popup">
                    <h3>気づきノート：入力中の日付表示</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      朝・晩の画面で入力欄に入力している間、記入している日付を画面右上に小さく表示します（例:
                      2026/10/07(水)）。過去の日の記録を入力するときの確認用です。この端末のブラウザに保存されます。
                    </p>
                    <div className="radio-group" role="radiogroup" aria-label="入力中の日付表示">
                      <label>
                        <input
                          type="radio"
                          name="journal-date-popup"
                          value="on"
                          checked={draftJournalDatePopup}
                          disabled={!startSettingsHydrated}
                          onChange={() => setDraftJournalDatePopup(true)}
                        />{' '}
                        表示する
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="journal-date-popup"
                          value="off"
                          checked={!draftJournalDatePopup}
                          disabled={!startSettingsHydrated}
                          onChange={() => setDraftJournalDatePopup(false)}
                        />{' '}
                        表示しない（既定）
                      </label>
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

                  <div className="action-sub-section" data-section="coach-share-defaults">
                    <h3>「コーチと共有」の初期値</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      新しい日・週・月を開いたとき、またはアファメーションを新規発行したときのチェック初期値です。製品の既定は「なし」です。すでに保存済みのデータは変更されません。画面上でいつでも外せます。
                    </p>
                    <p className="text-sm font-medium text-gray-800 mb-1">日・週・月（気づきノート）</p>
                    <div
                      className="radio-group mb-3"
                      role="radiogroup"
                      aria-label="日・週・月のコーチと共有の初期値"
                    >
                      <label>
                        <input
                          type="radio"
                          name="journal-coach-share-default"
                          value="off"
                          checked={!journalShareDefaultOn}
                          onChange={() => setJournalShareDefaultOn(false)}
                        />{' '}
                        なし（既定）
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="journal-coach-share-default"
                          value="on"
                          checked={journalShareDefaultOn}
                          onChange={() => setJournalShareDefaultOn(true)}
                        />{' '}
                        あり
                      </label>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-1">アファメーション（発行時）</p>
                    <div
                      className="radio-group"
                      role="radiogroup"
                      aria-label="アファメーションのコーチと共有の初期値"
                    >
                      <label>
                        <input
                          type="radio"
                          name="affirmation-coach-share-default"
                          value="off"
                          checked={!affirmationShareDefaultOn}
                          onChange={() => setAffirmationShareDefaultOn(false)}
                        />{' '}
                        なし（既定）
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="affirmation-coach-share-default"
                          value="on"
                          checked={affirmationShareDefaultOn}
                          onChange={() => setAffirmationShareDefaultOn(true)}
                        />{' '}
                        あり
                      </label>
                    </div>
                  </div>

                  <div className="action-sub-section" data-section="journal-ai-report-write-mode">
                    <h3>気づきノート Aiレポート作成の既存入力反映方式（週・月共通）</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      週タブ・月タブの「Aiレポート作成を実行」で出力した下書きを、行動面・成果面・心理面・気づき・学び・成長の各欄にどう反映するかです。Firestore
                      のユーザープロファイルに保存されます。
                    </p>
                    <div
                      className="radio-group"
                      role="radiogroup"
                      aria-label="気づきノート Aiレポートの反映方式（週・月共通）"
                    >
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
                  </div>
                </>
              ) : (
                <div className="action-sub-section">
                  <h3>気づきノート関連</h3>
                  <p className="text-sm text-gray-600">
                    気づきノート利用中のみ、入力表示・アファメーション・コーチ共有・Aiレポートの設定が表示されます。
                  </p>
                </div>
              )}

              {actionsBar}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
