'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionInfo, SubscriptionPlan, SUBSCRIPTION_PLANS } from '@/types/subscription';
import { buildSubscriptionUiModel } from '@/lib/subscription/buildSubscriptionUiModel';
import { resolveEntitlements } from '@/lib/subscription/resolveEntitlements';
import type { FeatureKey } from '@/lib/subscription/featureKeys';

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  loading: boolean;
  /** 旧 UI 用（`SUBSCRIPTION_PLANS` 由来のキー） */
  canUseFeature: (feature: keyof typeof SUBSCRIPTION_PLANS.free) => boolean;
  /** entitlement キーで判定（サーバーと同じ `resolveEntitlements`） */
  canUseEntitlement: (key: FeatureKey) => boolean;
  upgradePlan: (plan: SubscriptionPlan) => Promise<void>;
  getTrialDays: () => number;
  getMeetingCredits: () => number;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user, userProfile, loading: authLoading } = useAuth();

  const loading = authLoading;

  const subscription = useMemo((): SubscriptionInfo | null => {
    if (!user || !userProfile) return null;
    return buildSubscriptionUiModel(userProfile);
  }, [user, userProfile]);

  const entitlements = useMemo(() => {
    if (!userProfile) return null;
    return resolveEntitlements(userProfile);
  }, [userProfile]);

  const canUseFeature = (feature: keyof typeof SUBSCRIPTION_PLANS.free): boolean => {
    if (!subscription) return false;
    const featureValue = subscription.features[feature];
    if (typeof featureValue === 'boolean') return featureValue;
    if (featureValue === 'limited') return true;
    return featureValue === 'full' || featureValue === 'trial';
  };

  const canUseEntitlement = (key: FeatureKey): boolean => {
    return entitlements?.[key] ?? false;
  };

  const upgradePlan = async (plan: SubscriptionPlan): Promise<void> => {
    if (!user) throw new Error('ユーザーが認証されていません');
    // 決済（Phase C）までローカルのみ更新しない。Stripe 連携後に差し替え。
    console.warn('upgradePlan: 決済未実装のため UI のみ。Firestore は更新しません。', plan);
  };

  const getTrialDays = (): number => {
    const end = userProfile?.subscription.trialEndsAt;
    if (!end) return 0;
    const diffTime = end.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const getMeetingCredits = (): number => {
    return subscription?.meetingCredits || 0;
  };

  const value: SubscriptionContextType = {
    subscription,
    loading,
    canUseFeature,
    canUseEntitlement,
    upgradePlan,
    getTrialDays,
    getMeetingCredits,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};
