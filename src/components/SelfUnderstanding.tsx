'use client';

import React, { useState } from 'react';
import { useSelfUnderstanding } from '@/hooks/useSelfUnderstanding';
import { SelfUnderstandingSection } from '@/types/selfUnderstanding';
import SelfUnderstandingTable from './SelfUnderstandingTable';
import { AspirationList } from './ThemeSelection/AspirationList';
import { ProblemList } from './ThemeSelection/ProblemList';
import { ThemeSelector } from './ThemeSelection/ThemeSelector';
import { ProblemThemeSelector } from './ThemeSelection/ProblemThemeSelector';
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
  ID_ATTRIBUTES,
  createDataAttributes
} from '@/constants/DataAttributesRegulation';

interface SelfUnderstandingProps {
  currentStep?: 'list-up' | 'theme-selection';
  userType?: 'aspiration' | 'problem';
  onThemeSelectionComplete?: () => void;
}

const SelfUnderstanding: React.FC<SelfUnderstandingProps> = ({ 
  currentStep = 'list-up', 
  userType = 'aspiration',
  onThemeSelectionComplete
}) => {
  const {
    data,
    loading,
    error,
    saving,
    addEntry,
    updateEntry,
    deleteEntry,
    reorderEntries,
  } = useSelfUnderstanding();

  const [currentSection, setCurrentSection] = useState<SelfUnderstandingSection>('aspirations');
  const [inputValue, setInputValue] = useState('');
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showThemeSelection, setShowThemeSelection] = useState(false);
  const [themeSelectionType, setThemeSelectionType] = useState<'aspiration' | 'problem' | null>(null);
  
  // テーマ選択用のフック
  const sessionId = userType === 'aspiration' ? 'aspiration_session' : 'problem_session';
  const { data: themeData, selectTheme } = useThemeSelection(sessionId);
  const entries = themeData?.entries || [];

  const sections = [
    { key: 'aspirations' as const, title: 'やりたいこと', description: 'やりたいこと、なりたい自分を書き出してみましょう' },
    { key: 'problems' as const, title: '改善したいこと', description: '改善したい、解決したい問題を書き出してみましょう' },
    { key: 'values' as const, title: '大切にしていること', description: 'あなたが大切にしている価値観を書き出してみましょう' },
    { key: 'resource' as const, title: 'いま自分にあるもの', description: 'いま自分にあるものや事柄、時間、お金、能力、人脈、経験などを書き出してみましょう' }
  ];

  const handleAddItem = async () => {
    if (!inputValue.trim() || adding) return;

    try {
      setAdding(true);
      await addEntry(currentSection, inputValue.trim());
      setInputValue('');
    } catch (error) {
      console.error('追加エラー:', error);
      alert('項目の追加に失敗しました');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateEntry = async (id: string, content: string) => {
    await updateEntry(currentSection, id, content);
  };

  const handleDeleteEntry = async (id: string) => {
    await deleteEntry(currentSection, id);
  };

  const handleStartThemeSelection = (type: 'aspiration' | 'problem') => {
    setThemeSelectionType(type);
    setShowThemeSelection(true);
  };

  const handleThemeSelectionComplete = () => {
    setShowThemeSelection(false);
    setThemeSelectionType(null);
    // テーマ選択完了後、目標設定タブに遷移
    if (onThemeSelectionComplete) {
      onThemeSelectionComplete();
    }
  };

  const handleBackFromThemeSelection = () => {
    setShowThemeSelection(false);
    setThemeSelectionType(null);
  };

  const handleSectionChange = (section: SelfUnderstandingSection) => {
    setCurrentSection(section);
    
    // やりたいことタブを選択した場合
    if (section === 'aspirations') {
      setThemeSelectionType('aspiration');
      setShowThemeSelection(true);
    }
    // 改善したいことタブを選択した場合
    else if (section === 'problems') {
      setThemeSelectionType('problem');
      setShowThemeSelection(true);
    }
    // その他のタブを選択した場合
    else {
      setShowThemeSelection(false);
      setThemeSelectionType(null);
    }
  };

  const handleReorderEntries = async (newOrder: any[]) => {
    await reorderEntries(currentSection, newOrder);
  };

  const currentEntries = data?.entries[currentSection] || [];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-red-600">
          <p className="mb-4">エラーが発生しました</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // 現在のステップに応じて表示するコンテンツを決定
  const renderCurrentStep = () => {
    if (currentStep === 'list-up') {
      if (userType === 'aspiration') {
        return (
          <AspirationList
            onComplete={() => {
              console.log('願望リストアップ完了');
              // テーマ選択画面に遷移
              window.location.href = '/mypage?tab=theme-selection';
            }}
            onBack={() => {
              console.log('戻る');
            }}
          />
        );
      } else if (userType === 'problem') {
        return (
          <ProblemList
            onComplete={() => {
              console.log('課題リストアップ完了');
              // テーマ選択画面に遷移
              window.location.href = '/mypage?tab=theme-selection';
            }}
            onBack={() => {
              console.log('戻る');
            }}
          />
        );
      }
    } else if (currentStep === 'theme-selection') {
      if (userType === 'aspiration') {
        return (
          <ThemeSelector
            userType="aspiration"
            entries={entries || []}
            selectedThemeId={themeData?.selectedTheme}
            onComplete={async (themeId: string) => {
              console.log('願望テーマ選択完了:', themeId);
              // Firestoreにテーマを保存
              await selectTheme(themeId);
              console.log('テーマをFirestoreに保存しました');
              // 目標設定画面に遷移（handleThemeSelectionCompleteを呼び出す）
              handleThemeSelectionComplete();
            }}
            onBack={() => {
              console.log('戻る');
              handleBackFromThemeSelection();
            }}
          />
        );
      } else if (userType === 'problem') {
        return (
          <ProblemThemeSelector
            userType="problem"
            entries={entries || []}
            selectedThemeId={themeData?.selectedTheme}
            onComplete={async (themeId: string) => {
              console.log('課題テーマ選択完了:', themeId);
              // Firestoreにテーマを保存
              await selectTheme(themeId);
              console.log('テーマをFirestoreに保存しました');
              // 目標設定画面に遷移（handleThemeSelectionCompleteを呼び出す）
              handleThemeSelectionComplete();
            }}
            onBack={() => {
              console.log('戻る');
              handleBackFromThemeSelection();
            }}
          />
        );
      }
    }
    
    return null;
  };

  const mainContainerAttrs = createDataAttributes({
    'data-id': ID_ATTRIBUTES.MAIN_CONTENT,
    'data-hierarchy': HIERARCHY_ATTRIBUTES.APP_WORKSPACE,
    'data-component': COMPONENT_ATTRIBUTES.MAIN_CONTENT,
    'data-responsive': RESPONSIVE_ATTRIBUTES.ALL_DEVICES,
    'data-layout': LAYOUT_ATTRIBUTES.FLEX_CONTAINER,
    'data-function': userType === 'aspiration' ? FUNCTION_ATTRIBUTES.THEME_SELECTION : FUNCTION_ATTRIBUTES.PDCA_INPUT
  });

  return (
    <div 
      {...mainContainerAttrs}
      className="bg-white rounded-lg shadow-lg p-6"
    >
      <h2 
        {...createDataAttributes({
          'data-content': 'section-title',
          'data-function': userType === 'aspiration' ? 'aspiration-title' : 'problem-title'
        })}
        className="text-xl font-semibold text-gray-800 mb-4"
      >
        {userType === 'aspiration' ? '願いを実現したい' : '課題を解決したい'}
      </h2>
      
      {/* 現在のステップ表示 */}
      <div 
        {...createDataAttributes({
          'data-content': 'step-indicator',
          'data-layout': LAYOUT_ATTRIBUTES.FLEX_CONTAINER
        })}
        className="mb-6"
      >
        <div 
          {...createDataAttributes({
            'data-content': 'step-items',
            'data-layout': LAYOUT_ATTRIBUTES.FLEX_CONTAINER
          })}
          className="flex items-center space-x-4"
        >
          <div 
            {...createDataAttributes({
              'data-content': 'step-item',
              'data-state': currentStep === 'list-up' ? STATE_ATTRIBUTES.ACTIVE : STATE_ATTRIBUTES.INACTIVE,
              'data-function': 'list-up-step'
            })}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentStep === 'list-up' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {userType === 'aspiration' ? '願望のリストアップ' : '課題のリストアップ'}
          </div>
          <div 
            {...createDataAttributes({
              'data-content': 'step-separator'
            })}
            className="text-gray-400"
          >
            →
          </div>
          <div 
            {...createDataAttributes({
              'data-content': 'step-item',
              'data-state': currentStep === 'theme-selection' ? STATE_ATTRIBUTES.ACTIVE : STATE_ATTRIBUTES.INACTIVE,
              'data-function': 'theme-selection-step'
            })}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentStep === 'theme-selection' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {userType === 'aspiration' ? '願望のテーマ選択' : '課題のテーマ選択'}
          </div>
        </div>
      </div>

      {/* 現在のステップのコンテンツ */}
      <div 
        {...createDataAttributes({
          'data-content': 'step-content',
          'data-state': currentStep === 'list-up' ? 'list-up-active' : 'theme-selection-active'
        })}
        className="mb-6"
      >
        {renderCurrentStep()}
      </div>

      {/* 従来のセクション選択（一時的に非表示） */}
      {false && (
        <>
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {sections.map((section) => (
                <button
                  key={section.key}
                  onClick={() => handleSectionChange(section.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    currentSection === section.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {sections.find(s => s.key === currentSection)?.title}
            </h3>
            
            {/* やりたいこと、改善したいことの場合はテーマ選択フローを直接表示 */}
            {(currentSection === 'aspirations' || currentSection === 'problems') ? (
              <div className="mt-4">
                {currentSection === 'aspirations' && (
                  <AspirationList
                    onComplete={() => {
                      console.log('願望型テーマ選択完了');
                      // ここでテーマ選択完了後の処理を実装予定
                    }}
                    onBack={() => {
                      setShowThemeSelection(false);
                      setThemeSelectionType(null);
                    }}
                  />
                )}
                {currentSection === 'problems' && (
                  <ProblemList
                    onComplete={() => {
                      console.log('課題型テーマ選択完了');
                      // ここでテーマ選択完了後の処理を実装予定
                    }}
                    onBack={() => {
                      setShowThemeSelection(false);
                      setThemeSelectionType(null);
                    }}
                  />
                )}
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  {sections.find(s => s.key === currentSection)?.description}
                </p>

                {/* 入力フォーム */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                    placeholder="新しい項目を入力..."
                    maxLength={500}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  />
                  <button
                    onClick={handleAddItem}
                    disabled={adding || !inputValue.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {adding ? '追加中...' : '追加'}
                  </button>
                </div>

                {/* 文字数制限表示 */}
                <div className="text-xs text-gray-500 mb-4">
                  {inputValue.length}/500文字
                </div>

                {/* テーブル表示（大切にしていること、いま自分にあるもののみ） */}
                <SelfUnderstandingTable
                  entries={currentEntries}
                  section={currentSection}
                  onUpdate={handleUpdateEntry}
                  onDelete={handleDeleteEntry}
                  onReorder={handleReorderEntries}
                  loading={saving}
                />
              </>
            )}
          </div>

          {/* 進捗表示 */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">進捗状況</h4>
            <div className="grid grid-cols-4 gap-2">
              {sections.map((section) => {
                const entryCount = data?.entries[section.key]?.length || 0;
                return (
                  <div key={section.key} className="text-center">
                    <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-medium ${
                      entryCount > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {entryCount}
                    </div>
                    <span className="text-xs text-gray-600">{section.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SelfUnderstanding;
