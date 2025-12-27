"use client";

import React from 'react';
import { SMARTStep } from '@/types/goals';
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import {
  ID_ATTRIBUTES,
  FUNCTION_ATTRIBUTES,
  RESPONSIVE_ATTRIBUTES,
  createDataAttributes
} from '@/constants/DataAttributesRegulation';

interface ProgressIndicatorProps {
  currentStep: SMARTStep;
}

const steps = [
  { id: 'specific', label: 'S', fullLabel: 'Specific', description: '具体的' },
  { id: 'measurable', label: 'M', fullLabel: 'Measurable', description: '測定可能' },
  { id: 'relevant', label: 'R', fullLabel: 'Relevant', description: '関連性' },
  { id: 'timebound', label: 'T', fullLabel: 'Time-bound', description: '期限設定' },
];

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep }) => {
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div 
      {...createDataAttributes({
        'data-id': ID_ATTRIBUTES.GOAL_PROGRESS_INDICATOR,
        'data-function': FUNCTION_ATTRIBUTES.PROGRESS_TRACKING,
        'data-responsive': RESPONSIVE_ATTRIBUTES.ALL_DEVICES
      })}
      className="w-full"
    >
      {/* デスクトップ版 */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isUpcoming = index > currentIndex;

            return (
              <React.Fragment key={step.id}>
                {/* ステップアイテム */}
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-7 h-7" />
                    ) : (
                      step.label
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div
                      className={`text-xs font-semibold ${
                        isCurrent ? 'text-blue-600' : 'text-gray-600'
                      }`}
                    >
                      {step.fullLabel}
                    </div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                </div>

                {/* 接続線 */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-2 mb-8">
                    <div
                      className={`h-full transition-all ${
                        index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* モバイル版 */}
      <div className="md:hidden">
        <div className="flex items-center justify-center space-x-2">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <React.Fragment key={step.id}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : step.label}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-1 ${
                      index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="text-center mt-3">
          <div className="text-sm font-semibold text-blue-600">
            {steps[currentIndex]?.fullLabel}
          </div>
          <div className="text-xs text-gray-500">
            {steps[currentIndex]?.description}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;

