import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  SubscriptionPlan, 
  FeatureAccess, 
  UsageLimits,
  SubscriptionInfo 
} from '@/types/auth';

// サブスクリプションプランの機能定義
export const SUBSCRIPTION_PLANS = {
  free: {
    pdca: true,
    aiComments: false,
    coachComments: false,
    zoomMeetings: false,
    communityAccess: false,
    advancedAnalytics: false,
  },
  standard: {
    pdca: true,
    aiComments: true,
    coachComments: false,
    zoomMeetings: false,
    communityAccess: true,
    advancedAnalytics: false,
  },
  premium: {
    pdca: true,
    aiComments: true,
    coachComments: true,
    zoomMeetings: true,
    communityAccess: true,
    advancedAnalytics: true,
  },
} as const;

// 利用制限の定義
export const USAGE_LIMITS = {
  free: {
    pdcaEntries: 30, // 30日分
    aiComments: 0,
    zoomMeetings: 0,
    coachSessions: 0,
  },
  standard: {
    pdcaEntries: -1, // 無制限
    aiComments: 50, // 月50回
    zoomMeetings: 0,
    coachSessions: 0,
  },
  premium: {
    pdcaEntries: -1, // 無制限
    aiComments: -1, // 無制限
    zoomMeetings: 4, // 月4回
    coachSessions: 2, // 月2回
  },
} as const;

export const useSubscription = () => {
  const { userProfile } = useAuth();
  const [currentUsage, setCurrentUsage] = useState<UsageLimits>({
    pdcaEntries: 0,
    aiComments: 0,
    zoomMeetings: 0,
    coachSessions: 0,
  });

  // 現在のプランを取得
  const getCurrentPlan = useCallback((): SubscriptionPlan => {
    return userProfile?.subscription?.plan || 'free';
  }, [userProfile]);

  // 機能が利用可能かチェック
  const canUseFeature = useCallback((feature: keyof FeatureAccess): boolean => {
    const plan = getCurrentPlan();
    return SUBSCRIPTION_PLANS[plan][feature] || false;
  }, [getCurrentPlan]);

  // 利用制限を取得
  const getUsageLimit = useCallback((feature: keyof UsageLimits): number => {
    const plan = getCurrentPlan();
    return USAGE_LIMITS[plan][feature] || 0;
  }, [getCurrentPlan]);

  // 利用状況を取得
  const getUsageInfo = useCallback((feature: keyof UsageLimits) => {
    const limit = getUsageLimit(feature);
    const current = currentUsage[feature];
    return { current, limit };
  }, [getUsageLimit, currentUsage]);

  // 利用制限に達しているかチェック
  const isUsageLimitReached = useCallback((feature: keyof UsageLimits): boolean => {
    const { current, limit } = getUsageInfo(feature);
    return limit > 0 && current >= limit;
  }, [getUsageInfo]);

  // 利用状況を更新
  const updateUsage = useCallback(async (feature: keyof UsageLimits, increment: number = 1) => {
    setCurrentUsage(prev => ({
      ...prev,
      [feature]: prev[feature] + increment,
    }));

    // Firestoreに永続化
    if (userProfile?.uid) {
      try {
        const newUsage = {
          ...currentUsage,
          [feature]: currentUsage[feature] + increment,
        };
        
        // Firestore関数をインポートして使用
        const { updateUsageLimits } = await import('@/lib/firestore');
        await updateUsageLimits(userProfile.uid, newUsage);
        
        console.log(`${feature}の利用状況を更新しました:`, newUsage[feature]);
      } catch (error) {
        console.error('利用状況の永続化エラー:', error);
      }
    }
  }, [currentUsage, userProfile?.uid]);

  // 利用状況をリセット
  const resetUsage = useCallback((feature?: keyof UsageLimits) => {
    if (feature) {
      setCurrentUsage(prev => ({
        ...prev,
        [feature]: 0,
      }));
    } else {
      setCurrentUsage({
        pdcaEntries: 0,
        aiComments: 0,
        zoomMeetings: 0,
        coachSessions: 0,
      });
    }
  }, []);

  // プラン名を日本語で取得
  const getPlanName = useCallback((plan: SubscriptionPlan): string => {
    switch (plan) {
      case 'free': return 'フリー';
      case 'standard': return 'スタンダード';
      case 'premium': return 'プレミアム';
      default: return 'フリー';
    }
  }, []);

  // プランの説明を取得
  const getPlanDescription = useCallback((plan: SubscriptionPlan): string => {
    switch (plan) {
      case 'free': return '基本的なPDCA機能を30日間利用可能';
      case 'standard': return 'AIコメント機能とコミュニティアクセス付き';
      case 'premium': return 'コーチコメント、Zoom面談、高度な分析機能付き';
      default: return '基本的なPDCA機能を30日間利用可能';
    }
  }, []);

  // プランの価格を取得
  const getPlanPrice = useCallback((plan: SubscriptionPlan): number => {
    switch (plan) {
      case 'free': return 0;
      case 'standard': return 980;
      case 'premium': return 2980;
      default: return 0;
    }
  }, []);

  // アップグレード推奨プランを取得
  const getRecommendedUpgrade = useCallback((): SubscriptionPlan | null => {
    const currentPlan = getCurrentPlan();
    
    if (currentPlan === 'free') {
      return 'standard';
    } else if (currentPlan === 'standard') {
      return 'premium';
    }
    
    return null;
  }, [getCurrentPlan]);

  // 初期利用状況の読み込み
  useEffect(() => {
    if (userProfile?.subscription?.usage) {
      setCurrentUsage(userProfile.subscription.usage);
    }
  }, [userProfile]);

  return {
    // 状態
    subscription: userProfile?.subscription,
    currentUsage,
    
    // プラン情報
    getCurrentPlan,
    getPlanName,
    getPlanDescription,
    getPlanPrice,
    getRecommendedUpgrade,
    
    // 機能チェック
    canUseFeature,
    getUsageInfo,
    isUsageLimitReached,
    
    // 利用状況管理
    updateUsage,
    resetUsage,
  };
};
