"use client";

import React, { useState } from 'react';
import { UserType } from '@/types/themeSelection';
import { getCategoriesByUserType, getUserTypePrompt } from '@/constants/themeTemplates';
import { CategorySelector } from './CategorySelector';
import { useThemeSelection } from '@/hooks/useThemeSelection';
import {
  HIERARCHY_ATTRIBUTES,
  COMPONENT_ATTRIBUTES,
  RESPONSIVE_ATTRIBUTES,
  LAYOUT_ATTRIBUTES,
  STATE_ATTRIBUTES,
  FUNCTION_ATTRIBUTES,
  INTERACTION_ATTRIBUTES,
  CONTENT_ATTRIBUTES,
  createDataAttributes
} from '@/constants/DataAttributesRegulation';

interface AspirationListProps {
  onComplete: () => void;
  onBack: () => void;
}

export const AspirationList: React.FC<AspirationListProps> = ({
  onComplete,
  onBack
}) => {
  // セッションIDを固定して使用
  const sessionId = 'aspiration_session';
  const { data, addEntry, updateEntry, deleteEntry, setStep } = useThemeSelection(sessionId);
  const userType = data?.userType || 'aspiration';
  const [currentText, setCurrentText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState({
    desire: 3,
    excitement: 3,
    feasibility: 3
  });
  const entries = data?.entries || [];
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  // デバッグ用ログ
  console.log('AspirationList - data:', data);
  console.log('AspirationList - entries:', entries);
  console.log('AspirationList - entries.length:', entries.length);

  const categories = getCategoriesByUserType(userType);

  const handleAddEntry = async () => {
    if (!currentText.trim() || !selectedCategory) return;

    console.log('AspirationList - Adding entry:', {
      text: currentText.trim(),
      category: selectedCategory,
      metrics: { ...currentMetrics },
      userType
    });

    await addEntry({
      text: currentText.trim(),
      category: selectedCategory,
      metrics: { ...currentMetrics },
      userType
    });

    console.log('AspirationList - Entry added, current entries:', data?.entries);

    setCurrentText('');
    setSelectedCategory(null);
    setCurrentMetrics({
      desire: 3,
      excitement: 3,
      feasibility: 3
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

  const aspirationListAttrs = createDataAttributes({
    'data-hierarchy': HIERARCHY_ATTRIBUTES.APP_WORKSPACE,
    'data-component': 'aspiration-list',
    'data-responsive': RESPONSIVE_ATTRIBUTES.ALL_DEVICES,
    'data-layout': LAYOUT_ATTRIBUTES.FLEX_CONTAINER,
    'data-function': FUNCTION_ATTRIBUTES.THEME_SELECTION
  });

  return (
    <div 
      {...aspirationListAttrs}
      className="space-y-6"
    >
      <div 
        {...createDataAttributes({
          'data-content': 'list-header',
          'data-layout': LAYOUT_ATTRIBUTES.FLEX_BETWEEN
        })}
        className="flex items-center justify-between"
      >
        <h2 
          {...createDataAttributes({
            'data-content': 'list-title',
            'data-function': 'aspiration-list-title'
          })}
          className="text-xl font-bold text-gray-800"
        >
          やりたいことをリストアップ
        </h2>
        <button 
          {...createDataAttributes({
            'data-interaction': INTERACTION_ATTRIBUTES.CLICKABLE,
            'data-function': 'back-button'
          })}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          onClick={handleBack}
        >
          戻る
        </button>
      </div>

      {/* 入力フォーム */}
      <div 
        {...createDataAttributes({
          'data-content': 'input-form',
          'data-function': 'aspiration-input'
        })}
        className="space-y-4"
      >
        <div 
          {...createDataAttributes({
            'data-content': 'form-field'
          })}
        >
          <label 
            {...createDataAttributes({
              'data-content': 'field-label',
              'data-function': 'user-type-prompt'
            })}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {getUserTypePrompt(userType)}
          </label>
          
          {/* アコーディオン */}
          <div className="mb-4">
            <button
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
              className="w-full flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200"
            >
              <span className="text-blue-800 font-medium">詳細を読む</span>
              <span className={`text-blue-800 transition-transform duration-200 ${isAccordionOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            {isAccordionOpen && (
              <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-gray-700 leading-relaxed">
                  やりたいことがあるのになかなか実現できない。<br />
                  でも、大丈夫、まず、やりたいという意欲そのものが達成に向けた<br />
                  一番のこころのエネルギーだからです。<br /><br />
                  さて、何からてをつけたらいいでしょうか？<br />
                  こころ道場では、まず、自分のやりたいことは何かをさらに明確に<br />
                  していくことから始めます。<br /><br />
                  今、やりたいとおもっていること、あるいは実際に取り組んでいるが<br />
                  なかなか実現しないということをリストアップします。<br />
                  次の入力欄に<br /><br />
                  「○○したい。」、「○○を△△したい」といったように短い文章でリストアップ<br />
                  してみましょう。
                </p>
              </div>
            )}
          </div>
          <textarea
            {...createDataAttributes({
              'data-content': 'text-input',
              'data-interaction': INTERACTION_ATTRIBUTES.FOCUSABLE,
              'data-function': 'aspiration-textarea'
            })}
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            placeholder="例: 英語を話せるようになりたい"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            rows={3}
          />
        </div>

        {/* カテゴリ選択ボタン */}
        <div 
          {...createDataAttributes({
            'data-content': 'category-selector',
            'data-layout': LAYOUT_ATTRIBUTES.GRID_CONTAINER,
            'data-function': 'category-selection'
          })}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
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
                  実現したい度 (1-5)
                </label>
                <div className="max-w-md">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={currentMetrics.desire}
                    onChange={(e) => handleMetricsChange('desire', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>1 (低い)</span>
                    <span className="font-medium text-blue-600">{currentMetrics.desire}</span>
                    <span>5 (高い)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ワクワク度 (1-5)
                </label>
                <div className="max-w-md">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={currentMetrics.excitement}
                    onChange={(e) => handleMetricsChange('excitement', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>1 (低い)</span>
                    <span className="font-medium text-blue-600">{currentMetrics.excitement}</span>
                    <span>5 (高い)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  実現可能性 (1-5)
                </label>
                <div className="max-w-md">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={currentMetrics.feasibility}
                    onChange={(e) => handleMetricsChange('feasibility', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>1 (低い)</span>
                    <span className="font-medium text-blue-600">{currentMetrics.feasibility}</span>
                    <span>5 (高い)</span>
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
                      <span className="text-xs text-blue-600">
                        やりたい度: {entry.metrics.desire}
                      </span>
                      <span className="text-xs text-purple-600">
                        ワクワク度: {entry.metrics.excitement}
                      </span>
                      <span className="text-xs text-green-600">
                        実現可能性: {entry.metrics.feasibility}
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
