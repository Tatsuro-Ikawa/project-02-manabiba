'use client';

import { useState, useEffect } from 'react';
import { isYouTubeUrl } from '@/lib/youtube';
import { updateHomeLatestVideos, type HomeLatestVideoEntry } from '@/lib/firestore';

export interface LatestVideoItem {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  order: number;
  /** 作成者名（ホーム表示用。編集フィールドには出さない） */
  author_name?: string;
  /** 作成者URL（ホーム表示用。編集フィールドには出さない） */
  author_url?: string;
}

interface LatestVideosEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 編集開始時に表示する既存データ（DB から取得した latestVideos） */
  initialItems?: LatestVideoItem[];
  /** 保存成功時に親で再取得するためのコールバック */
  onSaved?: () => void;
}

export default function LatestVideosEditModal({
  isOpen,
  onClose,
  initialItems = [],
  onSaved,
}: LatestVideosEditModalProps) {
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<LatestVideoItem[]>(
    initialItems.length > 0
      ? initialItems.map((it, idx) => ({ ...it, id: it.id || `row-${idx}-${Date.now()}` }))
      : [
          { id: '1', title: 'サンプル動画 1', url: 'https://example.com/1', thumbnailUrl: '', order: 1 },
          { id: '2', title: 'サンプル動画 2', url: 'https://example.com/2', thumbnailUrl: '', order: 2 },
          { id: '3', title: 'サンプル動画 3', url: 'https://example.com/3', thumbnailUrl: '', order: 3 },
        ]
  );

  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        title: '',
        url: '',
        thumbnailUrl: '',
        order: prev.length + 1,
        author_name: '',
        author_url: '',
      },
    ]);
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleChange = (id: string, field: keyof LatestVideoItem, value: string | number) => {
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
    if (!isYouTubeUrl(url)) {
      setFetchError('YouTube の URL（youtube.com または youtu.be）を入力してください。');
      return;
    }
    setFetchError(null);
    setFetchingId(id);
    try {
      const res = await fetch(`/api/youtube-oembed?url=${encodeURIComponent(url)}`);
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
                thumbnailUrl: data.thumbnail_url ?? i.thumbnailUrl,
                author_name: data.author_name ?? i.author_name ?? '',
                author_url: data.author_url ?? i.author_url ?? '',
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

  // モーダルを開いたときだけ initialItems でフォームを初期化（開いた時点のデータを使用）
  useEffect(() => {
    if (!isOpen) return;
    if (initialItems.length > 0) {
      setItems(
        initialItems.map((it, idx) => ({ ...it, id: it.id || `row-${idx}-${Date.now()}` }))
      );
    } else {
      setItems([
        { id: '1', title: '', url: '', thumbnailUrl: '', order: 1, author_name: '', author_url: '' },
      ]);
    }
    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 開いた瞬間の initialItems のみで初期化
  }, [isOpen]);

  const handleSave = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const payload: HomeLatestVideoEntry[] = items.map(({ id: _id, ...rest }) => ({
        url: rest.url,
        title: rest.title,
        thumbnailUrl: rest.thumbnailUrl,
        order: rest.order,
        author_name: rest.author_name || undefined,
        author_url: rest.author_url || undefined,
      }));
      await updateHomeLatestVideos(payload);
      onSaved?.();
      onClose();
    } catch (e) {
      console.error('LatestVideos save error:', e);
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
      aria-labelledby="latest-videos-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="home-edit-modal-content">
        <div className="home-edit-modal-header">
          <h2 id="latest-videos-modal-title" className="home-edit-modal-title">
            最新動画の編集
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
            YouTube の URL を貼り付け、「URLから情報を取得」でタイトル・サムネイル・作成者を自動入力できます。
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
                        placeholder="動画タイトル"
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
