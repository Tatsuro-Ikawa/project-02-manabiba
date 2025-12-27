"use client";

import React from 'react';
import SupportAccordion from './SupportAccordion';
import { VALUE_TAGS } from '@/types/goals';
import {
  ID_ATTRIBUTES,
  CONTENT_ATTRIBUTES,
  FUNCTION_ATTRIBUTES,
  INTERACTION_ATTRIBUTES,
  createDataAttributes
} from '@/constants/DataAttributesRegulation';

interface RelevantStepProps {
  value: string;
  relatedValues: string[];
  onChange: (value: string) => void;
  onValuesChange: (values: string[]) => void;
}

const RelevantStep: React.FC<RelevantStepProps> = ({
  value,
  relatedValues,
  onChange,
  onValuesChange,
}) => {
  const tips = [
    '自分の価値観とどう関連するか考える',
    '人生の中でどんな意味があるか振り返る',
    '達成後にどんな変化があるか想像する',
    '「なぜこれが重要なのか？」を3回繰り返して深掘りする'
  ];

  const prompts = [
    'この目標は私の人生にどんな影響を与えますか？',
    'この目標を達成すると、誰が喜びますか？',
    'この目標は私の大切な価値観とどう繋がっていますか？',
    'この目標を達成しない場合、どんな影響がありますか？'
  ];

  const handleValueToggle = (tag: string) => {
    if (relatedValues.includes(tag)) {
      onValuesChange(relatedValues.filter(v => v !== tag));
    } else {
      onValuesChange([...relatedValues, tag]);
    }
  };

  const charCount = value.length;
  const minChars = 20;
  const isValid = charCount >= minChars;

  return (
    <div 
      {...createDataAttributes({
        'data-id': ID_ATTRIBUTES.GOAL_STEP_RELEVANT,
        'data-function': FUNCTION_ATTRIBUTES.GOAL_SETTING,
        'data-content': CONTENT_ATTRIBUTES.GOAL_STEP_CONTENT
      })}
      className="space-y-6"
    >
      {/* タイトル */}
      <div className="text-center">
        <div className="inline-block px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold mb-3">
          R: Relevant（関連性）
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          なぜ重要かを明確にしましょう
        </h2>
        <p className="text-gray-600">
          なぜこの目標を達成することが大切ですか？
        </p>
      </div>

      {/* サポート情報 */}
      <SupportAccordion tips={tips} prompts={prompts} />

      {/* 価値観タグ選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          関連する価値観を選択してください（複数選択可）
        </label>
        <div className="flex flex-wrap gap-2">
          {VALUE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleValueToggle(tag)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                relatedValues.includes(tag)
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {relatedValues.includes(tag) && '✓ '}
              {tag}
            </button>
          ))}
        </div>
        {relatedValues.length > 0 && (
          <p className="mt-2 text-sm text-purple-600">
            {relatedValues.length}個の価値観を選択中
          </p>
        )}
      </div>

      {/* 理由入力エリア */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          この目標が大切な理由
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-900"
          rows={6}
          placeholder="例）キャリアアップして家族により良い生活環境を提供したい。また、自己成長を実感することで自信を持ち、子どもたちに努力する姿を見せることができる。英語力を身につけることで、将来的には海外でも活躍できる選択肢を持ちたい。"
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

export default RelevantStep;

