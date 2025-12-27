"use client";

import React, { useState } from 'react';
import { UserType } from '@/types/themeSelection';
import { UserTypeSelector } from './UserTypeSelector';
import { CategorySelector } from './CategorySelector';
import { MetricInput } from './MetricInput';
import { 
  getCategoriesByUserType, 
  getMetricsByUserType, 
  getUserTypePrompt 
} from '@/constants/themeTemplates';

export const ThemeSelectionTest: React.FC = () => {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [step, setStep] = useState<'user-type' | 'category' | 'metrics'>('user-type');

  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type);
    setStep('category');
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setStep('metrics');
  };

  const handleMetricChange = (key: string, value: number) => {
    setMetrics(prev => ({ ...prev, [key]: value }));
  };

  const reset = () => {
    setUserType(null);
    setSelectedCategory(null);
    setMetrics({});
    setStep('user-type');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">テーマ選択機能テスト</h1>
        <p className="text-gray-600">Phase 1: 基盤構築の動作確認</p>
      </div>

      <div className="border-2 border-gray-200 rounded-lg p-6">
          {step === 'user-type' && (
            <UserTypeSelector
              selectedType={userType}
              onSelect={handleUserTypeSelect}
            />
          )}

          {step === 'category' && userType && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">ステップ 2: カテゴリ選択</h2>
                <button 
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  onClick={() => setStep('user-type')}
                >
                  戻る
                </button>
              </div>
              <CategorySelector
                categories={getCategoriesByUserType(userType)}
                selectedCategory={selectedCategory}
                onSelect={handleCategorySelect}
              />
            </div>
          )}

          {step === 'metrics' && userType && selectedCategory && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">ステップ 3: 評価</h2>
                <button 
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  onClick={() => setStep('category')}
                >
                  戻る
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-4">
                  <strong>選択されたカテゴリ:</strong> {selectedCategory}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>プロンプト:</strong> {getUserTypePrompt(userType)}
                </p>
              </div>
              <MetricInput
                metrics={getMetricsByUserType(userType)}
                values={metrics}
                onChange={handleMetricChange}
              />
            </div>
          )}

          <div className="flex justify-center pt-6">
            <button 
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              onClick={reset}
            >
              リセット
            </button>
          </div>
        </div>

      {/* デバッグ情報 */}
      <div className="border-2 border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">デバッグ情報</h3>
        <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
          {JSON.stringify({
            userType,
            selectedCategory,
            metrics,
            step
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};
