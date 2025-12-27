"use client";

import React, { useState } from 'react';
import SupportAccordion from './SupportAccordion';
import { Milestone } from '@/types/goals';
import { Add, Delete } from '@mui/icons-material';
import {
  ID_ATTRIBUTES,
  CONTENT_ATTRIBUTES,
  FUNCTION_ATTRIBUTES,
  INTERACTION_ATTRIBUTES,
  createDataAttributes
} from '@/constants/DataAttributesRegulation';

interface TimeboundStepProps {
  targetDate: string;
  milestones: Milestone[];
  onTargetDateChange: (date: string) => void;
  onMilestonesChange: (milestones: Milestone[]) => void;
}

const TimeboundStep: React.FC<TimeboundStepProps> = ({
  targetDate,
  milestones,
  onTargetDateChange,
  onMilestonesChange,
}) => {
  const [showMilestones, setShowMilestones] = useState(false);

  const tips = [
    '現実的で挑戦的な期限を設定する',
    '長期目標の場合は中間マイルストーンも設定する',
    '期限を明確にすることで行動計画が立てやすくなります',
    '期限は変更可能ですが、まずは目標を設定することが大切です'
  ];

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: '',
      targetDate: new Date(),
      completed: false,
    };
    onMilestonesChange([...milestones, newMilestone]);
  };

  const updateMilestone = (id: string, field: keyof Milestone, value: any) => {
    onMilestonesChange(
      milestones.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    );
  };

  const deleteMilestone = (id: string) => {
    onMilestonesChange(milestones.filter((m) => m.id !== id));
  };

  // 今からの期間を計算
  const calculateTimeRemaining = () => {
    if (!targetDate) return '';
    
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return '過去の日付が選択されています';
    } else if (diffDays === 0) {
      return '今日';
    } else if (diffDays < 30) {
      return `あと${diffDays}日`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      const days = diffDays % 30;
      return `あと${months}ヶ月${days > 0 ? `${days}日` : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);
      return `あと${years}年${months > 0 ? `${months}ヶ月` : ''}`;
    }
  };

  return (
    <div 
      {...createDataAttributes({
        'data-id': ID_ATTRIBUTES.GOAL_STEP_TIMEBOUND,
        'data-function': FUNCTION_ATTRIBUTES.GOAL_SETTING,
        'data-content': CONTENT_ATTRIBUTES.GOAL_STEP_CONTENT
      })}
      className="space-y-6"
    >
      {/* タイトル */}
      <div className="text-center">
        <div className="inline-block px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold mb-3">
          T: Time-bound（期限設定）
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          期限を設定しましょう
        </h2>
        <p className="text-gray-600">
          いつまでに達成しますか？
        </p>
      </div>

      {/* サポート情報 */}
      <SupportAccordion tips={tips} />

      {/* 目標達成日 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          目標達成日 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => onTargetDateChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
          min={new Date().toISOString().split('T')[0]}
        />
        {targetDate && (
          <div className="mt-2">
            <p className="text-sm text-orange-600 font-medium">
              {calculateTimeRemaining()}
            </p>
          </div>
        )}
      </div>

      {/* マイルストーン設定 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            中間マイルストーン（任意）
          </label>
          <button
            onClick={() => setShowMilestones(!showMilestones)}
            className="text-sm text-orange-600 hover:text-orange-800"
          >
            {showMilestones ? '非表示' : '設定する'}
          </button>
        </div>

        {showMilestones && (
          <div className="space-y-3">
            {milestones.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                マイルストーンを追加して、段階的な目標を設定しましょう
              </p>
            )}

            {milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className="border border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    マイルストーン {index + 1}
                  </span>
                  <button
                    onClick={() => deleteMilestone(milestone.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>

                <input
                  type="text"
                  value={milestone.title}
                  onChange={(e) =>
                    updateMilestone(milestone.id, 'title', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                  placeholder="マイルストーンの内容"
                />

                <input
                  type="date"
                  value={
                    milestone.targetDate instanceof Date
                      ? milestone.targetDate.toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    updateMilestone(
                      milestone.id,
                      'targetDate',
                      new Date(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                  min={new Date().toISOString().split('T')[0]}
                  max={targetDate}
                />
              </div>
            ))}

            <button
              onClick={addMilestone}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors flex items-center justify-center"
            >
              <Add className="w-5 h-5 mr-1" />
              マイルストーンを追加
            </button>
          </div>
        )}
      </div>

      {/* プレビュー */}
      {targetDate && (
        <div 
          {...createDataAttributes({
            'data-content': CONTENT_ATTRIBUTES.GOAL_PREVIEW
          })}
          className="bg-orange-50 border border-orange-200 rounded-lg p-4"
        >
          <h4 className="text-sm font-semibold text-orange-900 mb-2">
            📅 目標期限のプレビュー
          </h4>
          <p className="text-orange-800">
            <span className="text-lg font-bold">
              {new Date(targetDate).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="text-sm ml-2">まで</span>
          </p>
          {milestones.length > 0 && (
            <p className="text-sm text-orange-700 mt-2">
              中間マイルストーン: {milestones.length}個設定済み
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeboundStep;

