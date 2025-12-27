"use client";

import React from 'react';
import { UserType } from '@/types/themeSelection';
import { getUserTypeTitle, getUserTypeDescription, getUserTypeIcon } from '@/constants/themeTemplates';

interface UserTypeSelectorProps {
  selectedType: UserType | null;
  onSelect: (type: UserType) => void;
}

export const UserTypeSelector: React.FC<UserTypeSelectorProps> = ({
  selectedType,
  onSelect
}) => {
  const userTypes: UserType[] = ['aspiration', 'problem-solving'];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">あなたのタイプを選択してください</h2>
        <p className="text-gray-600">どちらのタイプに当てはまりますか？</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {userTypes.map(type => (
          <div 
            key={type}
            className={`cursor-pointer transition-all duration-200 border-2 rounded-lg p-6 text-center ${
              selectedType === type 
                ? 'border-blue-500 bg-blue-50 shadow-lg' 
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
            onClick={() => onSelect(type)}
          >
            <div className="text-4xl mb-4">{getUserTypeIcon(type)}</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              {getUserTypeTitle(type)}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {getUserTypeDescription(type)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
