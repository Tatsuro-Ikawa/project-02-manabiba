'use client';

import React, { useState } from 'react';
import { SelfUnderstandingEntry, SelfUnderstandingSection } from '@/types/selfUnderstanding';

interface SelfUnderstandingTableProps {
  entries: SelfUnderstandingEntry[];
  section: SelfUnderstandingSection;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (newOrder: SelfUnderstandingEntry[]) => Promise<void>;
  loading?: boolean;
}

const SelfUnderstandingTable: React.FC<SelfUnderstandingTableProps> = ({
  entries,
  section,
  onUpdate,
  onDelete,
  onReorder,
  loading = false,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // 編集開始
  const handleEditStart = (entry: SelfUnderstandingEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
  };

  // 編集保存
  const handleEditSave = async () => {
    if (!editingId || !editContent.trim()) return;

    try {
      setUpdating(true);
      await onUpdate(editingId, editContent.trim());
      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('更新エラー:', error);
      alert('更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  // 編集キャンセル
  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  // 削除確認
  const handleDelete = async (id: string, content: string) => {
    if (!confirm(`この項目を削除しますか？\n\n削除される情報:\n- 内容: ${content}\n- 関連する付加情報（進捗状況、期限設定など）\n- 編集履歴\n\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      setDeleting(id);
      await onDelete(id);
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    } finally {
      setDeleting(null);
    }
  };

  // 順序変更（ドラッグ&ドロップの簡易版）
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    
    const newOrder = [...entries];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    
    // orderフィールドを正しく更新
    newOrder[index].order = index;
    newOrder[index - 1].order = index + 1;
    
    await onReorder(newOrder);
  };

  const handleMoveDown = async (index: number) => {
    if (index === entries.length - 1) return;
    
    const newOrder = [...entries];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    
    // orderフィールドを正しく更新
    newOrder[index].order = index + 2;
    newOrder[index + 1].order = index + 1;
    
    await onReorder(newOrder);
  };



  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="animate-pulse">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="divide-y divide-gray-200">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900">項目一覧</h3>
      </div>
      
      {entries.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-500">
          まだ項目がありません
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  順序
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  内容
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  作成日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry, index) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{entry.order}</span>
                      <div className="flex flex-col space-y-1">
                        {entries.length > 1 && (
                          <>
                            <button
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => handleMoveDown(index)}
                              disabled={index === entries.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ▼
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {editingId === entry.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          rows={3}
                          maxLength={500}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={handleEditSave}
                            disabled={updating}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {updating ? '保存中...' : '保存'}
                          </button>
                          <button
                            onClick={handleEditCancel}
                            disabled={updating}
                            className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:opacity-50"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{entry.content}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.createdAt.toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {editingId !== entry.id && (
                        <button
                          onClick={() => handleEditStart(entry)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          編集
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(entry.id, entry.content)}
                        disabled={deleting === entry.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deleting === entry.id ? '削除中...' : '削除'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SelfUnderstandingTable;
