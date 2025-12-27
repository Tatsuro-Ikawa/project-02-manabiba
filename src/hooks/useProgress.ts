"use client";

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useThemeSelection } from './useThemeSelection';
import { useSelfUnderstanding } from './useSelfUnderstanding';
import { usePDCA } from './usePDCA';

export interface ProgressStatus {
  home: boolean;
  start: boolean;
  goals: boolean;
  plan: boolean;
  execute: boolean;
  reflection: boolean;
  selectedCourse: string | null;
  currentStep: 'list-up' | 'theme-selection' | null;
}

export const useProgress = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressStatus>({
    home: false,
    start: false,
    goals: false,
    plan: false,
    execute: false,
    reflection: false,
    selectedCourse: null,
    currentStep: null
  });
  const [loading, setLoading] = useState(true);

  // テーマ選択データの確認
  const { data: aspirationData } = useThemeSelection('aspiration_session');
  const { data: problemData } = useThemeSelection('problem_session');
  
  // 自己理解データの確認
  const { data: selfUnderstandingData } = useSelfUnderstanding();
  
  // PDCAデータの確認
  const { allEntries } = usePDCA();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const checkProgress = async () => {
      try {
        // ホーム: 常にtrue（ログイン済み）
        const home = true;

        // スタート: テーマ選択データが存在するかチェック
        const hasAspirationData = aspirationData && aspirationData.entries && aspirationData.entries.length > 0;
        const hasProblemData = problemData && problemData.entries && problemData.entries.length > 0;
        const start = hasAspirationData || hasProblemData;

        // 選択されたコースを判定
        let selectedCourse: string | null = null;
        let currentStep: 'list-up' | 'theme-selection' | null = null;

        if (hasAspirationData) {
          selectedCourse = 'aspiration';
          currentStep = aspirationData.currentStep === 'select-theme' ? 'theme-selection' : 'list-up';
        } else if (hasProblemData) {
          selectedCourse = 'problem-solving';
          currentStep = problemData.currentStep === 'select-theme' ? 'theme-selection' : 'list-up';
        }

        // ゴール: 自己理解データが存在するかチェック
        const goals = selfUnderstandingData && 
          (selfUnderstandingData.entries.aspirations?.length > 0 || 
           selfUnderstandingData.entries.problems?.length > 0 ||
           selfUnderstandingData.entries.values?.length > 0 ||
           selfUnderstandingData.entries.resource?.length > 0);

        // 計画: PDCAデータが存在するかチェック
        const plan = allEntries && allEntries.length > 0;

        // 実行: PDCAのDoデータが存在するかチェック
        const execute = allEntries && allEntries.some(entry => entry.do && entry.do.trim() !== '');

        // 反省: PDCAのCheck/Actionデータが存在するかチェック
        const reflection = allEntries && allEntries.some(entry => 
          (entry.check && entry.check.trim() !== '') || 
          (entry.action && entry.action.trim() !== '')
        );

        setProgress({
          home,
          start,
          goals,
          plan,
          execute,
          reflection,
          selectedCourse,
          currentStep
        });

      } catch (error) {
        console.error('進捗状況の確認エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    checkProgress();
  }, [user, aspirationData, problemData, selfUnderstandingData, allEntries]);

  return {
    progress,
    loading,
    setProgress
  };
};
