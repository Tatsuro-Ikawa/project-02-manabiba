'use client';

import React, { useState } from 'react';
import { useSelfUnderstanding } from '@/hooks/useSelfUnderstanding';
import { SelfUnderstandingSection } from '@/types/selfUnderstanding';
import SelfUnderstandingTable from './SelfUnderstandingTable';

const SelfUnderstanding: React.FC = () => {
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

  const sections = [
    { key: 'aspirations' as const, title: 'やりたいこと', description: 'やりたいこと、なりたい自分を書き出してみましょう' },
    { key: 'values' as const, title: '大切にしていること', description: 'あなたが大切にしている価値観を書き出してみましょう' },
    { key: 'strengths' as const, title: '得意なこと', description: 'あなたの得意なこと、自信があることを書き出してみましょう' },
    { key: 'weaknesses' as const, title: '改善したい事', description: '改善したい、成長したいと思う点を書き出してみましょう' },
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

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">自分を知る</h2>
      
      {/* セクション選択 */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.key}
              onClick={() => setCurrentSection(section.key)}
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

      {/* 現在のセクション */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {sections.find(s => s.key === currentSection)?.title}
        </h3>
        {currentSection === 'aspirations' && (
          <>
            <p className="text-gray-600 mb-4">
              {sections.find(s => s.key === currentSection)?.description}
            </p>
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
          </>
        )}
        {currentSection !== 'aspirations' && (
          <p className="text-gray-600 mb-4">
            {sections.find(s => s.key === currentSection)?.description}
          </p>
        )}

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

        {/* テーブル表示 */}
        <SelfUnderstandingTable
          entries={currentEntries}
          section={currentSection}
          onUpdate={handleUpdateEntry}
          onDelete={handleDeleteEntry}
          onReorder={handleReorderEntries}
          loading={saving}
        />
      </div>

      {/* 進捗表示 */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">進捗状況</h4>
        <div className="grid grid-cols-5 gap-2">
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
    </div>
  );
};

export default SelfUnderstanding;
