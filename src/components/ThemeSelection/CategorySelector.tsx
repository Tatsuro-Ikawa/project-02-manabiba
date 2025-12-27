"use client";

import React, { useState } from 'react';
import { CategoryTemplate } from '@/types/themeSelection';

interface CategorySelectorProps {
  categories: CategoryTemplate[];
  selectedCategory: string | null;
  onSelect: (category: string) => void;
  title?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelect,
  title = "カテゴリを選択してください"
}) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {showHelp ? 'ヘルプを閉じる' : '例を見る'}
        </button>
      </div>

      {/* ヘルプ表示 */}
      {showHelp && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-3">カテゴリの例</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(category => (
              <div key={category.name} className="space-y-2">
                <h5 className="font-medium text-blue-700">{category.name}</h5>
                <ul className="text-sm text-blue-600 space-y-1">
                  {category.examples.map((example, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2 mt-0.5">•</span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* カテゴリ選択ボタン */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map(category => (
          <button
            key={category.name}
            onClick={() => onSelect(category.name)}
            className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
              selectedCategory === category.name 
                ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-md' 
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm text-gray-700'
            }`}
          >
            <span className="font-medium text-sm">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
