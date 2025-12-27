"use client";

import React from 'react';
import { MetricTemplate } from '@/types/themeSelection';

interface MetricInputProps {
  metrics: MetricTemplate[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
  title?: string;
}

export const MetricInput: React.FC<MetricInputProps> = ({
  metrics,
  values,
  onChange,
  title = "評価してください"
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      {metrics.map(metric => (
        <div key={metric.key} className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{metric.icon}</span>
            <div>
              <span className="font-medium text-gray-800">{metric.label}</span>
              <p className="text-sm text-gray-500">{metric.description}</p>
            </div>
          </div>
          <div className="pl-11">
            <div className="max-w-md">
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={values[metric.key] || 3}
                onChange={(e) => onChange(metric.key, parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>1 (低い)</span>
                <span className="font-medium text-blue-600">{values[metric.key] || 3}</span>
                <span>5 (高い)</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
