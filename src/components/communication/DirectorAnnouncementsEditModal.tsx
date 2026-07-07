'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AffirmationMarkdownView } from '@/components/common/AffirmationMarkdownView';
import {
  DIRECTOR_ANNOUNCEMENT_BODY_MAX_LENGTH,
  DIRECTOR_ANNOUNCEMENT_TITLE_MAX_LENGTH,
} from '@/lib/communicationConstants';
import {
  buildDraftInput,
  buildPublishNowInput,
  buildScheduledInput,
  createDirectorAnnouncement,
  deleteDirectorAnnouncement,
  directorAnnouncementDisplayDate,
  directorAnnouncementStatusLabel,
  fetchAllDirectorAnnouncementsAdmin,
  updateDirectorAnnouncement,
  type DirectorAnnouncement,
} from '@/lib/directorAnnouncements';

type ViewMode = 'list' | 'edit';

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

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface DirectorAnnouncementsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorUid: string;
  onSaved?: () => void;
}

export default function DirectorAnnouncementsEditModal({
  isOpen,
  onClose,
  authorUid,
  onSaved,
}: DirectorAnnouncementsEditModalProps) {
  const [view, setView] = useState<ViewMode>('list');
  const [items, setItems] = useState<DirectorAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [scheduledAtLocal, setScheduledAtLocal] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState('');

  const isDirty = useMemo(() => {
    const snap = JSON.stringify({ title, bodyMarkdown, scheduledAtLocal, editingId });
    return snap !== initialSnapshot;
  }, [title, bodyMarkdown, scheduledAtLocal, editingId, initialSnapshot]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllDirectorAnnouncementsAdmin();
      setItems(rows);
    } catch (e) {
      console.error('fetchAllDirectorAnnouncementsAdmin error:', e);
      setError('一覧の読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setView('list');
    setEditingId(null);
    setTitle('');
    setBodyMarkdown('');
    setScheduledAtLocal('');
    setInitialSnapshot('');
    setError(null);
    void loadItems();
  }, [isOpen, loadItems]);

  const openEdit = (row: DirectorAnnouncement | null) => {
    if (row) {
      setEditingId(row.id);
      setTitle(row.title);
      setBodyMarkdown(row.bodyMarkdown);
      const sched = row.scheduledAt ?? row.postedAt;
      setScheduledAtLocal(sched ? toDatetimeLocalValue(sched) : '');
    } else {
      setEditingId(null);
      setTitle('');
      setBodyMarkdown('');
      setScheduledAtLocal('');
    }
    const snap = JSON.stringify({
      title: row?.title ?? '',
      bodyMarkdown: row?.bodyMarkdown ?? '',
      scheduledAtLocal: row?.scheduledAt || row?.postedAt ? toDatetimeLocalValue(row.scheduledAt ?? row.postedAt!) : '',
      editingId: row?.id ?? null,
    });
    setInitialSnapshot(snap);
    setView('edit');
    setError(null);
  };

  const handleBack = () => {
    if (isDirty && !window.confirm('入力中の内容を破棄して一覧に戻りますか？')) return;
    setView('list');
    setError(null);
  };

  const handleClose = () => {
    if (view === 'edit' && isDirty && !window.confirm('入力中の内容を破棄して閉じますか？')) return;
    onClose();
  };

  const persist = async (
    mode: 'draft' | 'publish' | 'schedule'
  ): Promise<boolean> => {
    setError(null);
    setSaving(true);
    try {
      let input;
      if (mode === 'draft') {
        input = buildDraftInput(title, bodyMarkdown);
      } else if (mode === 'publish') {
        input = buildPublishNowInput(title, bodyMarkdown);
      } else {
        const sched = fromDatetimeLocalValue(scheduledAtLocal);
        if (!sched) {
          setError('予約公開の日時を指定してください。');
          return false;
        }
        input = buildScheduledInput(title, bodyMarkdown, sched);
      }

      if (editingId) {
        await updateDirectorAnnouncement(editingId, input, authorUid);
      } else {
        await createDirectorAnnouncement(input, authorUid);
      }
      await loadItems();
      onSaved?.();
      setView('list');
      setInitialSnapshot('');
      return true;
    } catch (e) {
      console.error('director announcement save error:', e);
      setError(e instanceof Error ? e.message : '保存に失敗しました。');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!window.confirm('このお知らせを削除しますか？')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteDirectorAnnouncement(editingId);
      await loadItems();
      onSaved?.();
      setView('list');
    } catch (e) {
      console.error('deleteDirectorAnnouncement error:', e);
      setError(e instanceof Error ? e.message : '削除に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromList = async (id: string) => {
    if (!window.confirm('このお知らせを削除しますか？')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteDirectorAnnouncement(id);
      await loadItems();
      onSaved?.();
    } catch (e) {
      console.error('deleteDirectorAnnouncement error:', e);
      setError(e instanceof Error ? e.message : '削除に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="home-edit-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="director-announcements-modal-title"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`home-edit-modal-content director-announcements-edit-modal${view === 'edit' ? ' director-announcements-edit-modal--wide' : ''}`}
      >
        <div className="home-edit-modal-header">
          <h2 id="director-announcements-modal-title" className="home-edit-modal-title">
            {view === 'list' ? '館長からの編集' : editingId ? 'お知らせを編集' : 'お知らせを新規作成'}
          </h2>
          <button
            type="button"
            className="home-edit-modal-close"
            onClick={handleClose}
            aria-label="閉じる"
            disabled={saving}
          >
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </div>

        <div className="home-edit-modal-body">
          {error && (
            <p className="text-sm text-red-600 mb-2" role="alert">
              {error}
            </p>
          )}

          {view === 'list' && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                新着順（更新日時）で一覧表示します。各行の「編集」から本文を編集し、下書き保存・公開・予約公開を行えます。
              </p>
              {loading ? (
                <p className="text-sm text-gray-500">読み込み中…</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="home-edit-modal-table">
                    <thead>
                      <tr>
                        <th>タイトル</th>
                        <th>状態</th>
                        <th>掲載日時</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-sm text-gray-500">
                            お知らせはまだありません。
                          </td>
                        </tr>
                      ) : (
                        items.map((row) => {
                          const displayDate = directorAnnouncementDisplayDate(row);
                          return (
                            <tr key={row.id}>
                              <td>{row.title || '（無題）'}</td>
                              <td>{directorAnnouncementStatusLabel(row.status)}</td>
                              <td>{displayDate ? formatJstYmdHm(displayDate) : '—'}</td>
                              <td>
                                <div className="flex flex-wrap items-center gap-1">
                                  <button
                                    type="button"
                                    className="text-blue-600 hover:underline text-sm"
                                    onClick={() => openEdit(row)}
                                    disabled={saving}
                                  >
                                    編集
                                  </button>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    type="button"
                                    className="text-red-600 hover:underline text-sm"
                                    onClick={() => void handleRemoveFromList(row.id)}
                                    disabled={saving}
                                  >
                                    削除
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <button
                type="button"
                onClick={() => openEdit(null)}
                className="mt-2 text-sm text-blue-600 hover:underline"
                disabled={saving || loading}
              >
                + 新規追加
              </button>
            </>
          )}

          {view === 'edit' && (
            <>
              <div className="director-announcement-edit-title-row">
                <label htmlFor="director-announcement-title" className="affirmation-create-modal-label">
                  タイトル
                </label>
                <input
                  id="director-announcement-title"
                  type="text"
                  className="home-edit-modal-input director-announcement-title-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, DIRECTOR_ANNOUNCEMENT_TITLE_MAX_LENGTH))}
                  maxLength={DIRECTOR_ANNOUNCEMENT_TITLE_MAX_LENGTH}
                  placeholder="お知らせの見出し"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {title.length} / {DIRECTOR_ANNOUNCEMENT_TITLE_MAX_LENGTH} 文字
                </p>
              </div>

              <div className="affirmation-edit-modal-body-row director-announcement-edit-body-row">
                <div className="affirmation-edit-modal-editor-col">
                  <label htmlFor="director-announcement-body" className="affirmation-create-modal-label">
                    本文（Markdown）
                  </label>
                  <textarea
                    id="director-announcement-body"
                    className="affirmation-edit-body-textarea"
                    value={bodyMarkdown}
                    onChange={(e) =>
                      setBodyMarkdown(e.target.value.slice(0, DIRECTOR_ANNOUNCEMENT_BODY_MAX_LENGTH))
                    }
                    maxLength={DIRECTOR_ANNOUNCEMENT_BODY_MAX_LENGTH}
                    rows={14}
                    spellCheck={false}
                  />
                  <p className="affirmation-edit-char-hint text-xs text-gray-500 mt-1">
                    {bodyMarkdown.length} / {DIRECTOR_ANNOUNCEMENT_BODY_MAX_LENGTH} 文字
                  </p>
                </div>
                <div className="affirmation-preview affirmation-create-modal-preview affirmation-edit-modal-preview-col">
                  <div className="affirmation-preview-title">プレビュー</div>
                  <AffirmationMarkdownView markdown={bodyMarkdown} className="affirmation-preview-body" />
                </div>
              </div>

              <div className="director-announcement-schedule-row">
                <label htmlFor="director-announcement-scheduled-at" className="affirmation-create-modal-label">
                  予約公開日時（JST）
                </label>
                <input
                  id="director-announcement-scheduled-at"
                  type="datetime-local"
                  className="home-edit-modal-input"
                  value={scheduledAtLocal}
                  onChange={(e) => setScheduledAtLocal(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  「予約公開」ボタンで使用します。即時公開の場合は空のままで「公開」を押してください。
                </p>
              </div>
            </>
          )}
        </div>

        <div className="home-edit-modal-footer">
          {view === 'list' ? (
            <button type="button" onClick={handleClose} className="home-edit-modal-btn secondary" disabled={saving}>
              閉じる
            </button>
          ) : (
            <>
              <button type="button" onClick={handleBack} className="home-edit-modal-btn secondary" disabled={saving}>
                一覧に戻る
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="home-edit-modal-btn secondary text-red-600"
                  disabled={saving}
                >
                  削除
                </button>
              )}
              <button
                type="button"
                onClick={() => void persist('draft')}
                className="home-edit-modal-btn secondary"
                disabled={saving}
              >
                {saving ? '保存中…' : '下書き保存'}
              </button>
              <button
                type="button"
                onClick={() => void persist('schedule')}
                className="home-edit-modal-btn secondary"
                disabled={saving}
              >
                {saving ? '保存中…' : '予約公開'}
              </button>
              <button
                type="button"
                onClick={() => void persist('publish')}
                className="home-edit-modal-btn primary"
                disabled={saving}
              >
                {saving ? '保存中…' : '公開'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
