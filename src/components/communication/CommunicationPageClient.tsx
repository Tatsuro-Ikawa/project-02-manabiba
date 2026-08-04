'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import ProtoFooter from '@/components/proto/ProtoFooter';
import CoachClientPickerModal from '@/components/trial/CoachClientPickerModal';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/context/ViewModeContext';
import { useClientBoardUnread, useCoachBoardUnread } from '@/hooks/useBoardUnread';
import { getActiveCoachAssignmentForClient } from '@/lib/coachAffirmationShare';
import { getUserProfile } from '@/lib/firestore';
import {
  COACH_SHARED_JOURNAL_VISIBILITY_RULE,
  COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT,
} from '@/lib/communicationConstants';
import { resolveEntitlements } from '@/lib/subscription/resolveEntitlements';
import { canViewMessageBoardRetentionHistory } from '@/lib/subscription/dataRetention';
import { DataRetentionBanner } from '@/components/subscription/DataRetentionBanner';
import { buildJsonAuthHeaders } from '@/lib/clientAuthHeaders';
import { messageFromApiErrorPayload } from '@/lib/apiErrorMessage';
import { subscribeCommunicationBoardMessages } from '@/lib/communicationBoard';
import DirectorAnnouncementsEditModal from '@/components/communication/DirectorAnnouncementsEditModal';
import { AffirmationMarkdownView } from '@/components/common/AffirmationMarkdownView';
import {
  directorAnnouncementDisplayDate,
  fetchPublicDirectorAnnouncementsPage,
  type DirectorAnnouncement,
} from '@/lib/directorAnnouncements';
import { DIRECTOR_ANNOUNCEMENT_PAGE_SIZE } from '@/lib/communicationConstants';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

type CommTab = 'director' | 'board';

function parseTab(raw: string | null): CommTab {
  if (raw === 'board' || raw === 'director') return raw;
  return 'director';
}

function formatJstYmd(d: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(d)
    .replace(/\//g, '/');
}

function formatJstYmdHm(d: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(d)
    .replace(/\//g, '/');
}

type CommMsg = {
  id: string;
  body: string;
  isMine: boolean;
  createdAt: Date;
  edited: boolean;
  /** 相手がこのメッセージを読んだ時刻（JST 表示用）。メッセージ単位。 */
  readAt?: Date | null;
};

function MessageEditModal(props: {
  open: boolean;
  initialText: string;
  onSave: (text: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const { open, initialText, onSave, onCancel } = props;
  const [text, setText] = useState(initialText);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setText(initialText);
  }, [open, initialText]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => taRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="communication-edit-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="communication-edit-modal-title"
    >
      <div
        className="communication-edit-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="communication-edit-modal-title" className="communication-edit-modal-title">
          メッセージを編集
        </h2>
        <textarea
          ref={taRef}
          className="communication-edit-modal-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
        />
        <div className="communication-edit-modal-actions">
          <button type="button" className="communication-edit-modal-btn secondary" onClick={onCancel}>
            キャンセル
          </button>
          <button
            type="button"
            className="communication-edit-modal-btn primary"
            onClick={() => void onSave(text)}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommunicationPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const coachClientParam = searchParams.get('coachClient');
  const currentTab = useMemo(() => parseTab(tabParam), [tabParam]);
  const coachClientUid = coachClientParam || null;

  const { user, loading, userProfile } = useAuth();
  const { mode } = useViewMode();
  const loggedIn = !loading && !!user;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<CommMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [coachTarget, setCoachTarget] = useState<{ name: string; photoURL: string | null } | null>(null);
  const [clientTarget, setClientTarget] = useState<{ name: string; photoURL: string | null } | null>(null);
  const [coachPickerOpen, setCoachPickerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatRegionRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const markReadInFlight = useRef(false);
  const lastMarkedPeerRef = useRef<string | null>(null);
  const coachAutoPickerOnce = useRef(false);

  const isCoachRole = userProfile?.role === 'coach' || userProfile?.role === 'senior_coach';
  const isCoachView = loggedIn && mode === 'coach' && !!userProfile && isCoachRole;
  const isAdminView = loggedIn && mode === 'admin' && userProfile?.role === 'admin';
  const showDirectorEditUi = isAdminView;
  const isClientView = loggedIn && mode === 'client' && !isCoachRole;

  const coachBoardUnread = useCoachBoardUnread(user?.uid, isCoachView);
  const clientBoardUnread = useClientBoardUnread(user?.uid, isClientView);
  const showBoardTabNew = isCoachView
    ? coachBoardUnread.anyUnread
    : clientBoardUnread.hasUnread;

  const [directorCards, setDirectorCards] = useState<DirectorAnnouncement[]>([]);
  const [directorLoading, setDirectorLoading] = useState(false);
  const [directorError, setDirectorError] = useState<string | null>(null);
  const [directorPage, setDirectorPage] = useState(1);
  const [directorHasMore, setDirectorHasMore] = useState(false);
  const directorCursorsRef = useRef<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const [directorEditOpen, setDirectorEditOpen] = useState(false);

  const [assignedCoachUid, setAssignedCoachUid] = useState<string | null>(null);

  const premiumUnlocked = useMemo(() => {
    if (!userProfile) return false;
    return resolveEntitlements(userProfile)['communication.message_board'];
  }, [userProfile]);

  const boardRetentionReadOnly = useMemo(() => {
    if (!userProfile || premiumUnlocked) return false;
    return canViewMessageBoardRetentionHistory(userProfile);
  }, [userProfile, premiumUnlocked]);

  const boardTabEnabled = premiumUnlocked || boardRetentionReadOnly || isCoachRole;

  const boardReadAllowed = premiumUnlocked || boardRetentionReadOnly || isCoachView;

  const setTab = useCallback(
    (next: CommTab) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set('tab', next);
      router.replace(`/communication?${p.toString()}`);
    },
    [router, searchParams]
  );

  const setCoachClientUid = useCallback(
    (uid: string | null) => {
      const p = new URLSearchParams(searchParams.toString());
      if (uid) p.set('coachClient', uid);
      else p.delete('coachClient');
      if (!p.get('tab')) p.set('tab', currentTab);
      router.replace(`/communication?${p.toString()}`);
    },
    [router, searchParams, currentTab]
  );

  useEffect(() => {
    if (!loggedIn || !user?.uid) {
      setCoachTarget(null);
      setAssignedCoachUid(null);
      return;
    }
    if (mode !== 'client') {
      setCoachTarget(null);
      setAssignedCoachUid(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const asg = await getActiveCoachAssignmentForClient(user.uid);
        const coachUid = asg?.data.coachUid;
        if (!coachUid) {
          if (!cancelled) {
            setCoachTarget({ name: '担当コーチ（未割当）', photoURL: null });
            setAssignedCoachUid(null);
          }
          return;
        }
        if (!cancelled) setAssignedCoachUid(coachUid);
        try {
          const prof = await getUserProfile(coachUid);
          if (cancelled) return;
          setCoachTarget({
            name: prof?.displayName?.trim() || prof?.email || coachUid,
            photoURL: prof?.photoURL ?? null,
          });
        } catch (profileErr) {
          console.error('担当コーチプロファイル取得エラー:', profileErr);
          if (!cancelled) {
            setCoachTarget({ name: '担当コーチ', photoURL: null });
          }
        }
      } catch (asgErr) {
        console.error('担当コーチ割当取得エラー:', asgErr);
        if (!cancelled) {
          setCoachTarget({ name: '担当コーチ（未割当）', photoURL: null });
          setAssignedCoachUid(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, user?.uid, mode]);

  useEffect(() => {
    if (!loggedIn || !coachClientUid || !isCoachView) {
      setClientTarget(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const prof = await getUserProfile(coachClientUid);
        if (cancelled) return;
        setClientTarget({
          name: prof?.displayName?.trim() || prof?.email || coachClientUid,
          photoURL: prof?.photoURL ?? null,
        });
      } catch {
        if (!cancelled) setClientTarget({ name: coachClientUid, photoURL: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, coachClientUid, isCoachView]);

  useEffect(() => {
    if (!coachClientUid) coachAutoPickerOnce.current = false;
  }, [coachClientUid]);

  useEffect(() => {
    if (!boardReadAllowed || currentTab !== 'board' || !isCoachView || coachClientUid) return;
    if (coachAutoPickerOnce.current) return;
    coachAutoPickerOnce.current = true;
    setCoachPickerOpen(true);
  }, [boardReadAllowed, currentTab, isCoachView, coachClientUid]);

  // メッセージボード表示中のみ Firestore を購読（タブを離れたら unsubscribe）
  useEffect(() => {
    if (currentTab !== 'board' || !loggedIn || !user?.uid || !boardReadAllowed) {
      setMessages([]);
      return;
    }

    const peerUid = isCoachView ? coachClientUid : assignedCoachUid;
    if (!peerUid) {
      setMessages([]);
      return;
    }

    const coachUid = isCoachView ? user.uid : peerUid;
    const clientUid = isCoachView ? peerUid : user.uid;
    const selfUid = user.uid;

    const unsub = subscribeCommunicationBoardMessages(
      coachUid,
      clientUid,
      (list) => {
        setMessages(
          list.map((m) => ({
            id: m.id,
            body: m.body,
            isMine: m.authorUid === selfUid,
            createdAt: m.createdAt,
            edited: m.edited,
            readAt: m.readAt,
          }))
        );
      },
      (err) => {
        console.error('メッセージボード購読エラー:', err);
      }
    );

    return () => unsub();
  }, [
    currentTab,
    loggedIn,
    user?.uid,
    boardReadAllowed,
    isCoachView,
    coachClientUid,
    assignedCoachUid,
  ]);

  const clientSendCount = useMemo(
    () => messages.filter((m) => m.isMine && mode === 'client').length,
    [messages, mode]
  );

  const clientAtLimit = mode === 'client' && clientSendCount >= COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT;

  const boardDisabledReason = useMemo(() => {
    if (!loggedIn) return 'ログインが必要です。';
    if (boardRetentionReadOnly) {
      return 'プレミアムプラン終了のため、メッセージボードは閲覧のみです（90日間）。';
    }
    if (!premiumUnlocked && !boardRetentionReadOnly && !isCoachRole) {
      return 'プレミアムプランのみ利用できます。';
    }
    if (isAdminView) return '管理者モードではメッセージボードを利用できません。';
    if (isCoachView && !coachClientUid) return 'クライアントを選択してください。';
    if (mode === 'client' && !assignedCoachUid) return '担当コーチの割当がありません。';
    if (clientAtLimit) return `クライアントからの送信は ${COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT} 件までです。`;
    return null;
  }, [
    loggedIn,
    boardRetentionReadOnly,
    premiumUnlocked,
    isCoachRole,
    isAdminView,
    isCoachView,
    coachClientUid,
    clientAtLimit,
    mode,
    assignedCoachUid,
  ]);

  const canShowBoardMessages =
    loggedIn &&
    boardReadAllowed &&
    (!isCoachView || !!coachClientUid) &&
    (isCoachView || mode !== 'client' || !!assignedCoachUid);

  const inputDisabled = !!boardDisabledReason;

  const boardPeerUid = isCoachView ? coachClientUid : assignedCoachUid;

  const markBoardRead = useCallback(async () => {
    const peerUid = boardPeerUid;
    if (!user || !peerUid || !canShowBoardMessages) return;
    if (markReadInFlight.current) return;
    if (lastMarkedPeerRef.current === peerUid && messages.every((m) => m.isMine || m.readAt)) {
      return;
    }
    markReadInFlight.current = true;
    try {
      const authHeaders = await buildJsonAuthHeaders(user);
      const res = await fetch('/api/communication/board/read', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerUid }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string | { message?: string };
        };
        console.warn('board mark-read failed:', messageFromApiErrorPayload(payload));
        return;
      }
      lastMarkedPeerRef.current = peerUid;
      if (isCoachView) void coachBoardUnread.refresh();
      else void clientBoardUnread.refresh();
    } catch (e) {
      console.warn(e);
    } finally {
      markReadInFlight.current = false;
    }
  }, [
    boardPeerUid,
    user,
    canShowBoardMessages,
    messages,
    isCoachView,
    coachBoardUnread.refresh,
    clientBoardUnread.refresh,
  ]);

  // 最下部（最終メッセージ）が見えたら既読にする
  useEffect(() => {
    if (currentTab !== 'board' || !canShowBoardMessages || !boardPeerUid) return;
    lastMarkedPeerRef.current = null;
    const sentinel = bottomSentinelRef.current;
    const root = chatRegionRef.current;
    if (!sentinel) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void markBoardRead();
        }
      },
      { root: root ?? null, threshold: 0.1 }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [currentTab, canShowBoardMessages, boardPeerUid, messages.length, markBoardRead]);

  const openEdit = (m: CommMsg) => {
    setEditingId(m.id);
    setEditDraft(m.body);
    setEditOpen(true);
  };

  const saveEdit = async (text: string) => {
    if (!editingId) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const peerUid = isCoachView ? coachClientUid : assignedCoachUid;
    if (!user || !peerUid) {
      window.alert('送信先が確定していません。');
      return;
    }
    try {
      const authHeaders = await buildJsonAuthHeaders(user);
      const res = await fetch(`/api/communication/board/message/${encodeURIComponent(editingId)}`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerUid, body: trimmed }),
      });
      const data = (await res.json()) as unknown;
      if (!res.ok) {
        throw new Error(messageFromApiErrorPayload(data) || '保存に失敗しました。');
      }
      setEditOpen(false);
      setEditingId(null);
      setEditDraft('');
    } catch (e) {
      console.error(e);
      window.alert(e instanceof Error ? e.message : '保存に失敗しました。');
    }
  };

  const cancelEdit = () => {
    setEditOpen(false);
    setEditingId(null);
    setEditDraft('');
  };

  const handleSend = async () => {
    const t = draft.trim();
    if (!t || inputDisabled || sending || !user) return;
    const peerUid = isCoachView ? coachClientUid : assignedCoachUid;
    if (!peerUid) {
      window.alert('送信先が確定していません。');
      return;
    }
    setSending(true);
    try {
      const authHeaders = await buildJsonAuthHeaders(user);
      const res = await fetch('/api/communication/board/message', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerUid, body: t }),
      });
      const data = (await res.json()) as {
        message?: { id: string; body: string; createdAt: string; edited: boolean };
      };
      if (!res.ok || !data.message) {
        throw new Error(messageFromApiErrorPayload(data) || '送信に失敗しました。');
      }
      setDraft('');
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } catch (e) {
      console.error(e);
      window.alert(e instanceof Error ? e.message : '送信に失敗しました。');
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => {
    if (!draft.trim()) return;
    if (!window.confirm('入力中の内容を破棄しますか？')) return;
    setDraft('');
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editOpen) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [editOpen]);

  const loadDirectorPage = useCallback(async (page: number) => {
    setDirectorLoading(true);
    setDirectorError(null);
    try {
      const cursor = directorCursorsRef.current[page - 1] ?? null;
      const result = await fetchPublicDirectorAnnouncementsPage(DIRECTOR_ANNOUNCEMENT_PAGE_SIZE, cursor);
      setDirectorCards(result.items);
      setDirectorHasMore(result.hasMore);
      setDirectorPage(page);
      if (result.hasMore && result.nextCursor) {
        directorCursorsRef.current[page] = result.nextCursor;
      }
    } catch (e) {
      console.error('fetchPublicDirectorAnnouncementsPage error:', e);
      setDirectorError('お知らせの読み込みに失敗しました。');
    } finally {
      setDirectorLoading(false);
    }
  }, []);

  const reloadDirectorList = useCallback(() => {
    directorCursorsRef.current = [null];
    void loadDirectorPage(1);
  }, [loadDirectorPage]);

  useEffect(() => {
    if (currentTab !== 'director') return;
    directorCursorsRef.current = [null];
    void loadDirectorPage(1);
  }, [currentTab, loadDirectorPage]);

  const targetHeader = useMemo(() => {
    if (isAdminView) return null;
    if (isCoachView) {
      if (!coachClientUid) return { name: 'クライアント未選択', photoURL: null as string | null };
      return {
        name: clientTarget?.name ?? '読み込み中…',
        photoURL: clientTarget?.photoURL ?? null,
      };
    }
    return {
      name: coachTarget?.name ?? '担当コーチ',
      photoURL: coachTarget?.photoURL ?? null,
    };
  }, [isAdminView, isCoachView, coachClientUid, clientTarget, coachTarget]);

  return (
    <div style={{ fontFamily: 'var(--font-family-jp)' }}>
      <ProtoHeader sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <LeftSidebar variant="home" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="home-main-wrapper">
        <main className="home-main-content communication-page-shell">
          <h1 className="section-title communication-page-title">コミュニケーション</h1>

          <DataRetentionBanner userProfile={userProfile} className="communication-data-retention" />

          <nav className="trial-menu-bar communication-tab-bar" aria-label="コミュニケーション内メニュー">
            <button
              type="button"
              className={`trial-menu-item ${currentTab === 'director' ? 'active' : ''}`}
              aria-current={currentTab === 'director' ? 'page' : undefined}
              onClick={() => setTab('director')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                campaign
              </span>
              <span className="menu-text" aria-hidden="true">
                館長から
              </span>
            </button>
            <button
              type="button"
              className={`trial-menu-item ${currentTab === 'board' ? 'active' : ''}${
                !boardTabEnabled ? ' sidebar-btn--disabled' : ''
              }`}
              aria-current={currentTab === 'board' ? 'page' : undefined}
              aria-disabled={!boardTabEnabled}
              disabled={!boardTabEnabled}
              title={
                !boardTabEnabled
                  ? isCoachRole
                    ? 'コーチモードでは利用できます'
                    : 'プレミアムプランのみ利用できます。'
                  : boardRetentionReadOnly
                    ? '閲覧のみ（90日間）'
                    : undefined
              }
              onClick={() => {
                if (!boardTabEnabled) return;
                setTab('board');
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                forum
              </span>
              <span className="menu-text" aria-hidden="true">
                メッセージボード
              </span>
              {showBoardTabNew ? (
                <span className="board-unread-new board-unread-new--chip" aria-hidden>
                  New
                </span>
              ) : null}
            </button>
            <div className="trial-menu-spacer" aria-hidden="true" />
            {showDirectorEditUi && currentTab === 'director' && (
              <button
                type="button"
                className="trial-menu-share-btn"
                onClick={() => setDirectorEditOpen(true)}
                aria-label="館長からを編集"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  edit
                </span>
                <span className="trial-menu-share-btn-label">編集</span>
              </button>
            )}
            {isCoachView && currentTab === 'board' && (
              <button
                type="button"
                className="trial-menu-share-btn"
                onClick={() => {
                  void coachBoardUnread.refresh();
                  setCoachPickerOpen(true);
                }}
                aria-label={
                  coachBoardUnread.anyUnread
                    ? 'クライアントを選択（未読メッセージあり）'
                    : 'クライアントを選択'
                }
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  group
                </span>
                <span className="trial-menu-share-btn-label">
                  {coachClientUid ? clientTarget?.name ?? coachClientUid : 'クライアント選択'}
                </span>
                {coachBoardUnread.anyUnread ? (
                  <span className="board-unread-new board-unread-new--chip" aria-hidden>
                    New
                  </span>
                ) : null}
              </button>
            )}
          </nav>

          {currentTab === 'director' && (
            <section className="content-section communication-director-section" aria-labelledby="director-heading">
              <h2 id="director-heading" className="communication-section-heading">
                館長から
              </h2>
              <p className="communication-page-lead mb-0">
                一方通行のお知らせです。ホームの新着からもこちらへリンクします。
              </p>
              {directorError && (
                <p className="text-sm text-red-600 mt-2" role="alert">
                  {directorError}
                </p>
              )}
              {directorLoading && directorCards.length === 0 ? (
                <p className="text-sm text-gray-500 mt-4">読み込み中…</p>
              ) : directorCards.length === 0 ? (
                <p className="text-sm text-gray-500 mt-4">お知らせはまだありません。</p>
              ) : (
                <ul className="communication-director-list">
                  {directorCards.map((c) => {
                    const displayDate = directorAnnouncementDisplayDate(c);
                    return (
                      <li key={c.id} className="communication-director-card">
                        <div className="communication-director-card-head">
                          <h3 className="communication-director-card-title">{c.title}</h3>
                          {displayDate && (
                            <time
                              className="communication-director-card-date"
                              dateTime={displayDate.toISOString()}
                            >
                              {formatJstYmdHm(displayDate)}
                            </time>
                          )}
                        </div>
                        <div className="communication-director-card-body">
                          <AffirmationMarkdownView
                            markdown={c.bodyMarkdown}
                            className="communication-director-markdown"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {(directorPage > 1 || directorHasMore) && (
                <nav className="communication-director-pagination" aria-label="館長からのページ送り">
                  <button
                    type="button"
                    className="communication-director-page-btn"
                    disabled={directorPage <= 1 || directorLoading}
                    onClick={() => void loadDirectorPage(directorPage - 1)}
                  >
                    前へ
                  </button>
                  <span className="communication-director-page-indicator">{directorPage} ページ</span>
                  <button
                    type="button"
                    className="communication-director-page-btn"
                    disabled={!directorHasMore || directorLoading}
                    onClick={() => void loadDirectorPage(directorPage + 1)}
                  >
                    次へ
                  </button>
                </nav>
              )}
            </section>
          )}

          {currentTab === 'board' && (
            <>
              <section className="content-section communication-board-section" aria-labelledby="board-heading">
                <div className="communication-board-head">
                  <h2 id="board-heading" className="communication-section-heading">
                    メッセージ表示
                  </h2>
                  {targetHeader && (
                    <div className="communication-target-chip" aria-label="対象者">
                      <span className="communication-target-name">{targetHeader.name}</span>
                      {targetHeader.photoURL ? (
                        <img src={targetHeader.photoURL} alt="" className="communication-target-avatar" />
                      ) : (
                        <span className="communication-target-avatar communication-target-avatar--placeholder" aria-hidden>
                          {(targetHeader.name.slice(0, 1) || '?').toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {boardDisabledReason && (
                  <p className="communication-board-gate" role="status">
                    {boardDisabledReason}
                  </p>
                )}

                <div
                  ref={chatRegionRef}
                  className="communication-chat-region"
                  role="region"
                  aria-label="コーチとのメッセージ"
                >
                  {canShowBoardMessages ? (
                    <ul className="communication-msg-list">
                      {messages.map((m) => (
                        <li key={m.id} className={`communication-msg-row ${m.isMine ? 'is-mine' : 'is-theirs'}`}>
                          <article
                            className={`communication-msg-bubble ${m.isMine ? 'is-mine' : 'is-theirs'}`}
                            aria-label={m.isMine ? '自分のメッセージ' : '相手のメッセージ'}
                          >
                            <p className="communication-msg-body">{m.body}</p>
                            <div className="communication-msg-meta-row">
                              <span className="communication-msg-created">作成：{formatJstYmd(m.createdAt)}</span>
                              {m.edited && <span className="communication-msg-edited-badge">編集済み</span>}
                              {m.isMine && premiumUnlocked && !boardRetentionReadOnly && (
                                <button
                                  type="button"
                                  className="communication-msg-edit-btn"
                                  aria-label="このメッセージを編集"
                                  onClick={() => openEdit(m)}
                                >
                                  <span className="material-symbols-outlined" aria-hidden="true">
                                    edit
                                  </span>
                                </button>
                              )}
                            </div>
                            {m.isMine && m.readAt && (
                              <p className="communication-msg-read">既読 {formatJstYmdHm(m.readAt)}</p>
                            )}
                          </article>
                        </li>
                      ))}
                      <li aria-hidden className="communication-msg-bottom-sentinel">
                        <div ref={bottomSentinelRef} />
                      </li>
                    </ul>
                  ) : (
                    <div className="communication-chat-placeholder" aria-hidden />
                  )}
                </div>
              </section>

              <section className="content-section communication-input-section" aria-labelledby="input-heading">
                <h2 id="input-heading" className="communication-section-heading">
                  メッセージ入力
                </h2>
                {boardRetentionReadOnly ? (
                  <p className="communication-board-gate" role="status">
                    プレミアムプラン終了のため、新規投稿・編集はできません。履歴は90日間閲覧できます。
                  </p>
                ) : (
                  <>
                <textarea
                  ref={inputRef}
                  className="communication-input-textarea"
                  placeholder="メッセージを入力…"
                  value={draft}
                  disabled={inputDisabled}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur();
                  }}
                  rows={4}
                />
                <div className="communication-input-actions">
                  <button
                    type="button"
                    className="communication-input-btn secondary"
                    disabled={inputDisabled || !draft.trim()}
                    onClick={handleClear}
                  >
                    クリア
                  </button>
                  <button
                    type="button"
                    className="communication-input-btn primary"
                    disabled={inputDisabled || !draft.trim() || sending}
                    onClick={() => void handleSend()}
                  >
                    {sending ? '送信中…' : '送る'}
                  </button>
                </div>
                  </>
                )}
              </section>

              <p className="communication-spec-note" role="note">
                <span className="communication-spec-note-label">コーチ共有データ境界（案）</span>
                {COACH_SHARED_JOURNAL_VISIBILITY_RULE}
              </p>
            </>
          )}

          <p className="communication-page-back">
            <Link href="/">ホームへ戻る</Link>
          </p>
        </main>
      </div>

      <ProtoFooter />

      <MessageEditModal
        open={editOpen}
        initialText={editDraft}
        onSave={(text) => saveEdit(text)}
        onCancel={cancelEdit}
      />

      {user?.uid && isCoachView && (
        <CoachClientPickerModal
          open={coachPickerOpen}
          coachUid={user.uid}
          currentClientUid={coachClientUid}
          onClose={() => setCoachPickerOpen(false)}
          onShare={(uid) => {
            setCoachClientUid(uid);
            setCoachPickerOpen(false);
          }}
          onClear={() => {
            setCoachClientUid(null);
            setCoachPickerOpen(false);
          }}
        />
      )}

      {showDirectorEditUi && user?.uid && (
        <DirectorAnnouncementsEditModal
          isOpen={directorEditOpen}
          onClose={() => setDirectorEditOpen(false)}
          authorUid={user.uid}
          onSaved={reloadDirectorList}
        />
      )}
    </div>
  );
}
