'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listActiveCoachAssignmentsForCoach,
  resolveClientUidFromAssignmentDoc,
} from '@/lib/coachAffirmationShare';
import { getUserProfile } from '@/lib/firestore';

type ClientRow = { clientUid: string; label: string };

type Props = {
  open: boolean;
  coachUid: string;
  currentClientUid: string | null;
  onClose: () => void;
  onShare: (clientUid: string) => void;
  onClear: () => void;
};

export default function CoachClientPickerModal({
  open,
  coachUid,
  currentClientUid,
  onClose,
  onShare,
  onClear,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const effectiveSelectedUid = selectedUid ?? currentClientUid ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const assignments = await listActiveCoachAssignmentsForCoach(coachUid);
      const enriched: ClientRow[] = [];
      for (const a of assignments) {
        const clientUid = resolveClientUidFromAssignmentDoc(coachUid, a.id, a.data.clientUid);
        const prof = await getUserProfile(clientUid);
        const label = prof?.displayName || prof?.email || clientUid;
        enriched.push({ clientUid, label });
      }
      setRows(enriched);
      setSelectedUid((prev) => prev ?? currentClientUid ?? (enriched[0]?.clientUid ?? null));
    } catch (e) {
      console.error(e);
      setError('クライアント一覧の取得に失敗しました。割当（coach_client_assignments）を確認してください。');
      setRows([]);
      setSelectedUid(null);
    } finally {
      setLoading(false);
    }
  }, [coachUid, currentClientUid]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const canShare = useMemo(() => !!effectiveSelectedUid, [effectiveSelectedUid]);
  const canClear = useMemo(() => !!currentClientUid, [currentClientUid]);

  if (!open) return null;

  return (
    <div
      className="affirmation-create-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="クライアント一覧"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="affirmation-create-modal affirmation-select-modal">
        <div className="affirmation-create-modal-header">
          <div className="affirmation-create-modal-header-text">
            <div className="text-sm font-semibold">クライアント一覧</div>
          </div>
          <button
            type="button"
            className="affirmation-modal-icon-btn"
            aria-label="閉じる"
            onClick={onClose}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="affirmation-create-modal-body">
          <p className="text-sm text-gray-700 mb-3">共有するクライアントを選択してください。</p>
          {error && (
            <p className="text-sm text-red-600 mb-2" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-gray-600">読み込み中…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-600">共有できるクライアントがありません。</p>
          ) : (
            <div className="affirmation-select-table-wrap">
              <table className="affirmation-select-table" aria-label="クライアント一覧">
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>選択</th>
                    <th>クライアント名</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const selected = effectiveSelectedUid === r.clientUid;
                    return (
                      <tr
                        key={r.clientUid}
                        className={selected ? 'selected' : undefined}
                        onClick={() => setSelectedUid(r.clientUid)}
                      >
                        <td className="text-center">{selected ? '✓' : ''}</td>
                        <td>{r.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="affirmation-select-modal-footer">
          <div className="affirmation-select-modal-footer-row">
            <button
              type="button"
              className="affirmation-select-modal-primary-btn"
              disabled={!canShare}
              onClick={() => {
                if (!effectiveSelectedUid) return;
                onShare(effectiveSelectedUid);
              }}
            >
              共有
            </button>
            <button
              type="button"
              className="affirmation-select-modal-secondary-btn"
              disabled={!canClear}
              onClick={onClear}
            >
              解除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

