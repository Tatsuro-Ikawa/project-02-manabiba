"use client";

import React, { useState } from 'react';
import { ExpandMore, ExpandLess, Lightbulb, CheckCircle } from '@mui/icons-material';
import {
  ID_ATTRIBUTES,
  CONTENT_ATTRIBUTES,
  LAYOUT_ATTRIBUTES,
  STATE_ATTRIBUTES,
  INTERACTION_ATTRIBUTES,
  createDataAttributes
} from '@/constants/DataAttributesRegulation';

interface SupportAccordionProps {
  tips: string[];
  examples?: string[];
  prompts?: string[];
  defaultOpen?: boolean;
}

const SupportAccordion: React.FC<SupportAccordionProps> = ({
  tips,
  examples = [],
  prompts = [],
  defaultOpen = true
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div 
      {...createDataAttributes({
        'data-id': ID_ATTRIBUTES.GOAL_SUPPORT_ACCORDION,
        'data-layout': LAYOUT_ATTRIBUTES.ACCORDION,
        'data-state': isOpen ? STATE_ATTRIBUTES.EXPANDED : STATE_ATTRIBUTES.COLLAPSED,
        'data-content': CONTENT_ATTRIBUTES.SUPPORT_GUIDE
      })}
      className="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden"
    >
      {/* ヘッダー */}
      <button
        {...createDataAttributes({
          'data-interaction': INTERACTION_ATTRIBUTES.TOGGLEABLE
        })}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Lightbulb className="text-blue-600 w-5 h-5" />
          <span className="text-sm font-medium text-blue-900">
            サポート情報を見る
          </span>
        </div>
        {isOpen ? (
          <ExpandLess className="text-blue-600 w-5 h-5" />
        ) : (
          <ExpandMore className="text-blue-600 w-5 h-5" />
        )}
      </button>

      {/* コンテンツ */}
      {isOpen && (
        <div className="p-4 pt-0 space-y-4">
          {/* ヒント */}
          {tips.length > 0 && (
            <div 
              {...createDataAttributes({
                'data-content': CONTENT_ATTRIBUTES.GOAL_TIPS
              })}
            >
              <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <span className="mr-2">✍️</span>
                書き方のヒント
              </h4>
              <ul className="space-y-2">
                {tips.map((tip, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 具体例 */}
          {examples.length > 0 && (
            <div 
              {...createDataAttributes({
                'data-content': CONTENT_ATTRIBUTES.GOAL_EXAMPLES
              })}
            >
              <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <span className="mr-2">📝</span>
                具体例
              </h4>
              <div className="space-y-2">
                {examples.map((example, index) => (
                  <div
                    key={index}
                    className={`text-sm p-2 rounded ${
                      example.startsWith('❌') || example.startsWith('×')
                        ? 'bg-red-50 text-red-800'
                        : 'bg-green-50 text-green-800'
                    }`}
                  >
                    {example}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* プロンプト */}
          {prompts.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                <span className="mr-2">💭</span>
                考えるヒント
              </h4>
              <ul className="space-y-2">
                {prompts.map((prompt, index) => (
                  <li key={index} className="text-sm text-gray-700 italic pl-4 border-l-2 border-blue-300">
                    {prompt}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportAccordion;

