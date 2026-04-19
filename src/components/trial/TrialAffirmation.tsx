'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { AFFIRMATION_PROFILE_V1, type AffirmationProfile, type AffirmationBlock } from '@/lib/affirmationProfile';
import { decryptThemeData, encryptThemeData } from '@/utils/encryption';
import {
  deleteAffirmationDraft,
  deleteAffirmationFully,
  getAffirmationDraft,
  getAffirmationHistoryEntryDecrypted,
  getAffirmationPublishedMarkdown,
  getUserProfile,
  isAffirmationTitleTaken,
  listAffirmationHistory,
  listUserAffirmations,
  publishAffirmation,
  type AffirmationHistoryListItem,
  type AffirmationHistoryEntryDecrypted,
  AFFIRMATION_MARKDOWN_BODY_MAX_LENGTH,
  savePublishedAffirmationBody,
  saveAffirmationDraft,
  validateAffirmationMarkdownBody,
  updateAffirmationTitle,
  updateTrialAffirmationUiMetaFields,
} from '@/lib/firestore';
import type { TrialAffirmationSubmenu } from '@/types/auth';
import { AffirmationMarkdownView } from '@/components/common/AffirmationMarkdownView';
import { useViewMode } from '@/context/ViewModeContext';
import { getAffirmationCoachShareState, setAffirmationSharedWithCoach } from '@/lib/coachAffirmationShare';

type SlotValues = Record<string, string>;

/** 選択タブ一覧の 1 行（発行済み or 下書き） */
type AffirmationSelectRow = {
  rowKey: string;
  title: string;
  status: 'published' | 'draft';
  profileId: string;
  updatedAtMs: number;
  /** 発行済みの Firestore ドキュメント ID（下書き行は無し） */
  publishedId?: string;
};

const SUBMENU_ITEMS: { key: TrialAffirmationSubmenu; label: string }[] = [
  { key: 'select', label: '選択' },
  { key: 'create', label: '作成' },
  { key: 'edit', label: '編集' },
  { key: 'history', label: '履歴' },
];

function normalizeSubmenu(v: unknown): TrialAffirmationSubmenu | null {
  if (v === 'select' || v === 'create' || v === 'edit' || v === 'history') return v;
  return null;
}

function getDefaultAffirmationTitle(): string {
  const d = new Date();
  return `新規アファメーション（${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}）`;
}

function formatAffirmationListDate(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function affirmationStatusLabelJa(status: string): string {
  if (status === 'published') return '発行済';
  if (status === 'draft') return '作成中';
  return status || '—';
}

/**
 * ReactMarkdown（CommonMark）は単独の `\n` を改行にしないため、
 * 行末2スペース＋改行（ハード改行）に変換する。
 */
function markdownHardLineBreaks(s: string): string {
  return s.replace(/\n/g, '  \n');
}

function buildPreview(profile: AffirmationProfile, slots: SlotValues): string {
  const lines: string[] = [];
  for (const section of profile.sections) {
    const parts: string[] = [];
    for (const block of section.blocks) {
      if (block.type === 'text') parts.push(block.text);
      else parts.push(slots[block.slotId] ?? '');
    }
    const text = markdownHardLineBreaks(parts.join(''));
    lines.push(`【${section.heading}】\n${text}`);
  }
  return lines.join('\n\n');
}

export type TrialAffirmationProps = {
  /** コーチ閲覧時: URL `coachClient` で渡すクライアント UID */
  coachClientUid?: string | null;
};

export default function TrialAffirmation({ coachClientUid = null }: TrialAffirmationProps) {
  const { user, loading, userProfile } = useAuth();
  const { mode } = useViewMode();
  const loggedIn = !loading && !!user;
  const profile = AFFIRMATION_PROFILE_V1;
  const [slots, setSlots] = useState<SlotValues>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savedAtLabel, setSavedAtLabel] = useState<string | null>(null);
  /** 作成モーダルを開いた直前のスロット（[閉じる]・×・Esc・オーバーレイで復元） */
  const baselineSlotsRef = useRef<SlotValues>({});

  /** null = プレビューのみ（設計 3.6） */
  const [activeSubmenu, setActiveSubmenu] = useState<TrialAffirmationSubmenu | null>(null);
  const [metaReady, setMetaReady] = useState(false);
  const [selectTableRows, setSelectTableRows] = useState<AffirmationSelectRow[]>([]);
  const [affirmationsListLoading, setAffirmationsListLoading] = useState(false);
  /** 一覧上でハイライトしている行（表示・名称変更・削除の対象） */
  const [tableSelectedRowKey, setTableSelectedRowKey] = useState<string | null>(null);
  /** フッターから名称変更中のときの発行済みドキュメント ID */
  const [renamingTargetId, setRenamingTargetId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  /** 最後に「表示」した発行済み本文（プレビュー用） */
  const [selectedPublishedMarkdown, setSelectedPublishedMarkdown] = useState<string | null>(null);
  const [selectedPublishedLoading, setSelectedPublishedLoading] = useState(false);
  /** 編集モーダルを開いた直前の本文（閉じる・Esc で復元） */
  const baselineEditBodyRef = useRef('');
  const [editBodyMarkdown, setEditBodyMarkdown] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  /** A-9 履歴一覧（選択中の発行済みのみ） */
  const [historyItems, setHistoryItems] = useState<AffirmationHistoryListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyModalLoading, setHistoryModalLoading] = useState(false);
  const [historyModalEntry, setHistoryModalEntry] = useState<AffirmationHistoryEntryDecrypted | null>(
    null
  );

  const [lastSelectedAffirmationId, setLastSelectedAffirmationId] = useState<string | null>(null);
  /** クライアントのみ: 発行済みテーマのコーチ共有スイッチ（Firestore `sharedWithCoach` と同期） */
  const [clientShareWithCoach, setClientShareWithCoach] = useState(false);
  const [clientShareLoading, setClientShareLoading] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [mounted, setMounted] = useState(false);
  /**
   * 下書きが存在する、またはモーダルで [保存] に一度でも成功したら true。
   * サブメニュー表示を「作成」→「作成中」に切り替える。発行成功後は下書き削除とともに false。
   */
  const [hasDraftInProgress, setHasDraftInProgress] = useState(false);
  const [affirmationHelpOpen, setAffirmationHelpOpen] = useState(false);
  const affirmationHelpWrapRef = useRef<HTMLDivElement>(null);
  const selectSubmenuButtonRef = useRef<HTMLButtonElement>(null);
  const [selectLeadHelpOpen, setSelectLeadHelpOpen] = useState(false);
  const selectLeadHelpWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!affirmationHelpOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = affirmationHelpWrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setAffirmationHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [affirmationHelpOpen]);

  useEffect(() => {
    if (!selectLeadHelpOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (selectLeadHelpWrapRef.current && !selectLeadHelpWrapRef.current.contains(target)) {
        setSelectLeadHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [selectLeadHelpOpen]);

  useEffect(() => {
    if (!affirmationHelpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAffirmationHelpOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [affirmationHelpOpen]);

  // A-11（コーチ閲覧）UI骨格
  const isCoachView =
    loggedIn &&
    mode === 'coach' &&
    !!userProfile &&
    (userProfile.role === 'coach' || userProfile.role === 'senior_coach');

  /** 本文・一覧の対象 UID（クライアント本人 or 共有モード中のクライアント） */
  const contentUid = isCoachView && coachClientUid ? coachClientUid : user?.uid ?? null;

  const effectiveSubmenu: TrialAffirmationSubmenu | null = isCoachView
    ? !coachClientUid
      ? null
      : activeSubmenu === 'select'
        ? activeSubmenu
        : null
    : activeSubmenu;

  useEffect(() => {
    if (isCoachView && !coachClientUid && activeSubmenu === 'select') {
      setActiveSubmenu(null);
    }
  }, [isCoachView, coachClientUid, activeSubmenu]);

  const previewText = useMemo(() => buildPreview(profile, slots), [profile, slots]);

  const profileNameForList = (profileId: string) =>
    profileId === profile.id ? profile.name : profileId;

  /** 最終選択 ID があるときは発行済み本文、下書きキーなら穴埋めプレビュー、なければ穴埋め */
  const mainPreviewMarkdown = useMemo(() => {
    if (!lastSelectedAffirmationId) return previewText;
    if (lastSelectedAffirmationId.startsWith('draft:')) return previewText;
    if (selectedPublishedLoading || selectedPublishedMarkdown === null) {
      return '*読み込み中…*';
    }
    if (selectedPublishedMarkdown === '') {
      return '_（本文を読み込めませんでした）_';
    }
    return selectedPublishedMarkdown;
  }, [
    lastSelectedAffirmationId,
    previewText,
    selectedPublishedLoading,
    selectedPublishedMarkdown,
  ]);

  const persistSubmenu = useCallback(
    async (next: TrialAffirmationSubmenu | null) => {
      if (!user) return;
      if (isCoachView) return;
      try {
        await updateTrialAffirmationUiMetaFields(user.uid, { lastSubmenu: next });
      } catch (e) {
        console.error('affirmation submenu persist error:', e);
      }
    },
    [user, isCoachView]
  );

  const refreshAffirmationsList = useCallback(async () => {
    if (!user) return;
    if (isCoachView) {
      if (!coachClientUid) {
        setSelectTableRows([]);
        return;
      }
      setAffirmationsListLoading(true);
      try {
        const items = await listUserAffirmations(coachClientUid, { coachScoped: true });
        const published = items.filter((i) => i.status === 'published');
        const rows: AffirmationSelectRow[] = published.map((i) => ({
          rowKey: i.id,
          title: i.title || '（無題）',
          status: 'published' as const,
          profileId: i.profileId,
          updatedAtMs: i.updatedAtMs,
          publishedId: i.id,
        }));
        rows.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
        setSelectTableRows(rows);
      } catch (e) {
        console.error('affirmation list load error:', e);
        setError('アファメーション一覧の読み込みに失敗しました。');
      } finally {
        setAffirmationsListLoading(false);
      }
      return;
    }

    setAffirmationsListLoading(true);
    try {
      const [draftDoc, items] = await Promise.all([
        getAffirmationDraft(user.uid, profile.id),
        listUserAffirmations(user.uid),
      ]);
      const rows: AffirmationSelectRow[] = items.map((i) => ({
        rowKey: i.id,
        title: i.title || '（無題）',
        status: 'published',
        profileId: i.profileId,
        updatedAtMs: i.updatedAtMs,
        publishedId: i.id,
      }));
      if (draftDoc) {
        rows.push({
          rowKey: `draft:${profile.id}`,
          title: '（下書き・未発行）',
          status: 'draft',
          profileId: profile.id,
          updatedAtMs: draftDoc.updatedAtMs,
        });
      }
      rows.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      setSelectTableRows(rows);
    } catch (e) {
      console.error('affirmation list load error:', e);
      setError('アファメーション一覧の読み込みに失敗しました。');
    } finally {
      setAffirmationsListLoading(false);
    }
  }, [user, profile.id, isCoachView, coachClientUid]);

  const loadHistoryList = useCallback(async () => {
    if (!user || !lastSelectedAffirmationId || lastSelectedAffirmationId.startsWith('draft:')) {
      setHistoryItems([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const items = await listAffirmationHistory(user.uid, lastSelectedAffirmationId);
      setHistoryItems(items);
    } catch (e) {
      console.error('affirmation history list error:', e);
      setError('履歴の読み込みに失敗しました。');
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [user, lastSelectedAffirmationId]);

  const closeHistoryModal = useCallback(() => {
    setHistoryModalOpen(false);
    setHistoryModalLoading(false);
    setHistoryModalEntry(null);
  }, []);

  const openHistoryDetail = useCallback(
    async (historyDocId: string) => {
      if (!user || !lastSelectedAffirmationId || lastSelectedAffirmationId.startsWith('draft:')) return;
      setHistoryModalOpen(true);
      setHistoryModalLoading(true);
      setHistoryModalEntry(null);
      try {
        const entry = await getAffirmationHistoryEntryDecrypted(
          user.uid,
          lastSelectedAffirmationId,
          historyDocId
        );
        setHistoryModalEntry(entry);
      } catch (e) {
        console.error('affirmation history detail error:', e);
        setHistoryModalEntry(null);
      } finally {
        setHistoryModalLoading(false);
      }
    },
    [user, lastSelectedAffirmationId]
  );

  const handleSubmenuClick = (key: TrialAffirmationSubmenu, disabled?: boolean) => {
    if (disabled) return;
    if (effectiveSubmenu === 'edit' && key !== 'edit') {
      if (editBodyMarkdown.trim() !== baselineEditBodyRef.current.trim()) {
        if (!window.confirm('未保存の変更は破棄されます。よろしいですか？')) return;
      }
      setEditBodyMarkdown(baselineEditBodyRef.current);
    }
    if (key === 'create') {
      baselineSlotsRef.current = { ...slots };
      setPublishTitle(getDefaultAffirmationTitle());
    }
    setActiveSubmenu(key);
    void persistSubmenu(key);
  };

  const handleBackToPreviewOnly = useCallback(() => {
    const wasSelect = effectiveSubmenu === 'select';
    if (effectiveSubmenu === 'edit') {
      if (editBodyMarkdown.trim() !== baselineEditBodyRef.current.trim()) {
        if (!window.confirm('未保存の変更は破棄されます。閉じてもよろしいですか？')) return;
      }
      setEditBodyMarkdown(baselineEditBodyRef.current);
    }
    if (effectiveSubmenu === 'create') {
      setSlots({ ...baselineSlotsRef.current });
    }
    setRenamingTargetId(null);
    setRenameDraft('');
    setTableSelectedRowKey(null);
    setHistoryModalOpen(false);
    setHistoryModalLoading(false);
    setHistoryModalEntry(null);
    setActiveSubmenu(null);
    void persistSubmenu(null);
    setError(null);
    if (wasSelect) {
      window.setTimeout(() => selectSubmenuButtonRef.current?.focus(), 0);
    }
  }, [effectiveSubmenu, editBodyMarkdown, persistSubmenu]);

  const handleSelectModalDismiss = useCallback(() => {
    if (renamingTargetId !== null) {
      window.alert(
        'リネーム中のため閉じられません。名前の変更を「確定」するか「キャンセル」してから、もう一度お試しください。'
      );
      return;
    }
    handleBackToPreviewOnly();
  }, [renamingTargetId, handleBackToPreviewOnly]);

  const handleCloseEditModal = useCallback(() => {
    if (editBodyMarkdown.trim() !== baselineEditBodyRef.current.trim()) {
      if (!window.confirm('未保存の変更は破棄されます。閉じてもよろしいですか？')) return;
    }
    setEditBodyMarkdown(baselineEditBodyRef.current);
    setActiveSubmenu(null);
    void persistSubmenu(null);
    setError(null);
  }, [editBodyMarkdown, persistSubmenu]);

  const handleDisplayPublishedRow = useCallback(
    async (publishedId: string) => {
      if (!user) return;
      setError(null);
      setSuccessMessage(null);
      setRenamingTargetId(null);
      setRenameDraft('');
      setLastSelectedAffirmationId(publishedId);
      if (isCoachView && coachClientUid) {
        setTableSelectedRowKey(publishedId);
        handleBackToPreviewOnly();
        return;
      }
      try {
        await updateTrialAffirmationUiMetaFields(user.uid, {
          lastSelectedAffirmationId: publishedId,
          lastSubmenu: null,
        });
      } catch (e) {
        console.error('affirmation display persist error:', e);
      }
      handleBackToPreviewOnly();
    },
    [user, handleBackToPreviewOnly, isCoachView, coachClientUid]
  );

  const handleClientCoachShareToggle = useCallback(
    async (next: boolean) => {
      if (!user || isCoachView) return;
      if (!lastSelectedAffirmationId || lastSelectedAffirmationId.startsWith('draft:')) return;
      setClientShareLoading(true);
      setError(null);
      try {
        await setAffirmationSharedWithCoach(user.uid, lastSelectedAffirmationId, next);
        setClientShareWithCoach(next);
      } catch (e) {
        console.error(e);
        setError('コーチ共有の更新に失敗しました。');
      } finally {
        setClientShareLoading(false);
      }
    },
    [user, isCoachView, lastSelectedAffirmationId]
  );

  const handleDisplayDraftRow = useCallback(async () => {
    if (!user) return;
    setError(null);
    setSuccessMessage(null);
    setRenamingTargetId(null);
    setRenameDraft('');
    const draftKey = `draft:${profile.id}`;
    try {
      const d = await getAffirmationDraft(user.uid, profile.id);
      if (!d) {
        setError('下書きが見つかりません。一覧を更新します。');
        await refreshAffirmationsList();
        return;
      }
      const decoded = (await decryptThemeData(d.encryptedSlots, user.uid)) as SlotValues;
      const next = decoded || {};
      setSlots(next);
      baselineSlotsRef.current = { ...next };
      setHasDraftInProgress(true);
      setLastSelectedAffirmationId(draftKey);
      await updateTrialAffirmationUiMetaFields(user.uid, {
        lastSelectedAffirmationId: draftKey,
        lastSubmenu: null,
      });
      handleBackToPreviewOnly();
    } catch (e) {
      console.error('affirmation draft display error:', e);
      setError('下書きの読み込みに失敗しました。');
    }
  }, [user, profile.id, refreshAffirmationsList, handleBackToPreviewOnly]);

  const handleDisplaySelectedTableRow = useCallback(async () => {
    if (!user || !tableSelectedRowKey) return;
    if (tableSelectedRowKey.startsWith('draft:')) {
      await handleDisplayDraftRow();
      return;
    }
    await handleDisplayPublishedRow(tableSelectedRowKey);
  }, [user, tableSelectedRowKey, handleDisplayDraftRow, handleDisplayPublishedRow]);

  useEffect(() => {
    if (!loggedIn || !user) {
      setInitialLoading(false);
      setMetaReady(true);
      return;
    }
    if (isCoachView) {
      return;
    }
    let cancelled = false;
    (async () => {
      setInitialLoading(true);
      setError(null);
      setMetaReady(false);
      try {
        const [draft, prof] = await Promise.all([
          getAffirmationDraft(user.uid, profile.id),
          getUserProfile(user.uid),
        ]);
        if (cancelled) return;

        const meta = prof?.trialAffirmationMeta;
        const savedSub = normalizeSubmenu(meta?.lastSubmenu);
        const savedId =
          typeof meta?.lastSelectedAffirmationId === 'string' ? meta.lastSelectedAffirmationId : null;
        setLastSelectedAffirmationId(savedId);

        let loadedSlots: SlotValues = {};
        if (draft) {
          const decoded = (await decryptThemeData(draft.encryptedSlots, user.uid)) as SlotValues;
          loadedSlots = decoded || {};
          if (!cancelled) setSlots(loadedSlots);
          if (!cancelled) setHasDraftInProgress(true);
        } else if (!cancelled) {
          setHasDraftInProgress(false);
        }

        if (savedSub === 'create') {
          baselineSlotsRef.current = { ...loadedSlots };
          setPublishTitle(getDefaultAffirmationTitle());
        }

        if (!cancelled) {
          setActiveSubmenu(savedSub);
          setMetaReady(true);
        }
      } catch (e) {
        console.error('affirmation load error:', e);
        if (!cancelled) setError('保存済みデータの読み込みに失敗しました。');
        if (!cancelled) setMetaReady(true);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, user, profile.id, isCoachView]);

  /** コーチモードでクライアント未選択のとき */
  useEffect(() => {
    if (!loggedIn || !user) return;
    if (!isCoachView) return;
    if (coachClientUid) return;
    setInitialLoading(false);
    setMetaReady(true);
    setLastSelectedAffirmationId(null);
    setSelectTableRows([]);
    setTableSelectedRowKey(null);
    setActiveSubmenu(null);
  }, [loggedIn, user, isCoachView, coachClientUid]);

  /** コーチ: 共有クライアントが決まったらクライアントの一覧・最終選択を読み込む */
  useEffect(() => {
    if (!loggedIn || !user) return;
    if (!isCoachView || !coachClientUid) return;
    let cancelled = false;
    (async () => {
      setInitialLoading(true);
      setMetaReady(false);
      setError(null);
      try {
        const [clientProf, items] = await Promise.all([
          getUserProfile(coachClientUid),
          listUserAffirmations(coachClientUid, { coachScoped: true }),
        ]);
        if (cancelled) return;
        const published = items.filter((i) => i.status === 'published');
        const rows: AffirmationSelectRow[] = published.map((i) => ({
          rowKey: i.id,
          title: i.title || '（無題）',
          status: 'published',
          profileId: i.profileId,
          updatedAtMs: i.updatedAtMs,
          publishedId: i.id,
        }));
        rows.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
        setSelectTableRows(rows);

        const savedId =
          typeof clientProf?.trialAffirmationMeta?.lastSelectedAffirmationId === 'string'
            ? clientProf.trialAffirmationMeta.lastSelectedAffirmationId
            : null;
        let pick: string | null = null;
        if (savedId && !savedId.startsWith('draft:') && published.some((p) => p.id === savedId)) {
          pick = savedId;
        } else if (published[0]) {
          pick = published[0].id;
        }
        setLastSelectedAffirmationId(pick);
        setTableSelectedRowKey(pick);
        setMetaReady(true);
      } catch (e) {
        console.error('coach client affirmation load error:', e);
        if (!cancelled) setError('クライアントの行動宣言を読み込めませんでした。');
        if (!cancelled) setMetaReady(true);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, user, isCoachView, coachClientUid, profile.id]);

  useEffect(() => {
    if (!loggedIn || !user) {
      setSelectTableRows([]);
      return;
    }
    if (isCoachView) return;
    void refreshAffirmationsList();
  }, [loggedIn, user, refreshAffirmationsList, isCoachView]);

  useEffect(() => {
    if (!contentUid || !lastSelectedAffirmationId || lastSelectedAffirmationId.startsWith('draft:')) {
      setSelectedPublishedMarkdown(null);
      setSelectedPublishedLoading(false);
      return;
    }
    let cancelled = false;
    setSelectedPublishedLoading(true);
    setSelectedPublishedMarkdown(null);
    void (async () => {
      const md = await getAffirmationPublishedMarkdown(contentUid, lastSelectedAffirmationId);
      if (cancelled) return;
      setSelectedPublishedMarkdown(md ?? '');
      setSelectedPublishedLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [contentUid, lastSelectedAffirmationId]);

  useEffect(() => {
    if (!user || isCoachView) return;
    if (!lastSelectedAffirmationId || lastSelectedAffirmationId.startsWith('draft:')) {
      setClientShareWithCoach(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const s = await getAffirmationCoachShareState(user.uid, lastSelectedAffirmationId);
      if (!cancelled) setClientShareWithCoach(s?.sharedWithCoach ?? false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isCoachView, lastSelectedAffirmationId]);

  const handleChange = (slotId: string, value: string, maxLength: number) => {
    setError(null);
    setSuccessMessage(null);
    setSlots((prev) => ({ ...prev, [slotId]: value.slice(0, maxLength) }));
  };

  const handleSaveInModal = async () => {
    if (!user) return;
    setError(null);
    setSuccessMessage(null);
    setSaving(true);
    try {
      const encrypted = await encryptThemeData(slots, user.uid);
      await saveAffirmationDraft(user.uid, profile.id, encrypted);
      setHasDraftInProgress(true);
      baselineSlotsRef.current = { ...slots };
      const now = new Date();
      setSavedAtLabel(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
      try {
        await refreshAffirmationsList();
      } catch (re) {
        console.error('affirmation list refresh after save:', re);
      }
    } catch (e) {
      console.error('affirmation save error:', e);
      setError('保存に失敗しました。しばらくしてから再試行してください。');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishInModal = async () => {
    if (!user) return;
    setError(null);
    setSuccessMessage(null);
    const title = publishTitle.trim() || getDefaultAffirmationTitle();
    const body = buildPreview(profile, slots);
    const v = validateAffirmationMarkdownBody(body);
    if (!v.ok) {
      setError(v.message);
      return;
    }
    setPublishing(true);
    try {
      const { affirmationId } = await publishAffirmation(user.uid, {
        title,
        profileId: profile.id,
        markdownBody: body,
      });
      await deleteAffirmationDraft(user.uid, profile.id);
      setHasDraftInProgress(false);
      setSlots({});
      baselineSlotsRef.current = {};
      setSavedAtLabel(null);

      setLastSelectedAffirmationId(affirmationId);
      await updateTrialAffirmationUiMetaFields(user.uid, {
        lastSelectedAffirmationId: affirmationId,
        lastSubmenu: null,
      });
      setActiveSubmenu(null);
      await refreshAffirmationsList();
      setSuccessMessage('発行しました。下書きはクリアされ、再度「作成」から始められます。「選択」タブで一覧に表示されます。');
    } catch (e) {
      console.error('affirmation publish error:', e);
      setError(e instanceof Error ? e.message : '発行に失敗しました。しばらくしてから再試行してください。');
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveEditModal = async () => {
    if (!user || !lastSelectedAffirmationId || lastSelectedAffirmationId.startsWith('draft:')) return;
    setError(null);
    setSuccessMessage(null);
    const v = validateAffirmationMarkdownBody(editBodyMarkdown);
    if (!v.ok) {
      setError(v.message);
      return;
    }
    const keepHistory = window.confirm(
      '保存する前の本文（いま表示されている版）を履歴に残しますか？\n\n' +
        '「OK」: 履歴に残してから保存\n' +
        '「キャンセル」: 履歴に残さず、上書きのみ'
    );
    setEditSaving(true);
    try {
      await savePublishedAffirmationBody(user.uid, lastSelectedAffirmationId, {
        newMarkdownBody: editBodyMarkdown.trim(),
        keepHistory,
      });
      const saved = editBodyMarkdown.trim();
      baselineEditBodyRef.current = saved;
      setEditBodyMarkdown(saved);
      setSelectedPublishedMarkdown(saved);
      setSelectedPublishedLoading(false);
      await refreshAffirmationsList();
      void loadHistoryList();
      setSuccessMessage(
        keepHistory ? '保存しました（履歴に前版を残しました）。' : '保存しました。'
      );
    } catch (e) {
      console.error('affirmation edit save error:', e);
      setError(e instanceof Error ? e.message : '保存に失敗しました。');
    } finally {
      setEditSaving(false);
    }
  };

  const beginFooterRename = () => {
    if (isCoachView) return;
    if (!tableSelectedRowKey) return;
    const row = selectTableRows.find((r) => r.rowKey === tableSelectedRowKey);
    if (!row || row.status === 'draft' || !row.publishedId) return;
    setError(null);
    setSuccessMessage(null);
    setRenamingTargetId(row.publishedId);
    setRenameDraft(row.title);
  };

  const cancelRename = () => {
    setRenamingTargetId(null);
    setRenameDraft('');
  };

  const commitRename = async () => {
    if (isCoachView) return;
    if (!user || !renamingTargetId) return;
    const t = renameDraft.trim();
    if (!t) {
      setError('名称を入力してください。');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    try {
      const taken = await isAffirmationTitleTaken(user.uid, t, renamingTargetId);
      if (taken) {
        setError('同じ名前のアファメーションが既にあります。別の名前にしてください。');
        return;
      }
      await updateAffirmationTitle(user.uid, renamingTargetId, t);
      cancelRename();
      await refreshAffirmationsList();
      setSuccessMessage('名称を変更しました。');
    } catch (e) {
      console.error('affirmation rename error:', e);
      setError('名称の更新に失敗しました。');
    }
  };

  const handleDeleteSelectedTableRow = async () => {
    if (isCoachView) return;
    if (!user || !tableSelectedRowKey) return;
    const row = selectTableRows.find((r) => r.rowKey === tableSelectedRowKey);
    if (!row) return;

    if (row.status === 'draft') {
      const ok = window.confirm(
        '下書きを削除しますか？\n\n入力内容は失われ、元に戻せません。\n（Firestore の affirmation_drafts を削除します）'
      );
      if (!ok) return;
      setError(null);
      setSuccessMessage(null);
      try {
        await deleteAffirmationDraft(user.uid, profile.id);
        setSlots({});
        baselineSlotsRef.current = {};
        setSavedAtLabel(null);
        setHasDraftInProgress(false);
        const draftKey = `draft:${profile.id}`;
        if (lastSelectedAffirmationId === draftKey) {
          setLastSelectedAffirmationId(null);
          await updateTrialAffirmationUiMetaFields(user.uid, { lastSelectedAffirmationId: null });
        }
        cancelRename();
        setTableSelectedRowKey(null);
        await refreshAffirmationsList();
        setSuccessMessage('下書きを削除しました。');
      } catch (e) {
        console.error('affirmation draft delete error:', e);
        setError('下書きの削除に失敗しました。');
      }
      return;
    }

    const pubId = row.publishedId!;
    const ok = window.confirm(
      `以下のアファメーションを削除しますか？\n\n「${row.title}」\n\n本文・履歴はすべて失われ、元に戻せません。`
    );
    if (!ok) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await deleteAffirmationFully(user.uid, pubId);
      if (lastSelectedAffirmationId === pubId) {
        setLastSelectedAffirmationId(null);
        await updateTrialAffirmationUiMetaFields(user.uid, { lastSelectedAffirmationId: null });
      }
      cancelRename();
      setTableSelectedRowKey(null);
      await refreshAffirmationsList();
      setSuccessMessage('削除しました。');
    } catch (e) {
      console.error('affirmation delete error:', e);
      setError('削除に失敗しました。');
    }
  };

  const showCreateModal = effectiveSubmenu === 'create' && !isCoachView;
  const showEditModal =
    effectiveSubmenu === 'edit' &&
    !isCoachView &&
    !!lastSelectedAffirmationId &&
    !lastSelectedAffirmationId.startsWith('draft:');

  useEffect(() => {
    if (!user || !showEditModal || !lastSelectedAffirmationId) return;
    let cancelled = false;
    setEditLoading(true);
    setEditBodyMarkdown('');
    baselineEditBodyRef.current = '';
    void (async () => {
      const md = await getAffirmationPublishedMarkdown(user.uid, lastSelectedAffirmationId);
      if (cancelled) return;
      const text = md ?? '';
      setEditBodyMarkdown(text);
      baselineEditBodyRef.current = text;
      setEditLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, showEditModal, lastSelectedAffirmationId]);

  const showHistoryModal = historyModalOpen && !isCoachView;

  const showSelectModal = effectiveSubmenu === 'select' && (!isCoachView || !!coachClientUid);

  useEffect(() => {
    if (!showCreateModal && !showEditModal && !showHistoryModal && !showSelectModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showHistoryModal) closeHistoryModal();
        else if (showEditModal) handleCloseEditModal();
        else if (showSelectModal) {
          if (renamingTargetId !== null) {
            cancelRename();
            return;
          }
          handleSelectModalDismiss();
        } else handleBackToPreviewOnly();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    showCreateModal,
    showEditModal,
    showHistoryModal,
    showSelectModal,
    closeHistoryModal,
    handleBackToPreviewOnly,
    handleCloseEditModal,
    handleSelectModalDismiss,
    renamingTargetId,
    cancelRename,
  ]);

  useEffect(() => {
    if (!mounted) return;
    if (showCreateModal || showEditModal || showHistoryModal || showSelectModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showCreateModal, showEditModal, showHistoryModal, showSelectModal, mounted]);

  useEffect(() => {
    if (!mounted || !showSelectModal || !loggedIn || initialLoading || !metaReady) return;
    const t = window.setTimeout(() => {
      document.getElementById('affirmation-select-modal-title')?.focus();
    }, 10);
    return () => window.clearTimeout(t);
  }, [mounted, showSelectModal, loggedIn, initialLoading, metaReady]);

  useEffect(() => {
    if (showSelectModal) return;
    setSelectLeadHelpOpen(false);
  }, [showSelectModal]);

  useEffect(() => {
    if (effectiveSubmenu !== 'select') {
      setRenamingTargetId(null);
      setRenameDraft('');
    }
  }, [effectiveSubmenu]);
  const showEditPanel = effectiveSubmenu === 'edit';
  const showHistoryPanel = effectiveSubmenu === 'history';
  /** メインの宣言プレビュー枠を出す（選択モーダル時は背面に残す） */
  const previewMainVisible = effectiveSubmenu === null || effectiveSubmenu === 'select';

  useEffect(() => {
    if (effectiveSubmenu !== 'history' || isCoachView || !user) return;
    void loadHistoryList();
  }, [effectiveSubmenu, isCoachView, user, loadHistoryList]);

  useEffect(() => {
    if (effectiveSubmenu !== 'history') {
      closeHistoryModal();
    }
  }, [effectiveSubmenu, closeHistoryModal]);

  const selectedAffirmationTitleForHistory = useMemo(() => {
    if (!lastSelectedAffirmationId || lastSelectedAffirmationId.startsWith('draft:')) {
      return '（未選択）';
    }
    const row = selectTableRows.find(
      (r) => r.publishedId === lastSelectedAffirmationId || r.rowKey === lastSelectedAffirmationId
    );
    return row?.title ?? '（一覧にありません）';
  }, [lastSelectedAffirmationId, selectTableRows]);

  const selectedThemeTitleBar = useMemo(() => {
    if (isCoachView && !coachClientUid) {
      return '選択されていません';
    }
    if (!lastSelectedAffirmationId || lastSelectedAffirmationId.startsWith('draft:')) {
      return '（未選択）';
    }
    const row = selectTableRows.find(
      (r) => r.publishedId === lastSelectedAffirmationId || r.rowKey === lastSelectedAffirmationId
    );
    return row?.title ?? '（無題）';
  }, [lastSelectedAffirmationId, selectTableRows, isCoachView, coachClientUid]);

  const isKeyDisabled = (key: TrialAffirmationSubmenu): boolean => {
    if (isCoachView) {
      if (key === 'select') return !coachClientUid;
      return true;
    }
    if (key === 'select') return false;
    if (key === 'edit' || key === 'history') {
      return (
        !lastSelectedAffirmationId ||
        (typeof lastSelectedAffirmationId === 'string' && lastSelectedAffirmationId.startsWith('draft:'))
      );
    }
    return false;
  };

  const isKeyActive = (key: TrialAffirmationSubmenu) => effectiveSubmenu === key;

  const createModalJsx = showCreateModal ? (
      <div
        className="affirmation-create-modal-overlay"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) handleBackToPreviewOnly();
        }}
      >
        <div
          className="affirmation-create-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="affirmation-create-modal-title"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="affirmation-create-modal-header">
            <div className="affirmation-create-modal-header-text">
              <h3 id="affirmation-create-modal-title" className="affirmation-create-modal-title">
                アファメーションを作成
              </h3>
              <p className="affirmation-create-modal-lead">
                穴埋めテンプレートに入力します。下書きは [保存]、完成文の登録は [発行] です。
              </p>
            </div>
            <button
              type="button"
              className="affirmation-create-modal-close"
              onClick={handleBackToPreviewOnly}
              disabled={saving || publishing}
              aria-label="閉じる"
            >
              <span className="material-symbols-outlined" aria-hidden>
                close
              </span>
            </button>
          </div>

          <div className="affirmation-create-modal-body">
            {profile.sections.map((section) => (
              <div key={section.heading} className="affirmation-section">
                <h4 className="affirmation-section-heading">{section.heading}</h4>
                <div className="affirmation-section-body">
                  {section.blocks.map((block: AffirmationBlock, idx: number) =>
                    block.type === 'text' ? (
                      <span
                        key={`${section.heading}-t-${idx}`}
                        className={
                          'affirmation-text' +
                          (block.text.startsWith('\n') ? ' affirmation-text--row-break' : '')
                        }
                      >
                        {block.text.split('\n').map((line, li) => (
                          <Fragment key={li}>
                            {li > 0 ? <br /> : null}
                            {line}
                          </Fragment>
                        ))}
                      </span>
                    ) : block.multiline ? (
                      <textarea
                        key={`${section.heading}-s-${block.slotId}`}
                        className="affirmation-slot textarea"
                        value={slots[block.slotId] ?? ''}
                        onChange={(e) => handleChange(block.slotId, e.target.value, block.maxLength)}
                        maxLength={block.maxLength}
                        rows={block.rows ?? 3}
                        placeholder={`（最大 ${block.maxLength} 文字）`}
                      />
                    ) : (
                      <input
                        key={`${section.heading}-s-${block.slotId}`}
                        className="affirmation-slot"
                        value={slots[block.slotId] ?? ''}
                        onChange={(e) => handleChange(block.slotId, e.target.value, block.maxLength)}
                        maxLength={block.maxLength}
                        placeholder={`（最大 ${block.maxLength} 文字）`}
                      />
                    )
                  )}
                </div>
              </div>
            ))}

            <div className="affirmation-preview affirmation-create-modal-preview">
              <div className="affirmation-preview-title">プレビュー</div>
              <AffirmationMarkdownView markdown={previewText} className="affirmation-preview-body" />
            </div>
          </div>

          <div className="affirmation-create-modal-footer">
            <div className="affirmation-create-modal-name-row">
              <label htmlFor="affirmation-publish-title" className="affirmation-create-modal-label">
                アファメーション名（発行時）
              </label>
              <input
                id="affirmation-publish-title"
                type="text"
                className="affirmation-create-modal-title-input"
                value={publishTitle}
                onChange={(e) => setPublishTitle(e.target.value)}
                placeholder={getDefaultAffirmationTitle()}
                autoComplete="off"
              />
              <p className="affirmation-create-modal-hint">空欄のときは日付入りのデフォルト名で発行します。</p>
            </div>
            {savedAtLabel && <p className="affirmation-saved-at mb-2">最終保存: {savedAtLabel}</p>}
            <div className="affirmation-create-modal-actions">
              <button
                type="button"
                className="affirmation-save-btn"
                onClick={() => void handleSaveInModal()}
                disabled={saving || publishing}
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                type="button"
                className="affirmation-publish-btn"
                onClick={() => void handlePublishInModal()}
                disabled={saving || publishing}
              >
                {publishing ? '発行中...' : '発行'}
              </button>
              <button
                type="button"
                className="affirmation-cancel-btn"
                onClick={handleBackToPreviewOnly}
                disabled={saving || publishing}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
  ) : null;

  const editModalJsx = showEditModal ? (
    <div
      className="affirmation-create-modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleCloseEditModal();
      }}
    >
      <div
        className="affirmation-create-modal affirmation-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="affirmation-edit-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="affirmation-create-modal-header">
          <div className="affirmation-create-modal-header-text">
            <h3 id="affirmation-edit-modal-title" className="affirmation-create-modal-title">
              発行済み本文を編集
            </h3>
            <p className="affirmation-create-modal-lead">
              Markdown を直接編集します（最大 {AFFIRMATION_MARKDOWN_BODY_MAX_LENGTH} 文字・前後の空白は保存時にトリム）。保存時に履歴へ前版を残すか確認します。
            </p>
          </div>
          <button
            type="button"
            className="affirmation-create-modal-close"
            onClick={handleCloseEditModal}
            disabled={editLoading || editSaving}
            aria-label="閉じる"
          >
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </div>

        <div className="affirmation-create-modal-body">
          {editLoading ? (
            <p className="text-sm text-gray-500">本文を読み込み中…</p>
          ) : (
            <div className="affirmation-edit-modal-body-row">
              <div className="affirmation-edit-modal-editor-col">
                <label htmlFor="affirmation-edit-body" className="affirmation-create-modal-label">
                  本文
                </label>
                <textarea
                  id="affirmation-edit-body"
                  className="affirmation-edit-body-textarea"
                  value={editBodyMarkdown}
                  onChange={(e) => {
                    setError(null);
                    setSuccessMessage(null);
                    setEditBodyMarkdown(e.target.value.slice(0, AFFIRMATION_MARKDOWN_BODY_MAX_LENGTH));
                  }}
                  maxLength={AFFIRMATION_MARKDOWN_BODY_MAX_LENGTH}
                  rows={14}
                  spellCheck={false}
                />
                <p className="affirmation-edit-char-hint text-xs text-gray-500 mt-1">
                  {editBodyMarkdown.length} / {AFFIRMATION_MARKDOWN_BODY_MAX_LENGTH} 文字
                </p>
              </div>
              <div className="affirmation-preview affirmation-create-modal-preview affirmation-edit-modal-preview-col">
                <div className="affirmation-preview-title">プレビュー</div>
                <AffirmationMarkdownView
                  markdown={markdownHardLineBreaks(editBodyMarkdown)}
                  className="affirmation-preview-body"
                />
              </div>
            </div>
          )}
        </div>

        <div className="affirmation-create-modal-footer">
          <div className="affirmation-create-modal-actions">
            <button
              type="button"
              className="affirmation-save-btn"
              onClick={() => void handleSaveEditModal()}
              disabled={editLoading || editSaving}
            >
              {editSaving ? '保存中…' : '保存'}
            </button>
            <button
              type="button"
              className="affirmation-cancel-btn"
              onClick={handleCloseEditModal}
              disabled={editLoading || editSaving}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const historyModalJsx = showHistoryModal ? (
    <div
      className="affirmation-create-modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeHistoryModal();
      }}
    >
      <div
        className="affirmation-create-modal affirmation-history-read-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="affirmation-history-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="affirmation-create-modal-header">
          <div className="affirmation-create-modal-header-text">
            <h3 id="affirmation-history-modal-title" className="affirmation-create-modal-title">
              履歴の内容（参照のみ）
            </h3>
            <p className="affirmation-create-modal-lead">
              保存時点の名称と本文を表示します。復元・編集はできません。
            </p>
          </div>
          <button
            type="button"
            className="affirmation-create-modal-close"
            onClick={closeHistoryModal}
            aria-label="閉じる"
          >
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </div>

        <div className="affirmation-create-modal-body affirmation-history-read-modal-body">
          {historyModalLoading ? (
            <p className="text-sm text-gray-500">読み込み中…</p>
          ) : !historyModalEntry ? (
            <p className="text-sm text-gray-600">履歴を読み込めませんでした。</p>
          ) : (
            <>
              <dl className="affirmation-history-read-meta">
                <div>
                  <dt>保存日時</dt>
                  <dd>{formatAffirmationListDate(historyModalEntry.savedAtMs)}</dd>
                </div>
                <div>
                  <dt>当時の名称</dt>
                  <dd>{historyModalEntry.title}</dd>
                </div>
              </dl>
              <div className="affirmation-preview affirmation-history-read-preview">
                <div className="affirmation-preview-title">本文（当時）</div>
                <AffirmationMarkdownView
                  markdown={
                    historyModalEntry.bodyMarkdown.trim()
                      ? markdownHardLineBreaks(historyModalEntry.bodyMarkdown)
                      : '_（本文を表示できません）_'
                  }
                  className="affirmation-preview-body"
                />
              </div>
            </>
          )}
        </div>

        <div className="affirmation-create-modal-footer">
          <div className="affirmation-create-modal-actions">
            <button
              type="button"
              className="affirmation-cancel-btn"
              onClick={closeHistoryModal}
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const selectModalJsx =
    showSelectModal && loggedIn && !initialLoading && metaReady ? (
      <div
        className="affirmation-create-modal-overlay"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) handleSelectModalDismiss();
        }}
      >
        <div
          className="affirmation-create-modal affirmation-select-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="affirmation-select-modal-title"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="affirmation-create-modal-header">
            <div className="affirmation-create-modal-header-text">
              <h3
                id="affirmation-select-modal-title"
                className="affirmation-create-modal-title"
                tabIndex={-1}
              >
                行動宣言一覧
              </h3>
              <div className="affirmation-modal-help-wrap" ref={selectLeadHelpWrapRef}>
                <button
                  type="button"
                  className="affirmation-modal-help-btn"
                  aria-expanded={selectLeadHelpOpen}
                  aria-controls="affirmation-select-lead-help"
                  aria-label="選択モーダルの説明を表示"
                  onClick={() => setSelectLeadHelpOpen((v) => !v)}
                >
                  <span className="material-symbols-outlined" aria-hidden>
                    info
                  </span>
                </button>
                {selectLeadHelpOpen ? (
                  <div
                    id="affirmation-select-lead-help"
                    className="affirmation-modal-help-bubble"
                    role="note"
                    aria-label="選択モーダルの説明"
                  >
                    {isCoachView
                      ? 'クライアントがコーチ共有をオンにした発行済みテーマのみ表示されます。行を選んで「表示」で本文を確認します。'
                      : '下書き（作成中）と発行済みを最終更新の新しい順に表示します。行をクリックして選択（色・チェック）し、下の「表示」「名称変更」「削除」を押してください。名称変更中は行の切り替えや「表示」「削除」は使えません。Esc で名称変更を解除し、もう一度 Esc で一覧を閉じられます。'}
                  </div>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="affirmation-create-modal-close"
              onClick={handleSelectModalDismiss}
              aria-label="閉じる"
            >
              <span className="material-symbols-outlined" aria-hidden>
                close
              </span>
            </button>
          </div>

          <div className="affirmation-create-modal-body affirmation-select-modal-body">
            {isCoachView ? (
              <div className="affirmation-select-panel affirmation-select-panel--modal">
                {affirmationsListLoading ? (
                  <p className="text-sm text-gray-500">一覧を読み込み中…</p>
                ) : selectTableRows.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    共有設定のある発行済みテーマがありません。クライアントに共有をオンにしてもらってください。
                  </p>
                ) : (
                  <div className="affirmation-select-modal-table-scroll">
                    <div className="affirmation-select-table-wrap">
                      <table className="affirmation-select-table">
                        <thead>
                          <tr>
                            <th scope="col" className="affirmation-select-check-col">
                              選択
                            </th>
                            <th scope="col">行動宣言名</th>
                            <th scope="col">作成状態</th>
                            <th scope="col">最終更新</th>
                            <th scope="col">プロファイル名</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectTableRows.map((row) => (
                            <tr
                              key={row.rowKey}
                              role="button"
                              tabIndex={0}
                              className={tableSelectedRowKey === row.rowKey ? 'is-table-selected' : undefined}
                              onClick={() => setTableSelectedRowKey(row.rowKey)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setTableSelectedRowKey(row.rowKey);
                                }
                              }}
                            >
                              <td className="affirmation-select-check-cell">
                                {tableSelectedRowKey === row.rowKey ? (
                                  <span className="material-symbols-outlined affirmation-select-check-icon" aria-hidden>
                                    check
                                  </span>
                                ) : null}
                              </td>
                              <td>
                                <span className="affirmation-select-title">{row.title}</span>
                              </td>
                              <td>{affirmationStatusLabelJa(row.status)}</td>
                              <td>{formatAffirmationListDate(row.updatedAtMs)}</td>
                              <td>{profileNameForList(row.profileId)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="affirmation-select-panel affirmation-select-panel--modal">
                {renamingTargetId ? (
                  <div className="affirmation-select-rename-bar">
                    <label htmlFor="affirmation-footer-rename" className="affirmation-select-rename-label">
                      新しいアファメーション名
                    </label>
                    <input
                      id="affirmation-footer-rename"
                      type="text"
                      className="affirmation-rename-input"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void commitRename();
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelRename();
                        }
                      }}
                      autoComplete="off"
                    />
                    <button type="button" className="affirmation-select-action-btn primary" onClick={() => void commitRename()}>
                      確定
                    </button>
                    <button type="button" className="affirmation-select-action-btn" onClick={cancelRename}>
                      キャンセル
                    </button>
                  </div>
                ) : null}

                {affirmationsListLoading ? (
                  <p className="text-sm text-gray-500">一覧を読み込み中…</p>
                ) : selectTableRows.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    下書きも発行済みもまだありません。<strong>作成</strong> タブから入力・保存・発行してください。
                  </p>
                ) : (
                  <div className="affirmation-select-modal-table-scroll">
                    <div className="affirmation-select-table-wrap">
                      <table className="affirmation-select-table">
                        <thead>
                          <tr>
                            <th scope="col" className="affirmation-select-check-col">
                              選択
                            </th>
                            <th scope="col">行動宣言名</th>
                            <th scope="col">作成状態</th>
                            <th scope="col">最終更新</th>
                            <th scope="col">プロファイル名</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectTableRows.map((row) => (
                            <tr
                              key={row.rowKey}
                              role="button"
                              tabIndex={0}
                              className={tableSelectedRowKey === row.rowKey ? 'is-table-selected' : undefined}
                              onClick={() => setTableSelectedRowKey(row.rowKey)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setTableSelectedRowKey(row.rowKey);
                                }
                              }}
                            >
                              <td className="affirmation-select-check-cell">
                                {tableSelectedRowKey === row.rowKey ? (
                                  <span className="material-symbols-outlined affirmation-select-check-icon" aria-hidden>
                                    check
                                  </span>
                                ) : null}
                              </td>
                              <td>
                                <span className="affirmation-select-title">{row.title}</span>
                              </td>
                              <td>{affirmationStatusLabelJa(row.status)}</td>
                              <td>{formatAffirmationListDate(row.updatedAtMs)}</td>
                              <td>{profileNameForList(row.profileId)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="affirmation-create-modal-footer">
            <div className="affirmation-select-modal-footer-row">
              {!isCoachView ? (
                <div className="affirmation-select-footer-actions">
                  <button
                    type="button"
                    className="affirmation-select-action-btn primary"
                    onClick={() => void handleDisplaySelectedTableRow()}
                    disabled={!tableSelectedRowKey || renamingTargetId !== null}
                  >
                    表示
                  </button>
                  <button
                    type="button"
                    className="affirmation-select-action-btn"
                    onClick={beginFooterRename}
                    disabled={
                      !tableSelectedRowKey ||
                      renamingTargetId !== null ||
                      !selectTableRows.find((r) => r.rowKey === tableSelectedRowKey)?.publishedId
                    }
                  >
                    名称変更
                  </button>
                  <button
                    type="button"
                    className="affirmation-select-action-btn danger"
                    onClick={() => void handleDeleteSelectedTableRow()}
                    disabled={!tableSelectedRowKey || renamingTargetId !== null}
                  >
                    削除
                  </button>
                </div>
              ) : (
                <div className="affirmation-select-footer-actions">
                  <button
                    type="button"
                    className="affirmation-select-action-btn primary"
                    onClick={() => void handleDisplaySelectedTableRow()}
                    disabled={!tableSelectedRowKey}
                  >
                    表示
                  </button>
                </div>
              )}
              <div className="affirmation-select-modal-footer-right">
                <button type="button" className="affirmation-cancel-btn" onClick={handleSelectModalDismiss}>
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  const modalContent = mounted
    ? (createModalJsx ?? editModalJsx ?? historyModalJsx ?? selectModalJsx)
    : null;

  return (
    <div className="trial-tab-content">
      <div className="affirmation-container">
        <div className="affirmation-heading-row">
          <h2 id="affirmation-section-title">行動宣言</h2>
          <div className="affirmation-help-wrap" ref={affirmationHelpWrapRef}>
            <button
              type="button"
              className="affirmation-help-btn"
              aria-expanded={affirmationHelpOpen}
              aria-controls="affirmation-help-desc"
              aria-label="この画面の説明を表示"
              onClick={() => setAffirmationHelpOpen((v) => !v)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>
            {affirmationHelpOpen ? (
              <div
                id="affirmation-help-desc"
                className="affirmation-help-bubble"
                role="region"
                aria-labelledby="affirmation-section-title"
              >
                穴埋め式で宣言文を作成します（下書き保存時は暗号化して Firestore に保存されます）。[作成] はモーダルで開きます。前回のメニュー選択は{' '}
                <strong>ユーザープロファイル（trialAffirmationMeta）</strong> に保存します。
              </div>
            ) : null}
          </div>
        </div>

        {!loggedIn ? (
          <div className="affirmation-not-loggedin">
            <p>ログインするとアファメーションの入力・保存ができます。</p>
          </div>
        ) : initialLoading || !metaReady ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : (
          <>
            {error && (
              <p className="text-sm text-red-600 mb-3" role="alert">
                {error}
              </p>
            )}
            {successMessage && (
              <p className="text-sm text-green-700 mb-3" role="status">
                {successMessage}
              </p>
            )}

            <nav className="affirmation-submenu" aria-label="アファメーションサブメニュー">
              {SUBMENU_ITEMS.map(({ key, label }) => {
                const disabled = isKeyDisabled(key);
                const active = isKeyActive(key);
                const displayLabel =
                  key === 'create' && hasDraftInProgress ? '作成中' : label;
                return (
                  <button
                    key={key}
                    type="button"
                    ref={key === 'select' ? selectSubmenuButtonRef : undefined}
                    className={`affirmation-submenu-btn${active ? ' active' : ''}`}
                    disabled={disabled}
                    aria-current={active ? 'true' : undefined}
                    aria-label={key === 'create' && hasDraftInProgress ? '作成中（下書きあり）' : undefined}
                    onClick={() => handleSubmenuClick(key, disabled)}
                  >
                    {displayLabel}
                  </button>
                );
              })}
            </nav>

            {previewMainVisible && (
              <div className="affirmation-preview affirmation-preview-main">
                {isCoachView && !coachClientUid ? (
                  <>
                    <div className="affirmation-theme-title-bar">
                      <span className="affirmation-theme-title-text">{selectedThemeTitleBar}</span>
                    </div>
                    <div className="affirmation-coach-guide-box affirmation-preview-body text-sm text-gray-700">
                      <p>
                        右上の「共有」アイコンからクライアントを選択してください。
                      </p>
                    </div>
                  </>
                ) : isCoachView && coachClientUid ? (
                  <>
                    <div className="affirmation-theme-title-bar">
                      <span className="affirmation-theme-title-text">{selectedThemeTitleBar}</span>
                    </div>
                    {!lastSelectedAffirmationId || lastSelectedAffirmationId.startsWith('draft:') ? (
                      <div className="affirmation-coach-guide-box affirmation-preview-body text-sm text-gray-700">
                        <p>共有できる発行済みテーマがありません。クライアントに共有をオンにしてもらってください。</p>
                      </div>
                    ) : (
                      <AffirmationMarkdownView markdown={mainPreviewMarkdown} className="affirmation-preview-body" />
                    )}
                  </>
                ) : (
                  <>
                    {lastSelectedAffirmationId && !lastSelectedAffirmationId.startsWith('draft:') ? (
                      <div className="affirmation-theme-title-bar">
                        <span className="affirmation-theme-title-text">{selectedThemeTitleBar}</span>
                        <label className="affirmation-coach-share-label">
                          <input
                            type="checkbox"
                            checked={clientShareWithCoach}
                            disabled={clientShareLoading}
                            onChange={(e) => void handleClientCoachShareToggle(e.target.checked)}
                          />
                          コーチ共有
                        </label>
                      </div>
                    ) : null}
                    <AffirmationMarkdownView markdown={mainPreviewMarkdown} className="affirmation-preview-body" />
                  </>
                )}
              </div>
            )}

            <div className="affirmation-profile-name">プロファイル名: {profile.name}</div>

            {showEditPanel && (
              <div className="affirmation-placeholder-panel" role="status">
                <p className="font-semibold mb-2">編集</p>
                <p className="text-sm text-gray-600">
                  発行済みの本文は画面中央のモーダルで編集します。[保存] で Firestore に反映し、必要に応じて履歴へ前版を残せます。
                </p>
              </div>
            )}

            {showHistoryPanel && (
              <div className="affirmation-placeholder-panel affirmation-history-panel" role="region" aria-label="アファメーション履歴">
                <p className="font-semibold mb-2">履歴</p>
                <p className="text-sm text-gray-600 mb-3">
                  「<strong>{selectedAffirmationTitleForHistory}</strong>」の編集履歴です。行を選ぶと当時の名称・本文を閲覧できます（参照のみ）。
                </p>
                <p className="text-sm text-gray-700 mb-3">
                  <strong>改定回数（履歴件数）</strong>：{historyItems.length} 件
                </p>
                {historyLoading ? (
                  <p className="text-sm text-gray-500">履歴を読み込み中…</p>
                ) : historyItems.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    まだ履歴がありません。「編集」で本文を保存するときに「履歴に残す」を選ぶと、ここに表示されます。
                  </p>
                ) : (
                  <div className="affirmation-select-table-wrap">
                    <table className="affirmation-select-table affirmation-history-table">
                      <thead>
                        <tr>
                          <th scope="col">保存日時</th>
                          <th scope="col">当時の名称</th>
                          <th scope="col" className="affirmation-history-action-col">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyItems.map((h) => (
                          <tr key={h.id}>
                            <td>{formatAffirmationListDate(h.savedAtMs)}</td>
                            <td>
                              <span className="affirmation-select-title">{h.title}</span>
                            </td>
                            <td className="affirmation-history-action-cell">
                              <button
                                type="button"
                                className="affirmation-select-action-btn primary"
                                onClick={() => void openHistoryDetail(h.id)}
                              >
                                閲覧
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </div>
  );
}
