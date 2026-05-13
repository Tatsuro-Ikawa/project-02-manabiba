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
import { getActiveCoachAssignmentForClient } from '@/lib/coachAffirmationShare';
import { getUserProfile } from '@/lib/firestore';
import {
  COACH_SHARED_JOURNAL_VISIBILITY_RULE,
  COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT,
  COMMUNICATION_PREMIUM_BOARD_UNLOCKED,
} from '@/lib/communicationConstants';

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

type DirectorCard = {
  id: string;
  title: string;
  body: string;
  postedAt: Date;
};

const DEMO_DIRECTOR_CARDS: DirectorCard[] = [
  {
    id: 'd1',
    title: '開館スケジュールのお知らせ',
    body: 'ゴールデンウィーク期間の開館時間についてお知らせします。（ダミー本文）',
    postedAt: new Date('2026-05-10T10:00:00+09:00'),
  },
  {
    id: 'd2',
    title: '稽古納めのご案内',
    body: '年度末の稽古納めについてご案内します。（ダミー本文）',
    postedAt: new Date('2026-04-28T15:30:00+09:00'),
  },
];

const DEMO_MESSAGES_TEMPLATE: Omit<CommMsg, 'isMine'>[] = [
  {
    id: 'm1',
    body: 'クライアントのレター',
    createdAt: new Date('2026-05-08T09:00:00+09:00'),
    edited: false,
    readAt: new Date('2026-05-08T11:20:00+09:00'),
  },
  {
    id: 'm2',
    body: 'コーチからの回答',
    createdAt: new Date('2026-05-08T12:00:00+09:00'),
    edited: false,
  },
];

function buildDemoMessages(isCoachView: boolean): CommMsg[] {
  return [
    {
      ...DEMO_MESSAGES_TEMPLATE[0],
      isMine: !isCoachView,
    },
    {
      ...DEMO_MESSAGES_TEMPLATE[1],
      isMine: isCoachView,
    },
  ];
}

function MessageEditModal(props: {
  open: boolean;
  initialText: string;
  onSave: (text: string) => void;
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
          <button type="button" className="communication-edit-modal-btn primary" onClick={() => onSave(text)}>
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
  const coachAutoPickerOnce = useRef(false);

  const isCoachRole = userProfile?.role === 'coach' || userProfile?.role === 'senior_coach';
  const isCoachView = loggedIn && mode === 'coach' && !!userProfile && isCoachRole;
  const isAdminView = loggedIn && mode === 'admin' && userProfile?.role === 'admin';

  const premiumUnlocked = COMMUNICATION_PREMIUM_BOARD_UNLOCKED;

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
      return;
    }
    if (mode !== 'client') {
      setCoachTarget(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const asg = await getActiveCoachAssignmentForClient(user.uid);
        const coachUid = asg?.data.coachUid;
        if (!coachUid) {
          if (!cancelled) setCoachTarget({ name: '担当コーチ（未割当）', photoURL: null });
          return;
        }
        const prof = await getUserProfile(coachUid);
        if (cancelled) return;
        setCoachTarget({
          name: prof?.displayName?.trim() || prof?.email || coachUid,
          photoURL: prof?.photoURL ?? null,
        });
      } catch {
        if (!cancelled) setCoachTarget({ name: '担当コーチ', photoURL: null });
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
    if (!premiumUnlocked || currentTab !== 'board' || !isCoachView || coachClientUid) return;
    if (coachAutoPickerOnce.current) return;
    coachAutoPickerOnce.current = true;
    setCoachPickerOpen(true);
  }, [premiumUnlocked, currentTab, isCoachView, coachClientUid]);

  useEffect(() => {
    if (premiumUnlocked && currentTab === 'board' && loggedIn && (!isCoachView || coachClientUid)) {
      setMessages((prev) => {
        if (prev.some((m) => m.id.startsWith('local-'))) return prev;
        return buildDemoMessages(isCoachView);
      });
    }
    if (!premiumUnlocked || currentTab !== 'board') {
      setMessages([]);
    }
  }, [premiumUnlocked, currentTab, loggedIn, isCoachView, coachClientUid]);

  const clientSendCount = useMemo(
    () => messages.filter((m) => m.isMine && mode === 'client').length,
    [messages, mode]
  );

  const clientAtLimit = mode === 'client' && clientSendCount >= COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT;

  const boardDisabledReason = useMemo(() => {
    if (!loggedIn) return 'ログインが必要です。';
    if (!premiumUnlocked) return 'プレミアムコースのみ利用できます（暫定: 機能ロック中）。';
    if (isAdminView) return '管理者モードではメッセージボードを利用できません。';
    if (isCoachView && !coachClientUid) return 'クライアントを選択してください。';
    if (clientAtLimit) return `クライアントからの送信は ${COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT} 件までです。`;
    return null;
  }, [loggedIn, premiumUnlocked, isAdminView, isCoachView, coachClientUid, clientAtLimit]);

  const inputDisabled = !!boardDisabledReason;

  const openEdit = (m: CommMsg) => {
    setEditingId(m.id);
    setEditDraft(m.body);
    setEditOpen(true);
  };

  const saveEdit = (text: string) => {
    if (!editingId) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === editingId ? { ...m, body: trimmed, edited: true, createdAt: m.createdAt } : m
      )
    );
    setEditOpen(false);
    setEditingId(null);
    setEditDraft('');
  };

  const cancelEdit = () => {
    setEditOpen(false);
    setEditingId(null);
    setEditDraft('');
  };

  const handleSend = async () => {
    const t = draft.trim();
    if (!t || inputDisabled || sending) return;
    setSending(true);
    try {
      await new Promise((r) => setTimeout(r, 250));
      const id = `local-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id,
          body: t,
          isMine: true,
          createdAt: new Date(),
          edited: false,
        },
      ]);
      setDraft('');
      window.setTimeout(() => inputRef.current?.focus(), 0);
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

  const sortedDirector = useMemo(
    () => [...DEMO_DIRECTOR_CARDS].sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime()),
    []
  );

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
              className={`trial-menu-item ${currentTab === 'board' ? 'active' : ''}`}
              aria-current={currentTab === 'board' ? 'page' : undefined}
              onClick={() => setTab('board')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                forum
              </span>
              <span className="menu-text" aria-hidden="true">
                メッセージボード
              </span>
            </button>
            <div className="trial-menu-spacer" aria-hidden="true" />
            {isCoachView && currentTab === 'board' && (
              <button
                type="button"
                className="trial-menu-share-btn"
                onClick={() => setCoachPickerOpen(true)}
                aria-label="クライアントを選択"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  group
                </span>
                <span className="trial-menu-share-btn-label">
                  {coachClientUid ? clientTarget?.name ?? coachClientUid : 'クライアント選択'}
                </span>
              </button>
            )}
          </nav>

          {currentTab === 'director' && (
            <section className="content-section communication-director-section" aria-labelledby="director-heading">
              <h2 id="director-heading" className="communication-section-heading">
                館長から
              </h2>
              <p className="communication-page-lead mb-0">
                一方通行のお知らせです。ホームの新着タイトルからリンクする想定で、ここでは新着順のカード一覧（ダミー）です。
              </p>
              <ul className="communication-director-list">
                {sortedDirector.map((c) => (
                  <li key={c.id} className="communication-director-card">
                    <div className="communication-director-card-head">
                      <h3 className="communication-director-card-title">{c.title}</h3>
                      <time className="communication-director-card-date" dateTime={c.postedAt.toISOString()}>
                        {formatJstYmdHm(c.postedAt)}
                      </time>
                    </div>
                    <p className="communication-director-card-body">{c.body}</p>
                  </li>
                ))}
              </ul>
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
                  className="communication-chat-region"
                  role="region"
                  aria-label="コーチとのメッセージ"
                >
                  {premiumUnlocked && loggedIn && !boardDisabledReason ? (
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
                              {m.isMine && (
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
    </div>
  );
}
