"use client";

import React, { useState } from 'react';

import { getCategoriesByUserType, getUserTypePrompt } from '@/constants/themeTemplates';
import { useThemeSelection } from '@/hooks/useThemeSelection';

interface ProblemListProps {
  onComplete: () => void;
  onBack: () => void;
}

export const ProblemList: React.FC<ProblemListProps> = ({
  onComplete,
  onBack
}) => {
  // セッションIDを固定して使用
  const sessionId = 'problem_session';
  const { data, addEntry, updateEntry, deleteEntry, setStep } = useThemeSelection(sessionId);
  const userType = data?.userType || 'problem';
  const [currentText, setCurrentText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState({
    severity: 3,
    frequency: 3
  });
  const entries = data?.entries || [];

  const categories = getCategoriesByUserType(userType);

  const handleAddEntry = async () => {
    if (!currentText.trim() || !selectedCategory) return;

    await addEntry({
      text: currentText.trim(),
      category: selectedCategory,
      metrics: { ...currentMetrics },
      userType
    });

    setCurrentText('');
    setSelectedCategory(null);
    setCurrentMetrics({
      severity: 3,
      frequency: 3
    });
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleMetricsChange = (key: string, value: number) => {
    setCurrentMetrics(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleComplete = async () => {
    await setStep('select-theme');
    onComplete();
  };

  const handleBack = () => {
    onBack();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">改善したいことをリストアップ</h2>
        <button 
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          onClick={handleBack}
        >
          戻る
        </button>
      </div>

      {/* 入力フォーム */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {getUserTypePrompt(userType)}
          </label>
          <textarea
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            placeholder="例: 職場の人間関係で悩んでいる、完璧主義で自分を責めてしまう"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            rows={3}
          />
        </div>

        {/* カテゴリ選択ボタン */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map(category => (
            <button
              key={category.name}
              onClick={() => handleCategorySelect(category.name)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                selectedCategory === category.name 
                  ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm text-gray-700'
              }`}
            >
              <span className="font-medium text-sm">{category.name}</span>
            </button>
          ))}
        </div>

        {/* 評価スライダー */}
        {selectedCategory && (
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800">評価してください</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  困り度 (1-5)
                </label>
                <div className="max-w-md">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={currentMetrics.severity}
                    onChange={(e) => handleMetricsChange('severity', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>1 (軽い)</span>
                    <span className="font-medium text-blue-600">{currentMetrics.severity}</span>
                    <span>5 (深刻)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  頻度 (1-5)
                </label>
                <div className="max-w-md">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={currentMetrics.frequency}
                    onChange={(e) => handleMetricsChange('frequency', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>1 (稀)</span>
                    <span className="font-medium text-blue-600">{currentMetrics.frequency}</span>
                    <span>5 (頻繁)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 追加ボタン */}
        <button
          onClick={handleAddEntry}
          disabled={!currentText.trim() || !selectedCategory}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          追加
        </button>
      </div>

      {/* 追加されたエントリ一覧 */}
      {entries.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            追加された項目
          </h3>
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{entry.text}</p>
                    <p className="text-sm text-gray-600">カテゴリ: {entry.category}</p>
                    <div className="flex space-x-4 mt-1">
                      <span className="text-xs text-red-600">
                        困り度: {entry.metrics.severity}
                      </span>
                      <span className="text-xs text-orange-600">
                        頻度: {entry.metrics.frequency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={handleComplete}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            次へ ({entries.length}件)
          </button>
        </div>
      )}
    </div>
  );
};
