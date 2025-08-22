'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/context/SubscriptionContext';
import { FeatureGuard } from './FeatureGuard';
import { RoleGuard } from './RoleGuard';
import { SubscriptionPlan, UserRole } from '@/types/auth';

export const AuthSystemTest: React.FC = () => {
  const { user } = useAuth();
  const { 
    subscription,
    canUseFeature,
    upgradePlan,
    getTrialDays,
    getMeetingCredits
  } = useSubscription();
  
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runAllTests = () => {
    setTestResults([]);
    
    // テスト1: ユーザー確認
    addTestResult(`ユーザー: ${user?.email || '未ログイン'}`);
    addTestResult(`サブスクリプション: ${subscription ? '存在' : '未作成'}`);
    
    if (subscription) {
      addTestResult(`プラン: ${subscription.plan}`);
      addTestResult(`トライアル日数: ${getTrialDays()}日`);
      addTestResult(`面談クレジット: ${getMeetingCredits()}回`);
    }

    // テスト2: 機能アクセス確認
    const features = ['selfUnderstanding', 'goalSetting', 'pdcaFunction', 'aiComment', 'zoomMeeting', 'coachComment'] as const;
    features.forEach(feature => {
      const canUse = canUseFeature(feature);
      addTestResult(`${feature}: ${canUse ? '利用可能' : '利用不可'}`);
    });
  };

  const testFeatureGuard = () => {
    addTestResult('=== FeatureGuardテスト開始 ===');
  };

  const testRoleGuard = () => {
    addTestResult('=== RoleGuardテスト開始 ===');
  };

  const testPlanUpgrade = async () => {
    try {
      await upgradePlan('standard');
      addTestResult('プランをスタンダードにアップグレードしました');
    } catch (error) {
      addTestResult(`プランアップグレードエラー: ${error}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">認証システム拡張テスト</h2>
      
      {/* テストボタン */}
      <div className="space-y-2 mb-6">
        <button
          onClick={runAllTests}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          全テスト実行
        </button>
        <button
          onClick={testFeatureGuard}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          FeatureGuardテスト
        </button>
        <button
          onClick={testRoleGuard}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          RoleGuardテスト
        </button>
        <button
          onClick={testPlanUpgrade}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          プランアップグレードテスト
        </button>
      </div>

      {/* テスト結果表示 */}
      <div className="bg-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto">
        <h3 className="font-semibold mb-2">テスト結果:</h3>
        {testResults.length === 0 ? (
          <p className="text-gray-500">テストを実行してください</p>
        ) : (
                   <div className="space-y-1">
           {testResults.map((result, index) => (
             <div key={index} className="text-sm font-mono bg-white p-1 rounded text-gray-800">
               {result}
             </div>
           ))}
         </div>
        )}
      </div>

      {/* FeatureGuardテスト */}
      <div className="mt-6 space-y-4">
        <h3 className="font-semibold">FeatureGuardテスト:</h3>
        
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">PDCA機能:</h4>
          <FeatureGuard feature="pdcaFunction">
            <div className="bg-green-100 p-2 rounded">✓ PDCA機能が利用可能です</div>
          </FeatureGuard>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">AIコメント機能 (Standard以上):</h4>
          <FeatureGuard feature="aiComment">
            <div className="bg-green-100 p-2 rounded">✓ AIコメント機能が利用可能です</div>
          </FeatureGuard>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">コーチコメント機能 (Premiumのみ):</h4>
          <FeatureGuard feature="coachComment">
            <div className="bg-green-100 p-2 rounded">✓ コーチコメント機能が利用可能です</div>
          </FeatureGuard>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">Zoom面談機能 (Premiumのみ):</h4>
          <FeatureGuard feature="zoomMeeting">
            <div className="bg-green-100 p-2 rounded">✓ Zoom面談機能が利用可能です</div>
          </FeatureGuard>
        </div>
      </div>

      {/* RoleGuardテスト */}
      <div className="mt-6 space-y-4">
        <h3 className="font-semibold">RoleGuardテスト:</h3>
        
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">ユーザーロール:</h4>
          <RoleGuard requiredRole="user">
            <div className="bg-green-100 p-2 rounded">✓ ユーザー権限があります</div>
          </RoleGuard>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">コーチロール:</h4>
          <RoleGuard requiredRole="coach">
            <div className="bg-green-100 p-2 rounded">✓ コーチ権限があります</div>
          </RoleGuard>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">管理者ロール:</h4>
          <RoleGuard requiredRole="admin">
            <div className="bg-green-100 p-2 rounded">✓ 管理者権限があります</div>
          </RoleGuard>
        </div>
      </div>
    </div>
  );
};
