'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminEndCoachClientAssignment,
  adminSetCoachClientAssignment,
  listActiveCoachClientAssignments,
  type CoachClientAssignment,
} from '@/lib/coachAffirmationShare';
import {
  filterUsersByPartialQuery,
  formatUserAdminLabel,
  listCoachRoleUsers,
  listUnassignedPremiumClients,
} from '@/lib/adminUserLookup';
import { getUserProfile } from '@/lib/firestore';
import type { UserProfile } from '@/types/auth';

type AssignmentRow = {
  id: string;
  data: CoachClientAssignment;
  coachLabel: string;
  clientLabel: string;
};

function formatAssignedAt(data: CoachClientAssignment): string {
  const t = data.assignedAt;
  if (!t || typeof t.toDate !== 'function') return '—';
  try {
    return t.toDate().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  } catch {
    return '—';
  }
}

function UserPickList({
  id,
  users,
  selectedUid,
  emptyText,
  onSelect,
  disabled,
}: {
  id: string;
  users: UserProfile[];
  selectedUid: string | null;
  emptyText: string;
  onSelect: (u: UserProfile) => void;
  disabled?: boolean;
}) {
  if (users.length === 0) {
    return <p className="text-sm text-gray-600 mt-1">{emptyText}</p>;
  }
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="候補一覧"
      className="mt-2 border border-gray-300 rounded text-sm"
      style={{ maxHeight: '14rem', overflowY: 'auto' }}
    >
      {users.map((u) => {
        const selected = u.uid === selectedUid;
        return (
          <li key={u.uid}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              disabled={disabled}
              className={`w-full text-left px-2 py-1.5 border-b border-gray-100 last:border-b-0 ${
                selected ? 'bg-amber-50 font-medium' : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelect(u)}
            >
              {formatUserAdminLabel(u)}
              <span className="text-gray-500 ml-1">[{u.role}]</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function CoachClientAssignmentAdmin() {
  const [coachFilter, setCoachFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [coachCatalog, setCoachCatalog] = useState<UserProfile[]>([]);
  const [clientCatalog, setClientCatalog] = useState<UserProfile[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [coach, setCoach] = useState<UserProfile | null>(null);
  const [client, setClient] = useState<UserProfile | null>(null);

  const [filterCoachQuery, setFilterCoachQuery] = useState('');
  const [filterCoachUid, setFilterCoachUid] = useState<string | null>(null);
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filteredCoaches = useMemo(
    () => filterUsersByPartialQuery(coachCatalog, coachFilter),
    [coachCatalog, coachFilter]
  );
  const filteredClients = useMemo(
    () => filterUsersByPartialQuery(clientCatalog, clientFilter),
    [clientCatalog, clientFilter]
  );

  const clientRoleWarning = useMemo(() => {
    if (!client) return null;
    if (client.role === 'user') return null;
    return `選択中のクライアントの role は「${client.role}」です（通常は user）。テスト用に続行できます。`;
  }, [client]);

  const loadCatalogs = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const [coaches, clients] = await Promise.all([
        listCoachRoleUsers(),
        listUnassignedPremiumClients(),
      ]);
      setCoachCatalog(coaches);
      setClientCatalog(clients);
      setCoach((prev) => (prev && coaches.some((c) => c.uid === prev.uid) ? prev : null));
      setClient((prev) => (prev && clients.some((c) => c.uid === prev.uid) ? prev : null));
    } catch (e) {
      console.error(e);
      setCatalogError(
        'コーチ／未割当プレミアム一覧の取得に失敗しました。管理者権限と Firestore ルールを確認してください。'
      );
      setCoachCatalog([]);
      setClientCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadList = useCallback(async (coachUidFilter?: string | null) => {
    setListLoading(true);
    setListError(null);
    try {
      const assignments = await listActiveCoachClientAssignments(
        coachUidFilter ? { coachUid: coachUidFilter } : undefined
      );
      const enriched: AssignmentRow[] = [];
      for (const a of assignments) {
        const [coachProf, clientProf] = await Promise.all([
          getUserProfile(a.data.coachUid),
          getUserProfile(a.data.clientUid),
        ]);
        enriched.push({
          id: a.id,
          data: a.data,
          coachLabel: coachProf ? formatUserAdminLabel(coachProf) : a.data.coachUid,
          clientLabel: clientProf ? formatUserAdminLabel(clientProf) : a.data.clientUid,
        });
      }
      enriched.sort((x, y) => x.coachLabel.localeCompare(y.coachLabel, 'ja'));
      setRows(enriched);
    } catch (e) {
      console.error(e);
      setListError('割当一覧の取得に失敗しました。管理者権限と Firestore ルールを確認してください。');
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList(null);
    void loadCatalogs();
  }, [loadList, loadCatalogs]);

  const handleAssign = async () => {
    if (!coach || !client) {
      setMessage('コーチとクライアントを一覧から選択してください。');
      return;
    }
    if (clientRoleWarning) {
      const ok = window.confirm(
        `${clientRoleWarning}\n\nコーチ（${formatUserAdminLabel(coach)}）とクライアント（${formatUserAdminLabel(client)}）を紐づけます。よろしいですか？`
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(
        `コーチ（${formatUserAdminLabel(coach)}）とクライアント（${formatUserAdminLabel(client)}）を紐づけます。よろしいですか？`
      );
      if (!ok) return;
    }

    setBusy(true);
    setMessage(null);
    try {
      let result = await adminSetCoachClientAssignment({
        coachUid: coach.uid,
        clientUid: client.uid,
        allowReplace: false,
      });

      if (!result.ok && result.code === 'NEEDS_REPLACE') {
        let oldLabel = result.existingCoachUid ?? '不明';
        if (result.existingCoachUid) {
          const oldProf = await getUserProfile(result.existingCoachUid);
          if (oldProf) oldLabel = formatUserAdminLabel(oldProf);
        }
        const replaceOk = window.confirm(
          `このクライアントには既に担当コーチ（${oldLabel}）がいます。解除して（${formatUserAdminLabel(coach)}）に付け替えますか？`
        );
        if (!replaceOk) {
          setMessage('付け替えをキャンセルしました。');
          return;
        }
        result = await adminSetCoachClientAssignment({
          coachUid: coach.uid,
          clientUid: client.uid,
          allowReplace: true,
        });
      }

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      const actionMsg =
        result.action === 'already_active'
          ? 'すでに有効な割当です。'
          : result.action === 'reactivated'
            ? '割当を再開しました。'
            : result.action === 'replaced'
              ? '既存の担当を解除し、新しいコーチに付け替えました。'
              : '割当を作成しました。';
      setMessage(actionMsg);
      setClient(null);
      await Promise.all([loadList(filterCoachUid), loadCatalogs()]);
    } catch (e) {
      console.error(e);
      setMessage(e instanceof Error ? e.message : '紐づけに失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const handleEnd = async (row: AssignmentRow) => {
    const ok = window.confirm(
      `この割当を終了します。コーチ側の共有ピッカーから消えます。よろしいですか？\n\nコーチ: ${row.coachLabel}\nクライアント: ${row.clientLabel}`
    );
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await adminEndCoachClientAssignment(row.data.coachUid, row.data.clientUid);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMessage('割当を終了しました。');
      await Promise.all([loadList(filterCoachUid), loadCatalogs()]);
    } catch (e) {
      console.error(e);
      setMessage(e instanceof Error ? e.message : '解除に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const handleApplyFilter = async () => {
    const q = filterCoachQuery.trim();
    if (!q) {
      setFilterCoachUid(null);
      await loadList(null);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const matched = filterUsersByPartialQuery(coachCatalog, q);
      if (matched.length === 0) {
        setMessage('フィルタ用のコーチが見つかりません（コーチ一覧の部分一致）。');
        return;
      }
      if (matched.length > 1) {
        setMessage(
          `フィルタが複数件に一致しました（${matched.length}件）。より具体的な文字で絞り込んでください。`
        );
        return;
      }
      setFilterCoachUid(matched[0].uid);
      await loadList(matched[0].uid);
    } catch (e) {
      console.error(e);
      setMessage('フィルタの適用に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="morning-evening-container">
      <div className="trial-tab-heading-row">
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>コーチ↔クライアント割当</h1>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        管理者のみ操作できます。表示名・メールは運用識別用です。ユーザーの気づきノート本文などはここから開きません。
      </p>

      {message ? (
        <p className="text-sm text-gray-800 mb-3" role="status">
          {message}
        </p>
      ) : null}

      <div className="action-sub-section" data-section="admin-assign-create">
        <h3>新規紐づけ</h3>
        {catalogLoading ? (
          <p className="text-sm text-gray-600 mb-2">候補一覧を読み込み中…</p>
        ) : null}
        {catalogError ? <p className="text-sm text-red-700 mb-2">{catalogError}</p> : null}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" htmlFor="admin-coach-filter">
            コーチ（role: coach / senior_coach）
          </label>
          <p className="text-xs text-gray-500 mb-1">
            一覧から選択。フィルタは表示名・メール・UID の部分一致です。
          </p>
          <input
            id="admin-coach-filter"
            type="text"
            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
            style={{ maxWidth: '28rem' }}
            value={coachFilter}
            onChange={(e) => setCoachFilter(e.target.value)}
            placeholder="部分一致で絞り込み…"
            disabled={busy || catalogLoading}
          />
          <UserPickList
            id="admin-coach-list"
            users={filteredCoaches}
            selectedUid={coach?.uid ?? null}
            emptyText={
              coachCatalog.length === 0
                ? 'コーチロールのユーザーがいません。'
                : 'フィルタに一致するコーチがいません。'
            }
            onSelect={setCoach}
            disabled={busy}
          />
          {coach ? (
            <p className="text-sm text-gray-700 mt-1">選択中: {formatUserAdminLabel(coach)}</p>
          ) : null}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" htmlFor="admin-client-filter">
            クライアント（プレミアム・担当コーチ未割当）
          </label>
          <p className="text-xs text-gray-500 mb-1">
            プレミアムコースかつ active 割当がないユーザーのみ表示します。必要なら部分一致で絞り込みできます。
          </p>
          <input
            id="admin-client-filter"
            type="text"
            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
            style={{ maxWidth: '28rem' }}
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            placeholder="部分一致で絞り込み（任意）…"
            disabled={busy || catalogLoading}
          />
          <UserPickList
            id="admin-client-list"
            users={filteredClients}
            selectedUid={client?.uid ?? null}
            emptyText={
              clientCatalog.length === 0
                ? '未割当のプレミアムクライアントはいません。'
                : 'フィルタに一致するクライアントがいません。'
            }
            onSelect={setClient}
            disabled={busy}
          />
          {client ? (
            <p className="text-sm text-gray-700 mt-1">選択中: {formatUserAdminLabel(client)}</p>
          ) : null}
          {clientRoleWarning ? (
            <p className="text-sm text-amber-800 mt-1">{clientRoleWarning}</p>
          ) : null}
        </div>

        <button
          type="button"
          className="trial-action-btn"
          disabled={busy || !coach || !client}
          onClick={() => void handleAssign()}
        >
          {busy ? '処理中…' : '紐づける'}
        </button>
      </div>

      <div className="action-sub-section" data-section="admin-assign-list">
        <h3>有効な割当一覧</h3>
        <div className="mb-3" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <label className="text-sm" htmlFor="admin-filter-coach">
            コーチでフィルタ
          </label>
          <input
            id="admin-filter-coach"
            type="text"
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            style={{ minWidth: '14rem', flex: '1 1 10rem' }}
            value={filterCoachQuery}
            onChange={(e) => setFilterCoachQuery(e.target.value)}
            placeholder="空欄で全件 / 部分一致"
            disabled={busy || listLoading}
          />
          <button
            type="button"
            className="trial-action-btn"
            disabled={busy || listLoading}
            onClick={() => void handleApplyFilter()}
          >
            適用
          </button>
          <button
            type="button"
            className="trial-action-btn"
            disabled={busy || listLoading}
            onClick={() => {
              setFilterCoachQuery('');
              setFilterCoachUid(null);
              void loadList(null);
            }}
          >
            クリア
          </button>
        </div>

        {listLoading ? <p className="text-sm text-gray-600">読み込み中…</p> : null}
        {listError ? <p className="text-sm text-red-700">{listError}</p> : null}

        {!listLoading && !listError && rows.length === 0 ? (
          <p className="text-sm text-gray-600">有効な割当はありません。</p>
        ) : null}

        {rows.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="text-sm w-full border-collapse" style={{ minWidth: '36rem' }}>
              <thead>
                <tr className="border-b border-gray-300 text-left">
                  <th className="py-2 pr-3 font-medium">コーチ</th>
                  <th className="py-2 pr-3 font-medium">クライアント</th>
                  <th className="py-2 pr-3 font-medium">開始</th>
                  <th className="py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-200 align-top">
                    <td className="py-2 pr-3">{row.coachLabel}</td>
                    <td className="py-2 pr-3">{row.clientLabel}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatAssignedAt(row.data)}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="trial-action-btn"
                        disabled={busy}
                        onClick={() => void handleEnd(row)}
                      >
                        解除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
