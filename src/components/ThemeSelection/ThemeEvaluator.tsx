"use client";

import React, { useState } from 'react';
import { UserType } from '@/types/themeSelection';
import { getCategoriesByUserType } from '@/constants/themeTemplates';

interface ThemeEntry {
  text: string;
  category: string;
  metrics: Record<string, number>;
}

interface ThemeEvaluatorProps {
  userType: UserType;
  entries: ThemeEntry[];
  onComplete: (selectedEntries: ThemeEntry[]) => void;
  onBack: () => void;
}

export const ThemeEvaluator: React.FC<ThemeEvaluatorProps> = ({
  userType,
  entries,
  onComplete,
  onBack
}) => {
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'category' | 'desire' | 'excitement' | 'feasibility'>('category');

  const categories = getCategoriesByUserType(userType);

  // エントリをカテゴリ別にグループ化
  const groupedEntries = entries.reduce((acc, entry, index) => {
    if (!acc[entry.category]) {
      acc[entry.category] = [];
    }
    acc[entry.category].push({ ...entry, index });
    return acc;
  }, {} as Record<string, Array<ThemeEntry & { index: number }>>);

  // ソート機能
  const sortEntries = (entries: Array<ThemeEntry & { index: number }>) => {
    return [...entries].sort((a, b) => {
      switch (sortBy) {
        case 'desire':
          return (b.metrics.desire || 0) - (a.metrics.desire || 0);
        case 'excitement':
          return (b.metrics.excitement || 0) - (a.metrics.excitement || 0);
        case 'feasibility':
          return (b.metrics.feasibility || 0) - (a.metrics.feasibility || 0);
        default:
          return 0;
      }
    });
  };

  const handleEntrySelect = (index: number) => {
    // 単一選択に変更
    setSelectedEntries(new Set([index]));
  };

  const handleSelectAll = () => {
    // 単一選択なので、すべて選択は無効化
    setSelectedEntries(new Set());
  };

  const handleComplete = () => {
    const selected = Array.from(selectedEntries).map(index => entries[index]);
    onComplete(selected);
  };

  const getMetricColor = (value: number) => {
    if (value >= 4) return 'text-green-600';
    if (value >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMetricLabel = (key: string) => {
    switch (key) {
      case 'desire': return 'やりたい度';
      case 'excitement': return 'ワクワク度';
      case 'feasibility': return '実現可能性';
      case 'severity': return '困り度';
      case 'frequency': return '頻度';
      default: return key;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">評価・分類</h2>
        <button 
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          onClick={onBack}
        >
          戻る
        </button>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-gray-700">
          <strong>ステップ 2:</strong> 追加した項目を確認し、取り組みたいテーマを選択してください
        </p>
        <p className="text-sm text-gray-600 mt-2">
          複数選択可能です。後で優先順位を決めることができます。
        </p>
      </div>

      {/* ソート・選択コントロール */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">ソート:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="category">カテゴリ順</option>
            <option value="desire">やりたい度順</option>
            <option value="excitement">ワクワク度順</option>
            <option value="feasibility">実現可能性順</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            選択中: {selectedEntries.size}件 (1件まで選択可能)
          </span>
        </div>
      </div>

      {/* カテゴリ別表示 */}
      <div className="space-y-6">
        {categories.map(category => {
          const categoryEntries = groupedEntries[category.name] || [];
          if (categoryEntries.length === 0) return null;

          const sortedEntries = sortEntries(categoryEntries);

          return (
            <div key={category.name} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {category.name} ({categoryEntries.length}件)
              </h3>
              
              <div className="space-y-3">
                {sortedEntries.map((entry) => (
                  <div
                    key={entry.index}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedEntries.has(entry.index)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleEntrySelect(entry.index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 mb-2">{entry.text}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          {Object.entries(entry.metrics).map(([key, value]) => (
                            <span
                              key={key}
                              className={`font-medium ${getMetricColor(value)}`}
                            >
                              {getMetricLabel(key)}: {value}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="ml-4">
                        {selectedEntries.has(entry.index) ? (
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 完了ボタン */}
      {selectedEntries.size > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6">
          <button
            onClick={handleComplete}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            テーマ選択に進む (1件選択中)
          </button>
        </div>
      )}
    </div>
  );
};
