'use client';

import React from 'react';
import GoalSettingSMART from './GoalSettingSMART';
import { useProgress } from '@/hooks/useProgress';

interface GoalSettingProps {
  onBack?: () => void;
  onComplete?: () => void;
}

const GoalSetting: React.FC<GoalSettingProps> = ({ onBack, onComplete }) => {
  const { progress } = useProgress();

  // 選択されたコースに応じてuserTypeを決定
  const userType = progress.selectedCourse === 'aspiration' 
    ? 'aspiration' 
    : progress.selectedCourse === 'problem-solving' 
    ? 'problem' 
    : 'aspiration';

  const handleComplete = () => {
    console.log('SMART目標設定が完了しました');
    if (onComplete) {
      onComplete();
    }
  };

  const handleBack = () => {
    console.log('テーマ選択画面に戻ります');
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <GoalSettingSMART
        userType={userType}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </div>
  );
};

export default GoalSetting;
