'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionPlan } from '@/types/auth';

interface SubscriptionManagerProps {
  onPlanChange?: (newPlan: SubscriptionPlan) => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ onPlanChange }) => {
  const { userProfile } = useAuth();
  const { 
    getCurrentPlan, 
    getPlanName, 
    getPlanDescription, 
    getPlanPrice,
    getRecommendedUpgrade,
    getUsageInfo,
    isUsageLimitReached 
  } = useSubscription();
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const currentPlan = getCurrentPlan();
  const recommendedPlan = getRecommendedUpgrade();

  const handleUpgrade = (newPlan: SubscriptionPlan) => {
    // TODO: 実際の決済処理を実装
    console.log(`プランを${getPlanName(newPlan)}にアップグレード`);
    onPlanChange?.(newPlan);
    setShowUpgradeModal(false);
  };

  const getPlanCardClass = (plan: SubscriptionPlan) => {
    const baseClass = "p-6 rounded-lg border-2 transition-all duration-200";
    
    if (plan === currentPlan) {
      return `${baseClass} border-blue-500 bg-blue-50`;
    } else if (plan === recommendedPlan) {
      return `${baseClass} border-green-500 bg-green-50 hover:border-green-600`;
    } else {
      return `${baseClass} border-gray-200 bg-white hover:border-gray-300`;
    }
  };

  return (
    <div className="space-y-6">
      {/* 現在のプラン情報 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">現在のプラン</h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {getPlanName(currentPlan)}
            </h3>
            <p className="text-gray-600">{getPlanDescription(currentPlan)}</p>
            <p className="text-sm text-gray-500 mt-1">
              月額 {getPlanPrice(currentPlan).toLocaleString()}円
            </p>
          </div>
          {recommendedPlan && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              アップグレード
            </button>
          )}
        </div>
      </div>

      {/* 利用状況 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">利用状況</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">PDCAエントリ</span>
            <UsageIndicator feature="pdcaEntries" />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">AIコメント</span>
            <UsageIndicator feature="aiComments" />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Zoom面談</span>
            <UsageIndicator feature="zoomMeetings" />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">コーチセッション</span>
            <UsageIndicator feature="coachSessions" />
          </div>
        </div>
      </div>

      {/* プラン比較 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">プラン比較</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['free', 'standard', 'premium'] as SubscriptionPlan[]).map((plan) => (
            <div key={plan} className={getPlanCardClass(plan)}>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {getPlanName(plan)}
                </h3>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  ¥{getPlanPrice(plan).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mb-4">/月</p>
                <p className="text-sm text-gray-600 mb-4">
                  {getPlanDescription(plan)}
                </p>
                
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center">
                    <span className="mr-2">✓</span>
                    <span>PDCA機能</span>
                  </div>
                  {plan !== 'free' && (
                    <div className="flex items-center">
                      <span className="mr-2">✓</span>
                      <span>AIコメント</span>
                    </div>
                  )}
                  {plan === 'premium' && (
                    <>
                      <div className="flex items-center">
                        <span className="mr-2">✓</span>
                        <span>コーチコメント</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">✓</span>
                        <span>Zoom面談</span>
                      </div>
                    </>
                  )}
                </div>

                {plan !== currentPlan && (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    {plan === 'free' ? 'ダウングレード' : 'アップグレード'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* アップグレードモーダル */}
      {showUpgradeModal && recommendedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">
              {getPlanName(recommendedPlan)}プランにアップグレード
            </h3>
            <p className="text-gray-600 mb-4">
              {getPlanDescription(recommendedPlan)}
            </p>
            <p className="text-lg font-semibold mb-6">
              月額 ¥{getPlanPrice(recommendedPlan).toLocaleString()}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleUpgrade(recommendedPlan)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                アップグレード
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 利用状況インジケーター
const UsageIndicator: React.FC<{ feature: keyof ReturnType<typeof useSubscription>['getUsageInfo'] extends (feature: infer T) => any ? T : never }> = ({ feature }) => {
  const { getUsageInfo, isUsageLimitReached } = useSubscription();
  const { current, limit } = getUsageInfo(feature);
  const isLimitReached = isUsageLimitReached(feature);

  if (limit === -1) {
    return <span className="text-green-600 text-sm">無制限</span>;
  }

  return (
    <span className={`text-sm ${isLimitReached ? 'text-red-600' : 'text-gray-600'}`}>
      {current} / {limit}
    </span>
  );
};
