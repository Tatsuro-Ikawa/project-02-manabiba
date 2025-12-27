"use client";

import React, { useState } from 'react';
import { 
  Info, 
  Help, 
  Lightbulb, 
  Book, 
  TipsAndUpdates,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';

interface InfoItem {
  id: string;
  title: string;
  content: string;
  type: 'tip' | 'help' | 'guide' | 'info';
  expanded?: boolean;
}

interface InfoAreaProps {
  className?: string;
  currentStep?: string;
  userType?: string;
}

const InfoArea: React.FC<InfoAreaProps> = ({ 
  className = '', 
  currentStep = 'list-up',
  userType = 'aspiration'
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getStepSpecificInfo = (): InfoItem[] => {
    const baseInfo: InfoItem[] = [
      {
        id: 'general-tip',
        title: '入力のコツ',
        content: '具体的で詳細な内容を記入することで、より効果的な分析が可能になります。感情や体験も含めて記録しましょう。',
        type: 'tip'
      },
      {
        id: 'save-info',
        title: '自動保存について',
        content: '入力内容は自動的に保存されます。途中で離脱しても、次回同じ画面で続きから作業できます。',
        type: 'info'
      }
    ];

    // ステップ別の情報
    const stepSpecificInfo: { [key: string]: InfoItem[] } = {
      'list-up': [
        {
          id: 'list-tip',
          title: 'リストアップのポイント',
          content: userType === 'aspiration' 
            ? '願望は「〜したい」「〜になりたい」という形で記入してください。具体的な行動や状態を想像しながら書くと効果的です。'
            : '課題は「〜で困っている」「〜を改善したい」という形で記入してください。現在の状況と理想の状況の差を明確にしましょう。',
          type: 'guide'
        },
        {
          id: 'list-example',
          title: '記入例',
          content: userType === 'aspiration'
            ? '例：「健康的な生活を送りたい」「新しいスキルを身につけたい」「人間関係を深めたい」'
            : '例：「時間管理が苦手」「コミュニケーション能力を向上させたい」「ストレスを減らしたい」',
          type: 'help'
        }
      ],
      'theme-selection': [
        {
          id: 'theme-tip',
          title: 'テーマ選択のポイント',
          content: '最も重要で、具体的に取り組めそうなテーマを選択してください。複数のテーマがある場合は、優先順位を考えて1つに絞りましょう。',
          type: 'guide'
        },
        {
          id: 'theme-criteria',
          title: '選択基準',
          content: '・現在の状況で取り組めるもの\n・具体的な行動に落とし込めるもの\n・自分にとって重要なもの\n・期限を設定できるもの',
          type: 'help'
        }
      ],
      'goals': [
        {
          id: 'goal-tip',
          title: '目標設定のコツ',
          content: 'SMARTの原則を意識しましょう：Specific（具体的）、Measurable（測定可能）、Achievable（達成可能）、Relevant（関連性）、Time-bound（期限付き）。',
          type: 'guide'
        }
      ]
    };

    return [...baseInfo, ...(stepSpecificInfo[currentStep] || [])];
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'tip':
        return <Lightbulb className="text-yellow-600" />;
      case 'help':
        return <Help className="text-blue-600" />;
      case 'guide':
        return <Book className="text-green-600" />;
      case 'info':
        return <Info className="text-gray-600" />;
      default:
        return <TipsAndUpdates className="text-purple-600" />;
    }
  };

  const infoItems = getStepSpecificInfo();

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center p-3 border-b border-gray-200">
        <Info className="text-blue-600 mr-2" />
        <h3 className="text-sm font-medium text-gray-800">サポート情報</h3>
      </div>

      {/* 情報一覧 */}
      <div className="p-3 space-y-3">
        {infoItems.map((item) => {
          const isExpanded = expandedItems.has(item.id);
          
          return (
            <div key={item.id} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleExpanded(item.id)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {getIcon(item.type)}
                  <span className="text-sm font-medium text-gray-800">
                    {item.title}
                  </span>
                </div>
                {isExpanded ? (
                  <ExpandLess className="text-gray-500" />
                ) : (
                  <ExpandMore className="text-gray-500" />
                )}
              </button>
              
              {isExpanded && (
                <div className="px-3 pb-3">
                  <div className="text-sm text-gray-600 whitespace-pre-line">
                    {item.content}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ヘルプリンク */}
      <div className="p-3 border-t border-gray-200">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">さらに詳しい情報が必要ですか？</p>
          <button className="text-xs text-blue-600 hover:text-blue-800 underline">
            ヘルプセンターを開く
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoArea;
