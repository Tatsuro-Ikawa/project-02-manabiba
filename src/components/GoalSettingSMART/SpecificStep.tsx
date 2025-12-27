"use client";

import React from 'react';
import SupportAccordion from './SupportAccordion';
import {
  ID_ATTRIBUTES,
  CONTENT_ATTRIBUTES,
  FUNCTION_ATTRIBUTES,
  STATE_ATTRIBUTES,
  INTERACTION_ATTRIBUTES,
  createDataAttributes
} from '@/constants/DataAttributesRegulation';

interface SpecificStepProps {
  value: string;
  onChange: (value: string) => void;
  themeTitle?: string;
}

const SpecificStep: React.FC<SpecificStepProps> = ({ value, onChange, themeTitle }) => {
  const tips = [
    '5W1H（誰が、何を、いつ、どこで、なぜ、どのように）を意識する',
    '第三者が読んでも理解できる具体性を持たせる',
    '感覚ではなく、行動や状態で表現する',
    '曖昧な表現（「上手になる」「頑張る」など）を避け、具体的な動詞を使う'
  ];

  const examples = [
    '❌ 悪い例: 「英語が上手になりたい」',
    '✅ 良い例: 「ビジネスミーティングで英語でプレゼンテーションができ、質疑応答にもスムーズに答えられるようになる」',
    '❌ 悪い例: 「健康的になりたい」',
    '✅ 良い例: 「毎朝30分のジョギングを習慣化し、体脂肪率を18%まで落とす」'
  ];

  const charCount = value.length;
  const minChars = 20;
  const isValid = charCount >= minChars;

  return (
    <div 
      {...createDataAttributes({
        'data-id': ID_ATTRIBUTES.GOAL_STEP_SPECIFIC,
        'data-function': FUNCTION_ATTRIBUTES.GOAL_SETTING,
        'data-content': CONTENT_ATTRIBUTES.GOAL_STEP_CONTENT
      })}
      className="space-y-6"
    >
      {/* 選択されたテーマの表示 */}
      {themeTitle ? (
        <div 
          {...createDataAttributes({
            'data-id': ID_ATTRIBUTES.GOAL_THEME_DISPLAY,
            'data-content': CONTENT_ATTRIBUTES.GOAL_THEME_INFO,
            'data-state': STATE_ATTRIBUTES.VISIBLE
          })}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-blue-900 mb-1 flex items-center">
            <span className="mr-2">🎯</span>
            選択されたテーマ
          </h3>
          <p className="text-blue-800 font-medium text-lg">{themeTitle}</p>
          <p className="text-xs text-blue-600 mt-1">
            このテーマを基に、具体的な目標を設定していきましょう
          </p>
        </div>
      ) : (
        <div 
          {...createDataAttributes({
            'data-id': ID_ATTRIBUTES.GOAL_THEME_DISPLAY,
            'data-content': CONTENT_ATTRIBUTES.GOAL_THEME_INFO,
            'data-state': STATE_ATTRIBUTES.PLACEHOLDER
          })}
          className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4"
        >
          <p className="text-yellow-800 text-sm flex items-center">
            <span className="mr-2">⚠️</span>
            テーマが選択されていません。前のステップでテーマを選択してください。
          </p>
        </div>
      )}

      {/* タイトル */}
      <div className="text-center">
        <div className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-3">
          S: Specific（具体的）
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          目標を具体的にしましょう
        </h2>
        <p className="text-gray-600">
          自分が目標を達成した状況が見えるような表現をしてください
        </p>
      </div>

      {/* サポート情報 */}
      <SupportAccordion tips={tips} examples={examples} />

      {/* 入力エリア */}
      <div 
        {...createDataAttributes({
          'data-content': CONTENT_ATTRIBUTES.GOAL_INPUT_FIELD,
          'data-interaction': INTERACTION_ATTRIBUTES.FOCUSABLE
        })}
      >
        <label className="block text-sm font-medium text-gray-700 mb-2">
          具体的な目標
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
          rows={6}
          placeholder="例）TOEICで800点を取得し、海外クライアントと英語で商談できるようになる。会議での発言も積極的に行い、チームメンバーとスムーズにコミュニケーションが取れる状態を目指す。"
        />
        <div className="mt-2 flex justify-between items-center">
          <span
            className={`text-sm ${
              isValid ? 'text-gray-500' : 'text-orange-600'
            }`}
          >
            {charCount} / 最低{minChars}文字
          </span>
          {isValid && (
            <span className="text-sm text-green-600 flex items-center">
              <span className="mr-1">✓</span>
              入力完了
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecificStep;

