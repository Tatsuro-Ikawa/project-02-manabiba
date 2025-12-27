"use client";

import React, { useState, useMemo } from 'react';
import { UserType } from '@/types/themeSelection';
import {
  ID_ATTRIBUTES,
  CONTENT_ATTRIBUTES,
  INTERACTION_ATTRIBUTES,
  createDataAttributes
} from '@/constants/DataAttributesRegulation';

interface ThemeEntry {
  id: string;
  text: string;
  category: string;
  metrics: Record<string, number>;
}

interface ProblemThemeSelectorProps {
  userType: UserType;
  entries: ThemeEntry[];
  selectedThemeId?: string;
  onComplete: (themeId: string) => void;
  onBack: () => void;
}

export const ProblemThemeSelector: React.FC<ProblemThemeSelectorProps> = ({
  userType,
  entries,
  selectedThemeId,
  onComplete,
  onBack
}) => {
  // 保存されたテーマIDから初期選択インデックスを復元
  const initialIndex = selectedThemeId 
    ? entries.findIndex(entry => entry.id === selectedThemeId)
    : null;
  
  const [selectedIndex, setSelectedIndex] = useState<number | null>(initialIndex !== -1 ? initialIndex : null);
  const [reason, setReason] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<ThemeEntry | null>(null);

  const getMetricColor = (value: number) => {
    if (value >= 4) return 'text-red-600';
    if (value >= 3) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedEntries = useMemo(() => {
    if (!sortField) return entries;
    
    return [...entries].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'text':
          aValue = a.text.toLowerCase();
          bValue = b.text.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'severity':
          aValue = a.metrics.severity || 0;
          bValue = b.metrics.severity || 0;
          break;
        case 'frequency':
          aValue = a.metrics.frequency || 0;
          bValue = b.metrics.frequency || 0;
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [entries, sortField, sortDirection]);

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <span className="text-gray-400">↕</span>;
    }
    return sortDirection === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
  };

  const handleEdit = (index: number) => {
    const originalIndex = entries.findIndex(e => e === sortedEntries[index]);
    setEditingIndex(originalIndex);
    setEditingData({ ...entries[originalIndex] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editingData) {
      entries[editingIndex] = { ...editingData };
      setEditingIndex(null);
      setEditingData(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingData(null);
  };

  const handleEditChange = (field: string, value: any) => {
    if (editingData) {
      if (field.startsWith('metrics.')) {
        const metricKey = field.split('.')[1];
        setEditingData({
          ...editingData,
          metrics: {
            ...editingData.metrics,
            [metricKey]: value
          }
        });
      } else {
        setEditingData({
          ...editingData,
          [field]: value
        });
      }
    }
  };

  const getMetricLabel = (key: string) => {
    switch (key) {
      case 'severity': return '困り度';
      case 'frequency': return '頻度';
      default: return key;
    }
  };

  const handleComplete = () => {
    if (selectedIndex !== null) {
      const selectedTheme = entries[selectedIndex];
      
      // テーマ変更の確認
      if (selectedThemeId && selectedThemeId !== selectedTheme.id) {
        const currentThemeEntry = entries.find(e => e.id === selectedThemeId);
        const currentThemeText = currentThemeEntry?.text || '現在のテーマ';
        
        const confirmed = window.confirm(
          `テーマを変更します。\n\n` +
          `現在のテーマ: 「${currentThemeText}」\n` +
          `新しいテーマ: 「${selectedTheme.text}」\n\n` +
          `テーマを変更した場合は新しい目標設定が始まります。\n` +
          `（すでに目標設定している場合は編集画面になります。）\n\n` +
          `続けますか？`
        );
        
        if (!confirmed) {
          return;
        }
      }
      
      onComplete(selectedTheme.id || selectedIndex.toString());
    }
  };

  const getAdviceText = () => {
    return (
      <div className="bg-orange-50 p-4 rounded-lg">
        <h4 className="font-semibold text-orange-800 mb-2">選択のアドバイス</h4>
        <ul className="text-sm text-orange-700 space-y-1">
          <li>• 「これさえ解決できたら…」と思うことを選んでみましょう</li>
          <li>• 無理に完璧なテーマを選ばなくてOKです</li>
          <li>• 「一番小さく取り組めそうなもの」を選んでみましょう</li>
          <li>• 「気になったけどスルーできなかった項目」がヒントかも</li>
          <li>• 解決じゃなく、「眺めてみるだけ」でも十分な変化が起きます</li>
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Step 2: テーマ選択</h2>
        <button 
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          onClick={onBack}
        >
          戻る
        </button>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-gray-700">
          <strong>ステップ 2:</strong> 一番取り組みたいテーマを選んでください
        </p>
        <p className="text-sm text-gray-600 mt-2">
          最終的にどれに取り組むかは、あなた自身で決めてください。
          選択しなかったテーマは次点として保存され、後で計画できます。
        </p>
      </div>

      {/* アドバイス */}
      {getAdviceText()}

      {/* テーブル形式のテーマ選択 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">
          選択してください ({entries.length}件から選択)
        </h3>
        
        <div 
          {...createDataAttributes({
            'data-content': CONTENT_ATTRIBUTES.GOAL_STEP_CONTENT,
            'data-interaction': INTERACTION_ATTRIBUTES.SCROLLABLE
          })}
          className="overflow-x-auto"
        >
          <table 
            {...createDataAttributes({
              'data-id': ID_ATTRIBUTES.PROBLEM_THEME_SELECTOR_TABLE,
              'data-content': 'theme-table'
            })}
            className="border-collapse border border-gray-300"
            style={{ minWidth: '900px', width: '100%' }}
          >
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700">
                  選択
                </th>
                <th 
                  className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('text')}
                >
                  <div className="flex items-center space-x-1">
                    <span>テーマ</span>
                    {getSortIcon('text')}
                  </div>
                </th>
                <th 
                  className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center space-x-1">
                    <span>カテゴリ</span>
                    {getSortIcon('category')}
                  </div>
                </th>
                <th 
                  className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('severity')}
                >
                  <div className="flex items-center space-x-1">
                    <span>困り度</span>
                    {getSortIcon('severity')}
                  </div>
                </th>
                <th 
                  className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('frequency')}
                >
                  <div className="flex items-center space-x-1">
                    <span>頻度</span>
                    {getSortIcon('frequency')}
                  </div>
                </th>
                <th className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, index) => {
                const originalIndex = entries.findIndex(e => e === entry);
                return (
                <tr
                  key={index}
                  className={`cursor-pointer transition-all ${
                    selectedIndex === originalIndex
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedIndex(originalIndex)}
                >
                  <td className="border border-gray-300 p-3 text-center">
                    {selectedIndex === originalIndex ? (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full mx-auto"></div>
                    )}
                  </td>
                  <td className="border border-gray-300 p-3">
                    <div className="max-w-xs">
                      {editingIndex === originalIndex ? (
                        <textarea
                          value={editingData?.text || ''}
                          onChange={(e) => handleEditChange('text', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded text-sm text-gray-900"
                          rows={2}
                        />
                      ) : (
                        <p className="font-medium text-gray-800 text-sm">{entry.text}</p>
                      )}
                    </div>
                  </td>
                  <td className="border border-gray-300 p-3">
                    {editingIndex === originalIndex ? (
                      <select
                        value={editingData?.category || ''}
                        onChange={(e) => handleEditChange('category', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm text-gray-900"
                      >
                        <option value="人間関係">人間関係</option>
                        <option value="自己評価">自己評価</option>
                        <option value="感情">感情</option>
                        <option value="行動パターン">行動パターン</option>
                        <option value="過去の出来事">過去の出来事</option>
                      </select>
                    ) : (
                      <span className="text-sm text-gray-600">{entry.category}</span>
                    )}
                  </td>
                  <td className="border border-gray-300 p-3 text-center">
                    {editingIndex === originalIndex ? (
                      <select
                        value={editingData?.metrics.severity || 0}
                        onChange={(e) => handleEditChange('metrics.severity', parseInt(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded text-sm text-gray-900"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    ) : (
                      <span className={`font-medium text-sm ${getMetricColor(entry.metrics.severity || 0)}`}>
                        {entry.metrics.severity || 0}
                      </span>
                    )}
                  </td>
                  <td className="border border-gray-300 p-3 text-center">
                    {editingIndex === originalIndex ? (
                      <select
                        value={editingData?.metrics.frequency || 0}
                        onChange={(e) => handleEditChange('metrics.frequency', parseInt(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded text-sm text-gray-900"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    ) : (
                      <span className={`font-medium text-sm ${getMetricColor(entry.metrics.frequency || 0)}`}>
                        {entry.metrics.frequency || 0}
                      </span>
                    )}
                  </td>
                  <td className="border border-gray-300 p-3 text-center">
                    {editingIndex === originalIndex ? (
                      <div className="flex space-x-1">
                        <button
                          onClick={handleSaveEdit}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(index)}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        編集
                      </button>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 選択理由の入力 */}
      {selectedIndex !== null && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            なぜこのテーマを選んだのですか？（任意）
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="選択理由を記入してください..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>
      )}

      {/* 完了ボタン */}
      {selectedIndex !== null && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6">
          <button
            onClick={handleComplete}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
          >
            このテーマで目標設定に進む
          </button>
        </div>
      )}
    </div>
  );
};
