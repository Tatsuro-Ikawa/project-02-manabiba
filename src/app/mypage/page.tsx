'use client';

import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePDCA } from '@/hooks/usePDCA';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { CreatePageModal } from '@/components/CreatePageModal';
import { PDCAInputModal } from '@/components/PDCAInputModal';
import { DateSelector } from '@/components/DateSelector';
import { Calendar } from '@/components/Calendar';
import { GoalManager } from '@/components/GoalManager';
import { AIAnalysisPanel } from '@/components/AIAnalysisPanel';
import { SubscriptionManager } from '@/components/SubscriptionManager';
import { AuthSystemTest } from '@/components/AuthSystemTest';
import { SubscriptionPlan } from '@/types/auth';

export default function MyPage() {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, exists: profileExists } = useUserProfile();
  const { 
    selectedDate, 
    currentPDCA, 
    allEntries,
    loading: pdcaLoading, 
    updatePDCA, 
    selectDate, 
    goToToday,
    fetchPDCA
  } = usePDCA();
  const router = useRouter();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPDCAModal, setShowPDCAModal] = useState(false);
  const [pdcaType, setPdcaType] = useState<'plan' | 'do' | 'check' | 'action'>('plan');
  const [isCreating, setIsCreating] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); // 強制更新用

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      alert('ログアウトに失敗しました。');
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const handlePDCAInput = (type: 'plan' | 'do' | 'check' | 'action') => {
    setPdcaType(type);
    setShowPDCAModal(true);
  };

  const getCurrentValue = (type: 'plan' | 'do' | 'check' | 'action') => {
    return currentPDCA?.[type] || '';
  };

  // 日付選択ハンドラー
  const handleDateSelect = (date: Date) => {
    selectDate(date);
  };

  // 今日ボタンハンドラー
  const handleTodayClick = () => {
    goToToday();
  };

  // PDCA更新成功時のコールバック
  const handlePDCASuccess = async () => {
    console.log('PDCA更新完了 - コールバック実行');
    console.log('現在のcurrentPDCA:', currentPDCA);
    
    // 強制的にPDCAデータを再取得
    try {
      await fetchPDCA();
      console.log('PDCAデータ再取得完了');
      
      // 強制更新をトリガー
      setForceUpdate(prev => prev + 1);
    } catch (error) {
      console.error('PDCAデータ再取得エラー:', error);
    }
  };

  const handleCreateStart = () => {
    setIsCreating(true);
    setShowCreateModal(false);
  };

  const handleCreateComplete = () => {
    setIsCreating(false);
    setProfileCreated(true);
  };

  const handleShowMyPage = () => {
    setProfileCreated(false);
    // 強制的に再描画を促す
    window.location.reload();
  };

  const handlePlanChange = (newPlan: SubscriptionPlan) => {
    console.log(`プランが${newPlan}に変更されました`);
    // TODO: 実際のプラン変更処理を実装
  };

  // プロフィール作成開始から一定時間後にローディング状態を解除
  useEffect(() => {
    if (isCreating) {
      const timer = setTimeout(() => {
        handleCreateComplete();
      }, 2000); // 2秒後に完了状態に移行

      return () => clearTimeout(timer);
    }
  }, [isCreating]);

  // プロフィール存在確認でローディング状態を解除
  useEffect(() => {
    if (isCreating && profileExists && !profileLoading) {
      // プロフィールが存在し、ローディングが完了したらローディング状態を解除
      const timer = setTimeout(() => {
        handleCreateComplete();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isCreating, profileExists, profileLoading]);

  // デバッグ用: currentPDCAの変更を監視
  useEffect(() => {
    console.log('currentPDCA変更:', currentPDCA);
  }, [currentPDCA]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
        {/* ヘッダー */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">マイページ</h1>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {profileLoading ? (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="text-center">読み込み中...</div>
            </div>
          ) : isCreating ? (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold mb-2">マイページを作成中...</h2>
                <p className="text-gray-600">しばらくお待ちください</p>
              </div>
            </div>
          ) : profileCreated ? (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="text-center">
                <div className="text-green-600 text-6xl mb-4">✓</div>
                <h2 className="text-xl font-semibold mb-2">マイページの作成が完了しました！</h2>
                <p className="text-gray-600 mb-4">マイページを表示してPDCA日記を始めましょう</p>
                <button
                  onClick={handleShowMyPage}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  マイページを表示
                </button>
              </div>
            </div>
          ) : !profileExists ? (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4">マイページが作成されていません</h2>
                <p className="text-gray-600 mb-4">マイページを作成してPDCA日記を始めましょう</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  マイページを作成
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ユーザー情報 */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">ユーザー情報</h2>
                <div className="space-y-2">
                  <p><span className="font-medium">こんにちは、</span>{profile?.nickname}さん</p>
                  {profile?.bio && <p><span className="font-medium">自己紹介:</span> {profile.bio}</p>}
                  {profile?.location && <p><span className="font-medium">所在地:</span> {profile.location}</p>}
                </div>
              </div>

              {/* Phase 0-4: サブスクリプション管理 */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">サブスクリプション管理</h2>
                <SubscriptionManager onPlanChange={handlePlanChange} />
              </div>

              {/* Phase 0-4: 認証システム拡張テスト */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">認証システム拡張テスト</h2>
                <AuthSystemTest />
              </div>

              {/* カレンダー */}
              <Calendar
                allEntries={allEntries}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />

              {/* 日付選択 */}
              <DateSelector
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onTodayClick={handleTodayClick}
              />

              {/* PDCA日記 */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">PDCA日記</h2>
                </div>

                {pdcaLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">読み込み中...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Plan */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-2 text-blue-600">Plan - 今日の目標</h3>
                      {currentPDCA?.plan ? (
                        <div>
                          <p className="text-gray-700 mb-2">{currentPDCA.plan}</p>
                          <button
                            onClick={() => handlePDCAInput('plan')}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            編集
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePDCAInput('plan')}
                          className="w-full text-left p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200"
                        >
                          <span className="text-gray-500">今日の目標を設定する</span>
                        </button>
                      )}
                    </div>

                    {/* Do */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-2 text-green-600">Do - 今日の行動計画</h3>
                      {currentPDCA?.do ? (
                        <div>
                          <p className="text-gray-700 mb-2">{currentPDCA.do}</p>
                          <button
                            onClick={() => handlePDCAInput('do')}
                            className="text-sm text-green-600 hover:text-green-800"
                          >
                            編集
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePDCAInput('do')}
                          className="w-full text-left p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors duration-200"
                        >
                          <span className="text-gray-500">今日の行動計画を立てる</span>
                        </button>
                      )}
                    </div>

                    {/* Check */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-2 text-yellow-600">Check - 行動の結果</h3>
                      {currentPDCA?.check ? (
                        <div>
                          <p className="text-gray-700 mb-2">{currentPDCA.check}</p>
                          <button
                            onClick={() => handlePDCAInput('check')}
                            className="text-sm text-yellow-600 hover:text-yellow-800"
                          >
                            編集
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePDCAInput('check')}
                          className="w-full text-left p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-colors duration-200"
                        >
                          <span className="text-gray-500">行動の結果を振り返る</span>
                        </button>
                      )}
                    </div>

                    {/* Action */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-2 text-red-600">Action - 明日への改善</h3>
                      {currentPDCA?.action ? (
                        <div>
                          <p className="text-gray-700 mb-2">{currentPDCA.action}</p>
                          <button
                            onClick={() => handlePDCAInput('action')}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            編集
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePDCAInput('action')}
                          className="w-full text-left p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors duration-200"
                        >
                          <span className="text-gray-500">明日への改善を考える</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Phase 0-3: コーチング機能 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* 目標管理 */}
                <GoalManager onGoalUpdate={() => {
                  // 目標更新時の処理
                  console.log('目標が更新されました');
                }} />

                {/* AI分析 */}
                <AIAnalysisPanel onAnalysisComplete={() => {
                  // 分析完了時の処理
                  console.log('AI分析が完了しました');
                }} />
              </div>
            </>
          )}

          {/* アクションボタン */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">アクション</h2>
            <div className="space-y-3">
              <button
                onClick={handleBackToHome}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                ホームに戻る
              </button>
            </div>
          </div>
        </div>

        {/* モーダル */}
        <CreatePageModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            handleCreateStart();
          }}
        />

        <PDCAInputModal
          isOpen={showPDCAModal}
          onClose={() => setShowPDCAModal(false)}
          onSuccess={handlePDCASuccess}
          type={pdcaType}
          currentValue={getCurrentValue(pdcaType)}
        />
      </div>
    </AuthGuard>
  );
} 