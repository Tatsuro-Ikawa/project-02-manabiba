'use client';

import { useState, useEffect } from 'react';
import { updateHomeReferenceLinks, type HomeReferenceLinkEntry } from '@/lib/firestore';

export interface ReferenceLinkItem {
  id: string;
  url: string;
  title: string;
  siteName: string;
  thumbnailUrl: string;
  order: number;
}

interface ReferenceLinksEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems?: ReferenceLinkItem[];
  onSaved?: () => void;
}

export default function ReferenceLinksEditModal({
  isOpen,
  onClose,
  initialItems = [],
  onSaved,
}: ReferenceLinksEditModalProps) {
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ReferenceLinkItem[]>(() =>
    initialItems.length > 0
      ? initialItems.map((it, idx) => ({ ...it, id: it.id || `row-${idx}-${Date.now()}` }))
      : [{ id: '1', url: '', title: '', siteName: '', thumbnailUrl: '', order: 1 }]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (initialItems.length > 0) {
      setItems(
        initialItems.map((it, idx) => ({ ...it, id: it.id || `row-${idx}-${Date.now()}` }))
      );
    } else {
      setItems([{ id: '1', url: '', title: '', siteName: '', thumbnailUrl: '', order: 1 }]);
    }
    setSaveError(null);
  }, [isOpen]);

  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        url: '',
        title: '',
        siteName: '',
        thumbnailUrl: '',
        order: prev.length + 1,
      },
    ]);
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleChange = (id: string, field: keyof ReferenceLinkItem, value: string | number) => {
    setFetchError(null);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleFetchFromUrl = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const url = item.url.trim();
    if (!url) {
      setFetchError('URL を入力してから「URLから情報を取得」を押してください。');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setFetchError('http または https の URL を入力してください。');
      return;
    }
    setFetchError(null);
    setFetchingId(id);
    try {
      const res = await fetch(`/api/article-ogp?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data?.error ?? '情報の取得に失敗しました。');
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                title: data.title ?? i.title,
                siteName: data.source ?? i.siteName,
                thumbnailUrl: data.thumbnail_url ?? i.thumbnailUrl,
              }
            : i
        )
      );
    } catch {
      setFetchError('通信エラーです。しばらくしてから再試行してください。');
    } finally {
      setFetchingId(null);
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const payload: HomeReferenceLinkEntry[] = items
        .filter((it) => (it.url || '').trim() !== '')
        .map(({ id: _id, ...rest }, idx) => ({
          url: rest.url.trim(),
          title: (rest.title || '').trim() || undefined,
          siteName: (rest.siteName || '').trim(),
          thumbnailUrl: (rest.thumbnailUrl || '').trim(),
          order: idx + 1,
        }));
      await updateHomeReferenceLinks(payload);
      onSaved?.();
      onClose();
    } catch (e) {
      console.error('ReferenceLinks save error:', e);
      setSaveError(
        e instanceof Error ? e.message : '保存に失敗しました。しばらくしてから再試行してください。'
      );
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
      aria-labelledby="reference-links-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="home-edit-modal-content">
        <div className="home-edit-modal-header">
          <h2 id="reference-links-modal-title" className="home-edit-modal-title">
            いちおしサイトの編集
          </h2>
          <button
            type="button"
            className="home-edit-modal-close"
            onClick={onClose}
            aria-label="閉じる"
          >
            <span className="material-symbols-outlined" aria-hidden>close</span>
          </button>
        </div>
        <div className="home-edit-modal-body">
          <p className="text-sm text-gray-600 mb-4">
            URL を入力し「URLから情報を取得」でタイトル・サイト名・サムネイルを自動入力できます（OGP 対応サイト）。
          </p>
          {saveError && (
            <p className="text-sm text-red-600 mb-2" role="alert">
              {saveError}
            </p>
          )}
          {fetchError && (
            <p className="text-sm text-red-600 mb-2" role="alert">
              {fetchError}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="home-edit-modal-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>タイトル</th>
                  <th>サイト名</th>
                  <th>サムネイルURL</th>
                  <th>並び</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="url"
                        value={item.url}
                        onChange={(e) => handleChange(item.id, 'url', e.target.value)}
                        className="home-edit-modal-input"
                        placeholder="https://..."
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleChange(item.id, 'title', e.target.value)}
                        className="home-edit-modal-input"
                        placeholder="タイトル"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.siteName}
                        onChange={(e) => handleChange(item.id, 'siteName', e.target.value)}
                        className="home-edit-modal-input"
                        placeholder="サイト名"
                      />
                    </td>
                    <td>
                      <input
                        type="url"
                        value={item.thumbnailUrl}
                        onChange={(e) => handleChange(item.id, 'thumbnailUrl', e.target.value)}
                        className="home-edit-modal-input"
                        placeholder="https://..."
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.order}
                        onChange={(e) =>
                          handleChange(item.id, 'order', parseInt(e.target.value, 10) || 0)
                        }
                        className="home-edit-modal-input w-14"
                        min={1}
                      />
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleFetchFromUrl(item.id)}
                          disabled={fetchingId !== null}
                          className="text-blue-600 hover:underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {fetchingId === item.id ? '取得中...' : 'URLから情報を取得'}
                        </button>
                        <span className="text-gray-400">|</span>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={handleAddRow}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            + 行を追加
          </button>
        </div>
        <div className="home-edit-modal-footer">
          <button type="button" onClick={onClose} className="home-edit-modal-btn secondary" disabled={saving}>
            キャンセル
          </button>
          <button type="button" onClick={handleSave} className="home-edit-modal-btn primary" disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
