"use client";

import React, { useState } from 'react';
import SupportAccordion from './SupportAccordion';
import { MEASUREMENT_UNITS, MEASUREMENT_FREQUENCIES } from '@/types/goals';
import {
  ID_ATTRIBUTES,
  CONTENT_ATTRIBUTES,
  FUNCTION_ATTRIBUTES,
  INTERACTION_ATTRIBUTES,
  createDataAttributes
} from '@/constants/DataAttributesRegulation';

interface MeasurableStepProps {
  measurementValue: string;
  measurementUnit: string;
  measurementFrequency: string;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
  onFrequencyChange: (frequency: string) => void;
}

const MeasurableStep: React.FC<MeasurableStepProps> = ({
  measurementValue,
  measurementUnit,
  measurementFrequency,
  onValueChange,
  onUnitChange,
  onFrequencyChange,
}) => {
  const [customUnit, setCustomUnit] = useState('');

  const tips = [
    '数値化できる指標を設定する',
    '進捗が分かる測定方法を考える',
    '定期的にチェックできる指標にする',
    '客観的に評価できる基準を設ける'
  ];

  const examples = [
    '✅ 数値: 「TOEICスコア800点」「月5冊読書」「体重60kg」',
    '✅ 頻度: 「週3回ジョギング」「毎日30分学習」',
    '✅ 完了度: 「資格取得」「プロジェクト完了」「10回実施」'
  ];

  const isUnitOther = measurementUnit === 'その他';
  const displayUnit = isUnitOther && customUnit ? customUnit : measurementUnit;

  return (
    <div 
      {...createDataAttributes({
        'data-id': ID_ATTRIBUTES.GOAL_STEP_MEASURABLE,
        'data-function': FUNCTION_ATTRIBUTES.GOAL_SETTING,
        'data-content': CONTENT_ATTRIBUTES.GOAL_STEP_CONTENT
      })}
      className="space-y-6"
    >
      {/* タイトル */}
      <div className="text-center">
        <div className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold mb-3">
          M: Measurable（測定可能）
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          測定方法を決めましょう
        </h2>
        <p className="text-gray-600">
          どうやって評価・測定しますか？
        </p>
      </div>

      {/* サポート情報 */}
      <SupportAccordion tips={tips} examples={examples} />

      {/* 入力エリア */}
      <div className="space-y-4">
        {/* 目標値と単位 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目標値 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={measurementValue}
              onChange={(e) => onValueChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              placeholder="800"
              min="0"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              単位 <span className="text-red-500">*</span>
            </label>
            <select
              value={measurementUnit}
              onChange={(e) => {
                onUnitChange(e.target.value);
                if (e.target.value !== 'その他') {
                  setCustomUnit('');
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            >
              <option value="">選択してください</option>
              {MEASUREMENT_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* カスタム単位入力 */}
        {isUnitOther && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カスタム単位を入力
            </label>
            <input
              type="text"
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              placeholder="例）プロジェクト、作品、記事"
            />
          </div>
        )}

        {/* 測定頻度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            測定頻度 <span className="text-red-500">*</span>
          </label>
          <select
            value={measurementFrequency}
            onChange={(e) => onFrequencyChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
          >
            <option value="">選択してください</option>
            {MEASUREMENT_FREQUENCIES.map((freq) => (
              <option key={freq} value={freq}>
                {freq}
              </option>
            ))}
          </select>
        </div>

        {/* プレビュー */}
        {measurementValue && displayUnit && (
          <div 
            {...createDataAttributes({
              'data-content': CONTENT_ATTRIBUTES.GOAL_PREVIEW
            })}
            className="bg-green-50 border border-green-200 rounded-lg p-4"
          >
            <h4 className="text-sm font-semibold text-green-900 mb-2">
              📊 測定目標のプレビュー
            </h4>
            <p className="text-green-800">
              <span className="text-2xl font-bold">{measurementValue}</span>
              <span className="text-lg ml-1">{displayUnit}</span>
              {measurementFrequency && (
                <span className="text-sm ml-2">（{measurementFrequency}で測定）</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeasurableStep;

