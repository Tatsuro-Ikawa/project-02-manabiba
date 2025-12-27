"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useThemeSelection } from '@/hooks/useThemeSelection';
import { useGoals } from '@/hooks/useGoals';
import { SMARTStep, SMARTGoalFormData, Milestone, SMARTGoal } from '@/types/goals';
import ProgressIndicator from './ProgressIndicator';
import SpecificStep from './SpecificStep';
import MeasurableStep from './MeasurableStep';
import RelevantStep from './RelevantStep';
import TimeboundStep from './TimeboundStep';
import GoalSummary from './GoalSummary';
import { ArrowBack, ArrowForward, CheckCircle, Edit } from '@mui/icons-material';
import {
  ID_ATTRIBUTES,
  FUNCTION_ATTRIBUTES,
  RESPONSIVE_ATTRIBUTES,
  createDataAttributes
} from '@/constants/DataAttributesRegulation';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface GoalSettingSMARTProps {
  userType?: 'aspiration' | 'problem';
  onComplete?: () => void;
  onBack?: () => void;
}

const GoalSettingSMART: React.FC<GoalSettingSMARTProps> = ({
  userType = 'aspiration',
  onComplete,
  onBack,
}) => {
  const { user } = useAuth();
  const sessionId = userType === 'aspiration' ? 'aspiration_session' : 'problem_session';
  const { data: themeData } = useThemeSelection(sessionId);

  // 選択されたテーマを取得（IDからテキストに変換）
  const selectedThemeId = themeData?.selectedTheme;
  const selectedThemeEntry = themeData?.entries?.find(entry => entry.id === selectedThemeId);
  const selectedTheme = selectedThemeEntry?.text || '';

  // 選択されたテーマの既存目標を取得
  const { goals, loading: goalsLoading } = useGoals(selectedThemeId);
  const existingGoal = goals.length > 0 ? goals[0] : null; // 最新の目標を取得

  const [currentStep, setCurrentStep] = useState<SMARTStep>('specific');
  const [formData, setFormData] = useState<SMARTGoalFormData>({
    specificDescription: '',
    measurementValue: '',
    measurementUnit: '',
    measurementFrequency: '',
    relevanceReason: '',
    relatedValues: [],
    targetDate: '',
    milestones: [],
  });
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 既存目標をフォームに読み込み
  useEffect(() => {
    if (existingGoal && !goalsLoading) {
      console.log('既存の目標を読み込みます:', existingGoal);
      setFormData({
        specificDescription: existingGoal.specificDescription,
        measurementValue: existingGoal.measurementValue.toString(),
        measurementUnit: existingGoal.measurementUnit,
        measurementFrequency: existingGoal.measurementFrequency,
        relevanceReason: existingGoal.relevanceReason,
        relatedValues: existingGoal.relatedValues,
        targetDate: existingGoal.targetDate.toISOString().split('T')[0],
        milestones: existingGoal.milestones,
      });
      setIsEditMode(true);
      setEditingGoalId(existingGoal.id);
    }
  }, [existingGoal, goalsLoading]);

  // 自動保存機能（下書き保存）
  useEffect(() => {
    // ユーザーがログインしていない場合、またはデータがロード中の場合はスキップ
    if (!user || goalsLoading) return;
    
    // テーマIDが確定していない場合はスキップ
    if (!selectedThemeId && !sessionId) return;
    
    // フォームデータが空の場合はスキップ
    if (!formData.specificDescription && 
        !formData.measurementValue && 
        !formData.relevanceReason && 
        !formData.targetDate) {
      return;
    }

    // debounce: 2秒後に自動保存
    const timer = setTimeout(async () => {
      setAutoSaving(true);
      
      try {
        // goalIdを決定：既存のeditingGoalId、既存目標のID、または新規作成
        let goalId = editingGoalId;
        if (!goalId && existingGoal) {
          goalId = existingGoal.id;
        }
        if (!goalId) {
          // テーマIDベースで固定のdraftIDを生成（重複を避ける）
          goalId = `draft_${selectedThemeId || sessionId}`;
        }
        
        const now = new Date();
        const goalData: SMARTGoal = {
          id: goalId,
          uid: user.uid,
          themeId: selectedThemeId || sessionId,
          themeTitle: selectedTheme,
          userType,
          specificDescription: formData.specificDescription,
          measurementValue: parseFloat(formData.measurementValue) || 0,
          measurementUnit: formData.measurementUnit,
          measurementFrequency: formData.measurementFrequency,
          relevanceReason: formData.relevanceReason,
          relatedValues: formData.relatedValues,
          targetDate: formData.targetDate ? new Date(formData.targetDate) : new Date(),
          milestones: formData.milestones,
          status: existingGoal?.status === 'active' ? 'active' : 'draft', // 既存がactiveならactive、それ以外はdraft
          currentStep: currentStep,
          progress: existingGoal?.progress || 0,
          createdAt: existingGoal?.createdAt || now,
          updatedAt: now,
        };

        // Firestoreに保存
        const goalRef = doc(db, 'users', user.uid, 'smart-goals', goalId);
        await setDoc(goalRef, {
          ...goalData,
          createdAt: Timestamp.fromDate(goalData.createdAt),
          updatedAt: Timestamp.fromDate(goalData.updatedAt),
          targetDate: Timestamp.fromDate(goalData.targetDate),
          milestones: goalData.milestones.map(m => ({
            ...m,
            targetDate: Timestamp.fromDate(m.targetDate)
          }))
        }, { merge: true }); // merge: trueで部分更新を可能にする

        // 初回保存時にeditingGoalIdを設定
        if (!editingGoalId) {
          setEditingGoalId(goalId);
        }

        setLastSaved(new Date());
        console.log('目標を自動保存しました（下書き）:', goalData);
      } catch (error) {
        console.error('自動保存エラー:', error);
      } finally {
        setAutoSaving(false);
      }
    }, 2000); // 2秒のdebounce

    return () => clearTimeout(timer);
  }, [formData, currentStep, user, selectedThemeId, selectedTheme, userType, sessionId, existingGoal, editingGoalId, goalsLoading]);

  // デバッグログ
  useEffect(() => {
    console.log('GoalSettingSMART - themeData:', themeData);
    console.log('GoalSettingSMART - selectedThemeId:', selectedThemeId);
    console.log('GoalSettingSMART - selectedThemeEntry:', selectedThemeEntry);
    console.log('GoalSettingSMART - selectedTheme:', selectedTheme);
    console.log('GoalSettingSMART - existingGoal:', existingGoal);
    console.log('GoalSettingSMART - isEditMode:', isEditMode);
  }, [themeData, selectedThemeId, selectedThemeEntry, selectedTheme, existingGoal, isEditMode]);

  // バリデーション
  const isStepValid = () => {
    switch (currentStep) {
      case 'specific':
        return formData.specificDescription.length >= 20;
      case 'measurable':
        return (
          formData.measurementValue !== '' &&
          formData.measurementUnit !== '' &&
          formData.measurementFrequency !== ''
        );
      case 'relevant':
        return formData.relevanceReason.length >= 20;
      case 'timebound':
        return formData.targetDate !== '';
      case 'complete':
        return true;
      default:
        return false;
    }
  };

  // 次へ
  const handleNext = () => {
    if (!isStepValid()) return;

    const steps: SMARTStep[] = ['specific', 'measurable', 'relevant', 'timebound', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 戻る
  const handlePrevious = () => {
    const steps: SMARTStep[] = ['specific', 'measurable', 'relevant', 'timebound', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (onBack) {
      onBack();
    }
  };

  // 特定のステップに移動（確認画面から編集）
  const handleEditStep = (step: SMARTStep) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 完了
  const handleComplete = async () => {
    if (!user) {
      alert('ログインが必要です');
      return;
    }

    setSaving(true);
    
    try {
      // 編集モードか新規作成モードか判定（下書きIDがあればそれを使用）
      const goalId = editingGoalId || `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const now = new Date();
      const goalData: SMARTGoal = {
        id: goalId,
        uid: user.uid,
        themeId: selectedThemeId || sessionId,  // 選択されたテーマエントリのIDを保存
        themeTitle: selectedTheme,
        userType,
        specificDescription: formData.specificDescription,
        measurementValue: parseFloat(formData.measurementValue),
        measurementUnit: formData.measurementUnit,
        measurementFrequency: formData.measurementFrequency,
        relevanceReason: formData.relevanceReason,
        relatedValues: formData.relatedValues,
        targetDate: new Date(formData.targetDate),
        milestones: formData.milestones,
        status: 'active', // 完了時はactiveステータスに変更
        currentStep: 'complete',
        progress: existingGoal?.progress || 0,
        createdAt: existingGoal?.createdAt || now,
        updatedAt: now,
      };

      // Firestoreに保存
      const goalRef = doc(db, 'users', user.uid, 'smart-goals', goalId);
      await setDoc(goalRef, {
        ...goalData,
        createdAt: Timestamp.fromDate(goalData.createdAt),
        updatedAt: Timestamp.fromDate(goalData.updatedAt),
        targetDate: Timestamp.fromDate(goalData.targetDate),
        milestones: goalData.milestones.map(m => ({
          ...m,
          targetDate: Timestamp.fromDate(m.targetDate)
        }))
      });

      console.log('SMART目標をFirestoreに保存しました:', goalData);
      alert(isEditMode ? '目標を更新しました！' : '目標を設定しました！');
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('目標保存エラー:', error);
      alert('目標の保存に失敗しました。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  // ローディング中の表示
  if (goalsLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">既存の目標を確認しています...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      {...createDataAttributes({
        'data-id': ID_ATTRIBUTES.GOAL_SETTING_SMART,
        'data-function': FUNCTION_ATTRIBUTES.GOAL_SETTING,
        'data-responsive': RESPONSIVE_ATTRIBUTES.ALL_DEVICES
      })}
      className="max-w-3xl mx-auto"
    >
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-8">
        {/* 自動保存ステータス表示 */}
        {user && (
          <div className="flex justify-end items-center text-xs text-gray-500">
            {autoSaving ? (
              <div className="flex items-center space-x-1">
                <span className="animate-spin">⏳</span>
                <span>保存中...</span>
              </div>
            ) : lastSaved ? (
              <div className="flex items-center space-x-1 text-green-600">
                <span>✓</span>
                <span>自動保存済み ({new Date(lastSaved).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })})</span>
              </div>
            ) : null}
          </div>
        )}

        {/* 編集モード表示 */}
        {isEditMode && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Edit className="text-blue-700 w-5 h-5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900">
                  既存の目標を編集中
                </h3>
                <p className="text-xs text-blue-700 mt-1">
                  このテーマには既に設定された目標があります。内容を確認・編集してください。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 進捗インジケーター */}
        <ProgressIndicator currentStep={currentStep} />

        {/* ステップコンテンツ */}
        <div className="min-h-[500px]">
          {currentStep === 'specific' && (
            <SpecificStep
              value={formData.specificDescription}
              onChange={(value) =>
                setFormData({ ...formData, specificDescription: value })
              }
              themeTitle={selectedTheme}
            />
          )}

          {currentStep === 'measurable' && (
            <MeasurableStep
              measurementValue={formData.measurementValue}
              measurementUnit={formData.measurementUnit}
              measurementFrequency={formData.measurementFrequency}
              onValueChange={(value) =>
                setFormData({ ...formData, measurementValue: value })
              }
              onUnitChange={(unit) =>
                setFormData({ ...formData, measurementUnit: unit })
              }
              onFrequencyChange={(frequency) =>
                setFormData({ ...formData, measurementFrequency: frequency })
              }
            />
          )}

          {currentStep === 'relevant' && (
            <RelevantStep
              value={formData.relevanceReason}
              relatedValues={formData.relatedValues}
              onChange={(value) =>
                setFormData({ ...formData, relevanceReason: value })
              }
              onValuesChange={(values) =>
                setFormData({ ...formData, relatedValues: values })
              }
            />
          )}

          {currentStep === 'timebound' && (
            <TimeboundStep
              targetDate={formData.targetDate}
              milestones={formData.milestones}
              onTargetDateChange={(date) =>
                setFormData({ ...formData, targetDate: date })
              }
              onMilestonesChange={(milestones) =>
                setFormData({ ...formData, milestones })
              }
            />
          )}

          {currentStep === 'complete' && (
            <GoalSummary
              formData={formData}
              themeTitle={selectedTheme}
              onEdit={handleEditStep}
            />
          )}
        </div>

        {/* ナビゲーションボタン */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            onClick={handlePrevious}
            className="flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowBack className="w-5 h-5 mr-2" />
            戻る
          </button>

          {currentStep !== 'complete' ? (
            <button
              onClick={handleNext}
              disabled={!isStepValid()}
              className={`flex items-center px-6 py-3 rounded-lg transition-colors ${
                isStepValid()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              次へ
              <ArrowForward className="w-5 h-5 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              {saving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  保存中...
                </>
              ) : (
                <>
                  {isEditMode ? <Edit className="w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                  {isEditMode ? '目標を更新する' : '目標を設定する'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalSettingSMART;

