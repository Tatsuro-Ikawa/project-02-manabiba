"use client";

import React, { useState, useEffect } from 'react';
import { UserType, ThemeSelectionStep } from '@/types/themeSelection';
import { UserTypeSelector } from './UserTypeSelector';
import { AspirationList } from './AspirationList';
import { ThemeSelector } from './ThemeSelector';
import { useThemeSelection } from '@/hooks/useThemeSelection';

interface AspirationFlowProps {
  onComplete?: () => void;
  onBack?: () => void;
}

export const AspirationFlow: React.FC<AspirationFlowProps> = ({
  onComplete,
  onBack
}) => {
  // セッションIDを固定して使用（既存のセッションと統一）
  const sessionId = 'aspiration_session';
  
  console.log('AspirationFlow - sessionId:', sessionId);
  
  const { 
    data, 
    loading, 
    error, 
    saving, 
    currentStep, 
    setUserType, 
    setStep, 
    selectTheme, 
    setCompleted 
  } = useThemeSelection(sessionId);
  
  const [localStep, setLocalStep] = useState<ThemeSelectionStep>('user-type');

  // データが読み込まれたらローカルステップを同期
  useEffect(() => {
    if (data && currentStep) {
      setLocalStep(currentStep);
    }
  }, [data, currentStep]);

  // ステップ変更を監視してローカルステップを同期
  useEffect(() => {
    if (currentStep) {
      setLocalStep(currentStep);
    }
  }, [currentStep]);

  // データの変更を監視
  useEffect(() => {
    console.log('AspirationFlow - data changed:', data);
  }, [data]);

  // ユーザータイプが既に設定されている場合はリストアップステップから開始
  useEffect(() => {
    if (data?.userType && data.userType === 'aspiration' && localStep === 'user-type') {
      setLocalStep('list-up');
    }
  }, [data?.userType, localStep]);

  const handleUserTypeSelect = async (type: UserType) => {
    await setUserType(type);
  };

  const handleListComplete = async () => {
    console.log('AspirationFlow - handleListComplete: current data:', data);
    console.log('AspirationFlow - handleListComplete: entries count:', data?.entries?.length);
    
    await setStep('select-theme');
    setLocalStep('select-theme');
    
    console.log('AspirationFlow - handleListComplete: after setStep, data:', data);
  };

  const handleThemeSelect = async (themeId: string) => {
    await selectTheme(themeId);
    await setCompleted(true);
    if (onComplete) {
      onComplete();
    }
  };

  const handleBack = () => {
    switch (localStep) {
      case 'list-up':
        setStep('user-type');
        break;
      case 'select-theme':
        setStep('list-up');
        break;
      default:
        if (onBack) {
          onBack();
        }
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">エラー: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* プログレスバー */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{
            width: localStep === 'user-type' ? '25%' :
                   localStep === 'list-up' ? '50%' :
                   localStep === 'select-theme' ? '75%' : '100%'
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
                localStep === stepInfo.key
                  ? 'bg-blue-600 text-white'
                  : index < ['user-type', 'list-up', 'select-theme', 'complete'].indexOf(localStep)
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
        {localStep === 'user-type' && (
          <UserTypeSelector
            selectedType={data?.userType || null}
            onSelect={handleUserTypeSelect}
          />
        )}

        {localStep === 'list-up' && data?.userType && (
          <AspirationList
            onComplete={handleListComplete}
            onBack={handleBack}
          />
        )}

        {localStep === 'select-theme' && data?.userType && (
          <ThemeSelector
            userType={data.userType}
            entries={data.entries}
            onComplete={handleThemeSelect}
            onBack={handleBack}
          />
        )}

        {localStep === 'complete' && data?.selectedTheme && (
          <div className="text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h2 className="text-xl font-bold text-gray-800">テーマ選択完了！</h2>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-3">選択されたテーマ</h3>
              {(() => {
                const selectedEntry = data.entries.find(entry => entry.id === data.selectedTheme);
                if (!selectedEntry) return null;
                return (
                  <>
                    <p className="text-gray-800 font-medium mb-2">{selectedEntry.text}</p>
                    <p className="text-sm text-gray-600">カテゴリ: {selectedEntry.category}</p>
                    <div className="flex justify-center space-x-4 mt-3 text-sm">
                      {Object.entries(selectedEntry.metrics).map(([key, value]) => (
                        <span key={key} className="text-blue-600">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
            
            {data.entries.filter(entry => entry.id !== data.selectedTheme).length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">次点テーマ ({data.entries.filter(entry => entry.id !== data.selectedTheme).length}件)</h4>
                <p className="text-sm text-blue-600">
                  これらのテーマは次点として保存されました。現在のテーマの計画が完了した後、次のテーマに取り組むことができます。
                </p>
                <div className="mt-3 space-y-2">
                  {data.entries.filter(entry => entry.id !== data.selectedTheme).map((theme, index) => (
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

      {/* 保存状態表示 */}
      {saving && (
        <div className="flex justify-center items-center p-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">保存中...</span>
        </div>
      )}

      {/* デバッグ情報 */}
      <div className="border-2 border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">デバッグ情報</h3>
        <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
          {JSON.stringify({
            localStep,
            currentStep,
            userType: data?.userType,
            entriesCount: data?.entries?.length || 0,
            entries: data?.entries?.map(entry => ({
              id: entry.id,
              text: entry.text,
              category: entry.category,
              metrics: entry.metrics
            })) || [],
            selectedTheme: data?.selectedTheme,
            completed: data?.completed,
            status: data?.status
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};
