'use client';

import React, { ReactNode } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';

interface FeatureGuardProps {
  feature: keyof typeof SUBSCRIPTION_PLANS.free;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}) => {
  const { canUseFeature, subscription } = useSubscription();

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          この機能は利用できません
        </h3>
        <p className="text-gray-600 mb-4">
          現在のプラン（{subscription?.plan}）ではこの機能をご利用いただけません。
        </p>
        <button
          onClick={() => {
            // TODO: プラン選択モーダルを開く
            console.log('プランアップグレードを促す');
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          プランをアップグレード
        </button>
      </div>
    </div>
  );
};

// 特定の機能に対する制限表示コンポーネント
export const FeatureLimitIndicator: React.FC<{
  feature: keyof typeof SUBSCRIPTION_PLANS.free;
  currentUsage: number;
  limit: number;
}> = ({ feature, currentUsage, limit }) => {
  const { subscription } = useSubscription();
  const usagePercentage = (currentUsage / limit) * 100;

  return (
    <div className="text-sm text-gray-600">
      <div className="flex justify-between items-center mb-1">
        <span>利用状況</span>
        <span>{currentUsage} / {limit}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            usagePercentage > 80 ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
        />
      </div>
      {usagePercentage > 80 && (
        <p className="text-xs text-red-600 mt-1">
          利用制限に近づいています
        </p>
      )}
    </div>
  );
};
