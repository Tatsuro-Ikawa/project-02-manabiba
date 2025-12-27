"use client";

import React, { useState } from 'react';
import { UserType } from '@/types/themeSelection';
import { UserTypeSelector } from './UserTypeSelector';
import { ProblemList } from './ProblemList';
import { ProblemThemeSelector } from './ProblemThemeSelector';

interface ThemeEntry {
  text: string;
  category: string;
  metrics: Record<string, number>;
}

type FlowStep = 'user-type' | 'list-up' | 'select-theme' | 'complete';

export const ProblemFlow: React.FC = () => {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [step, setStep] = useState<FlowStep>('user-type');
  const [entries, setEntries] = useState<ThemeEntry[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<ThemeEntry | null>(null);
  const [remainingThemes, setRemainingThemes] = useState<ThemeEntry[]>([]);

  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type);
    setStep('list-up');
  };

  const handleListComplete = (newEntries: ThemeEntry[]) => {
    setEntries(newEntries);
    setStep('select-theme');
  };

  const handleThemeSelect = (theme: ThemeEntry, remaining: ThemeEntry[]) => {
    setSelectedTheme(theme);
    setRemainingThemes(remaining);
    setStep('complete');
  };

  const handleBack = () => {
    switch (step) {
      case 'list-up':
        setStep('user-type');
        break;
      case 'select-theme':
        setStep('list-up');
        break;
      default:
        break;
    }
  };

  const reset = () => {
    setUserType(null);
    setStep('user-type');
    setEntries([]);
    setSelectedTheme(null);
    setRemainingThemes([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">テーマ選択フロー</h1>
        <p className="text-sm md:text-base text-gray-600">Phase 3: 課題型実装の動作確認</p>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{
            width: step === 'user-type' ? '25%' :
                   step === 'list-up' ? '50%' :
                   step === 'select-theme' ? '75%' : '100%'
          }}
        ></div>
      </div>

      {/* ステップ表示 */}
      <div className="flex justify-center">
        <div className="flex space-x-4 text-sm">
          {[
            { key: 'user-type', label: 'タイプ選択' },
            { key: 'list-up', label: 'リストアップ' },
            { key: 'select-theme', label: 'テーマ選択' },
            { key: 'complete', label: '完了' }
          ].map((stepInfo, index) => (
            <div
              key={stepInfo.key}
              className={`px-3 py-1 rounded-full ${
                step === stepInfo.key
                  ? 'bg-blue-600 text-white'
                  : index < ['user-type', 'list-up', 'select-theme', 'complete'].indexOf(step)
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {stepInfo.label}
            </div>
          ))}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="border-2 border-gray-200 rounded-lg p-6">
        {step === 'user-type' && (
          <UserTypeSelector
            selectedType={userType}
            onSelect={handleUserTypeSelect}
          />
        )}

        {step === 'list-up' && userType && (
          <ProblemList
            userType={userType}
            onComplete={handleListComplete}
            onBack={handleBack}
          />
        )}

        {step === 'select-theme' && userType && (
          <ProblemThemeSelector
            userType={userType}
            entries={entries}
            onComplete={handleThemeSelect}
            onBack={handleBack}
          />
        )}

        {step === 'complete' && selectedTheme && (
          <div className="text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h2 className="text-xl font-bold text-gray-800">テーマ選択完了！</h2>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-3">選択されたテーマ</h3>
              <p className="text-gray-800 font-medium mb-2">{selectedTheme.text}</p>
              <p className="text-sm text-gray-600">カテゴリ: {selectedTheme.category}</p>
              <div className="flex justify-center space-x-4 mt-3 text-sm">
                {Object.entries(selectedTheme.metrics).map(([key, value]) => (
                  <span key={key} className="text-blue-600">
                    {key}: {value}
                  </span>
                ))}
              </div>
            </div>
            
            {remainingThemes.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">次点テーマ ({remainingThemes.length}件)</h4>
                <p className="text-sm text-blue-600">
                  これらのテーマは次点として保存されました。現在のテーマの計画が完了した後、次のテーマに取り組むことができます。
                </p>
                <div className="mt-3 space-y-2">
                  {remainingThemes.map((theme, index) => (
                    <div key={index} className="text-sm text-blue-700">
                      • {theme.text} ({theme.category})
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-gray-600">
              次のステップ: 目標設定（SMARTフレーミング）に進むことができます
            </p>
          </div>
        )}
      </div>

      {/* リセットボタン */}
      <div className="flex justify-center">
        <button
          onClick={reset}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          最初からやり直す
        </button>
      </div>

      {/* デバッグ情報 */}
      <div className="border-2 border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">デバッグ情報</h3>
        <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
          {JSON.stringify({
            step,
            userType,
            entriesCount: entries.length,
            selectedTheme: selectedTheme?.text,
            remainingThemesCount: remainingThemes.length
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};
