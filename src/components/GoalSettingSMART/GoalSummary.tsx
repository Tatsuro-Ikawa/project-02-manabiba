"use client";

import React from 'react';
import { SMARTGoalFormData } from '@/types/goals';
import { CheckCircle } from '@mui/icons-material';
import {
  ID_ATTRIBUTES,
  CONTENT_ATTRIBUTES,
  FUNCTION_ATTRIBUTES,
  createDataAttributes
} from '@/constants/DataAttributesRegulation';

interface GoalSummaryProps {
  formData: SMARTGoalFormData;
  themeTitle?: string;
  onEdit: (step: 'specific' | 'measurable' | 'relevant' | 'timebound') => void;
}

const GoalSummary: React.FC<GoalSummaryProps> = ({
  formData,
  themeTitle,
  onEdit,
}) => {
  return (
    <div 
      {...createDataAttributes({
        'data-id': ID_ATTRIBUTES.GOAL_SUMMARY,
        'data-function': FUNCTION_ATTRIBUTES.GOAL_SETTING,
        'data-content': CONTENT_ATTRIBUTES.GOAL_STEP_CONTENT
      })}
      className="space-y-6"
    >
      {/* タイトル */}
      <div className="text-center">
        <div className="inline-block p-3 bg-green-100 rounded-full mb-3">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          SMART目標の確認
        </h2>
        <p className="text-gray-600">
          設定した目標を確認してください
        </p>
      </div>

      {/* 選択されたテーマ */}
      {themeTitle && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">
            選択されたテーマ
          </h4>
          <p className="text-blue-800 font-medium">{themeTitle}</p>
        </div>
      )}

      {/* S: Specific */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold">
              S
            </span>
            <h3 className="text-lg font-semibold text-gray-800">
              Specific（具体的）
            </h3>
          </div>
          <button
            onClick={() => onEdit('specific')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            編集
          </button>
        </div>
        <p className="text-gray-700 whitespace-pre-wrap pl-10">
          {formData.specificDescription}
        </p>
      </div>

      {/* M: Measurable */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-bold">
              M
            </span>
            <h3 className="text-lg font-semibold text-gray-800">
              Measurable（測定可能）
            </h3>
          </div>
          <button
            onClick={() => onEdit('measurable')}
            className="text-sm text-green-600 hover:text-green-800"
          >
            編集
          </button>
        </div>
        <div className="pl-10">
          <p className="text-gray-700">
            <span className="text-2xl font-bold text-green-700">
              {formData.measurementValue}
            </span>
            <span className="text-lg ml-1">{formData.measurementUnit}</span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            測定頻度: {formData.measurementFrequency}
          </p>
        </div>
      </div>

      {/* R: Relevant */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-8 h-8 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-sm font-bold">
              R
            </span>
            <h3 className="text-lg font-semibold text-gray-800">
              Relevant（関連性）
            </h3>
          </div>
          <button
            onClick={() => onEdit('relevant')}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            編集
          </button>
        </div>
        <div className="pl-10 space-y-2">
          {formData.relatedValues.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.relatedValues.map((value) => (
                <span
                  key={value}
                  className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                >
                  {value}
                </span>
              ))}
            </div>
          )}
          <p className="text-gray-700 whitespace-pre-wrap">
            {formData.relevanceReason}
          </p>
        </div>
      </div>

      {/* T: Time-bound */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-8 h-8 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-sm font-bold">
              T
            </span>
            <h3 className="text-lg font-semibold text-gray-800">
              Time-bound（期限設定）
            </h3>
          </div>
          <button
            onClick={() => onEdit('timebound')}
            className="text-sm text-orange-600 hover:text-orange-800"
          >
            編集
          </button>
        </div>
        <div className="pl-10 space-y-2">
          <p className="text-gray-700">
            <span className="text-xl font-bold text-orange-700">
              {new Date(formData.targetDate).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="text-sm ml-2">まで</span>
          </p>
          {formData.milestones.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                マイルストーン:
              </p>
              <ul className="space-y-1">
                {formData.milestones.map((milestone) => (
                  <li
                    key={milestone.id}
                    className="text-sm text-gray-600 flex items-center"
                  >
                    <span className="w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
                    {milestone.title}
                    <span className="text-xs text-gray-500 ml-2">
                      (
                      {new Date(milestone.targetDate).toLocaleDateString(
                        'ja-JP'
                      )}
                      )
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalSummary;

