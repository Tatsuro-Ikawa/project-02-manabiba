'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AffirmationMarkdownView } from '@/components/common/AffirmationMarkdownView';
import {
  appendCoachCommentVersion,
  decryptCoachCommentForDisplay,
  getCoachShareUsageSummary,
  listActiveCoachAssignmentsForCoach,
  listCoachCommentVersions,
  listCoachShareRounds,
  resolveClientUidFromAssignmentDoc,
  type CoachShareRoundListItem,
} from '@/lib/coachAffirmationShare';
import { getUserProfile, listUserAffirmations, getAffirmationPublishedMarkdown } from '@/lib/firestore';
import type { UserProfile } from '@/types/auth';

type Props = {
  coachUid: string;
};

export default function CoachAffirmationSharePanel({ coachUid }: Props) {
  const [assignLoading, setAssignLoading] = useState(true);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [clientRows, setClientRows] = useState<{ clientUid: string; label: string }[]>([]);
  const [selectedClientUid, setSelectedClientUid] = useState<string | null>(null);

  const [affirmLoading, setAffirmLoading] = useState(false);
  const [affirmations, setAffirmations] = useState<{ id: string; title: string }[]>([]);
  const [selectedAffirmationId, setSelectedAffirmationId] = useState<string | null>(null);

  const [bodyMd, setBodyMd] = useState<string | null>(null);
  const [bodyLoading, setBodyLoading] = useState(false);

  const [rounds, setRounds] = useState<CoachShareRoundListItem[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [versionsText, setVersionsText] = useState<string[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedClientProfile, setSelectedClientProfile] = useState<UserProfile | null>(null);

  const loadAssignments = useCallback(async () => {
    setAssignLoading(true);
    setAssignError(null);
    try {
      const rows = await listActiveCoachAssignmentsForCoach(coachUid);
      const enriched: { clientUid: string; label: string }[] = [];
      for (const r of rows) {
        const c = resolveClientUidFromAssignmentDoc(coachUid, r.id, r.data.clientUid);
        const prof = await getUserProfile(c);
        const label = prof?.displayName || prof?.email || c;
        enriched.push({ clientUid: c, label });
      }
      setClientRows(enriched);
      setSelectedClientUid((prev) => prev ?? (enriched[0]?.clientUid ?? null));
    } catch (e) {
      console.error(e);
      setAssignError('担当クライアント一覧の取得に失敗しました。割当ドキュメントとルールを確認してください。');
    } finally {
      setAssignLoading(false);
    }
  }, [coachUid]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    if (!selectedClientUid) {
      setSelectedClientProfile(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const prof = await getUserProfile(selectedClientUid);
      if (!cancelled) setSelectedClientProfile(prof);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClientUid]);

  useEffect(() => {
    if (!selectedClientUid) {
      setAffirmations([]);
      setSelectedAffirmationId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setAffirmLoading(true);
      try {
        const list = await listUserAffirmations(selectedClientUid, { coachScoped: true });
        if (cancelled) return;
        setAffirmations(list.map((a) => ({ id: a.id, title: a.title })));
        if (list.length) {
          setSelectedAffirmationId(list[0].id);
        } else {
          setSelectedAffirmationId(null);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setAffirmations([]);
          setSelectedAffirmationId(null);
        }
      } finally {
        if (!cancelled) setAffirmLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClientUid]);

  useEffect(() => {
    if (!selectedClientUid || !selectedAffirmationId) {
      setBodyMd(null);
      setRounds([]);
      setSelectedRoundId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setBodyLoading(true);
      try {
        const [md, rs] = await Promise.all([
          getAffirmationPublishedMarkdown(selectedClientUid, selectedAffirmationId),
          listCoachShareRounds(selectedClientUid, selectedAffirmationId),
        ]);
        if (cancelled) return;
        setBodyMd(md);
        setRounds(rs);
        const last = rs[rs.length - 1];
        setSelectedRoundId(last ? last.id : null);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setBodyMd(null);
          setRounds([]);
        }
      } finally {
        if (!cancelled) setBodyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClientUid, selectedAffirmationId]);

  useEffect(() => {
    if (!selectedClientUid || !selectedAffirmationId || !selectedRoundId) {
      setVersionsText([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const vers = await listCoachCommentVersions(
        selectedClientUid,
        selectedAffirmationId,
        selectedRoundId
      );
      const texts: string[] = [];
      for (const v of vers) {
        texts.push(await decryptCoachCommentForDisplay(v.encryptedBody, selectedClientUid));
      }
      if (!cancelled) setVersionsText(texts);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClientUid, selectedAffirmationId, selectedRoundId]);

  const handleSendComment = async () => {
    if (!selectedClientUid || !selectedAffirmationId || !selectedRoundId) return;
    setCommentSending(true);
    setMsg(null);
    try {
      await appendCoachCommentVersion({
        coachUid,
        clientUid: selectedClientUid,
        affirmationId: selectedAffirmationId,
        roundId: selectedRoundId,
        plaintext: commentDraft,
      });
      setCommentDraft('');
      setMsg('コメントを送信しました。');
      const vers = await listCoachCommentVersions(
        selectedClientUid,
        selectedAffirmationId,
        selectedRoundId
      );
      const texts: string[] = [];
      for (const v of vers) {
        texts.push(await decryptCoachCommentForDisplay(v.encryptedBody, selectedClientUid));
      }
      setVersionsText(texts);
    } catch (e) {
      console.error(e);
      setMsg(e instanceof Error ? e.message : '送信に失敗しました。');
    } finally {
      setCommentSending(false);
    }
  };

  const mainMarkdown = useMemo(() => {
    if (bodyLoading) return '*読み込み中…*';
    if (bodyMd == null || bodyMd === '') return '_（本文を表示できません）_';
    return bodyMd.replace(/\n/g, '  \n');
  }, [bodyLoading, bodyMd]);

  const coachSideUsage = useMemo(
    () => (selectedClientProfile ? getCoachShareUsageSummary(selectedClientProfile) : null),
    [selectedClientProfile]
  );

  if (assignLoading) {
    return <p className="text-sm text-gray-500">担当クライアントを読み込み中…</p>;
  }
  if (assignError) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {assignError}
      </p>
    );
  }
  if (clientRows.length === 0) {
    return (
      <div className="text-sm text-gray-600 space-y-2">
        <p>有効な担当割当（<code>coach_client_assignments</code>・status=active）がありません。</p>
        <p className="text-xs">
          Firebase コンソールでドキュメント ID を <code>{'{coachUid}_{clientUid}'}</code> として作成し、
          <code>coachUid</code> / <code>clientUid</code> / <code>status: &quot;active&quot;</code> /{' '}
          <code>assignedAt</code> を設定してください（管理者のみ作成可）。
        </p>
      </div>
    );
  }

  return (
    <div className="coach-affirmation-share space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-3 min-w-0">
          <div className="affirmation-preview border border-gray-200 rounded-lg p-3 bg-white">
            <div className="text-xs font-semibold text-gray-600 mb-2">クライアントのアファメーション（最新本文）</div>
            <AffirmationMarkdownView markdown={mainMarkdown} className="affirmation-preview-body text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">ラウンド（送信単位）</label>
            <select
              className="text-sm border border-gray-300 rounded px-2 py-1 w-full max-w-md"
              value={selectedRoundId ?? ''}
              onChange={(e) => setSelectedRoundId(e.target.value || null)}
            >
              {rounds.length === 0 ? (
                <option value="">（ラウンドなし）</option>
              ) : (
                rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.clientSentAt
                      ? r.clientSentAt.toDate().toLocaleString('ja-JP')
                      : r.id}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">コーチからのコメント（履歴）</p>
            {versionsText.length === 0 ? (
              <p className="text-sm text-gray-500">まだありません</p>
            ) : (
              <ul className="space-y-2">
                {versionsText.map((t, i) => (
                  <li
                    key={i}
                    className="text-sm border-l-2 border-emerald-500 pl-2 whitespace-pre-wrap text-gray-800"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">クライアントへのコメント</label>
            <textarea
              className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="返信を入力して送信"
            />
            <button
              type="button"
              className="mt-2 text-sm px-4 py-2 rounded bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40"
              disabled={commentSending || !selectedRoundId || rounds.length === 0}
              onClick={() => void handleSendComment()}
            >
              {commentSending ? '送信中…' : '送信'}
            </button>
          </div>
          {msg && (
            <p className="text-sm text-gray-700" role="status">
              {msg}
            </p>
          )}
        </div>

        <aside className="space-y-3 lg:border-l lg:border-gray-200 lg:pl-4 order-first lg:order-last">
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">担当クライアント</p>
            <ul className="space-y-1">
              {clientRows.map((c) => (
                <li key={c.clientUid}>
                  <button
                    type="button"
                    className={`text-left text-sm w-full px-2 py-1 rounded ${
                      selectedClientUid === c.clientUid
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setSelectedClientUid(c.clientUid);
                      setSelectedAffirmationId(null);
                    }}
                  >
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
            {coachSideUsage && (
              <p className="text-xs text-gray-700 mt-2 leading-snug">
                今月の送信（テーマ共通）:{' '}
                <strong>
                  {coachSideUsage.used}/{coachSideUsage.quota}
                </strong>{' '}
                回・残り {coachSideUsage.remaining} 回（{coachSideUsage.monthKey}・東京）
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">共有中アファメーション</p>
            {affirmLoading ? (
              <p className="text-xs text-gray-500">読み込み中…</p>
            ) : affirmations.length === 0 ? (
              <p className="text-xs text-gray-500">表示できる文書がありません</p>
            ) : (
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {affirmations.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={`text-left text-xs w-full px-2 py-1 rounded ${
                        selectedAffirmationId === a.id
                          ? 'bg-gray-200 text-gray-900'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedAffirmationId(a.id)}
                    >
                      {a.title || a.id}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
