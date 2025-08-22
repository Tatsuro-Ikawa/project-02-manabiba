'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionInfo, SubscriptionPlan, SUBSCRIPTION_PLANS } from '@/types/subscription';

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  loading: boolean;
  canUseFeature: (feature: keyof typeof SUBSCRIPTION_PLANS.free) => boolean;
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
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // ユーザーのサブスクリプション情報を取得
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      try {
        // TODO: Firestoreからサブスクリプション情報を取得
        // 仮の実装として、フリープランを設定
        const defaultSubscription: SubscriptionInfo = {
          plan: 'free',
          features: SUBSCRIPTION_PLANS.free,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        setSubscription(defaultSubscription);
      } catch (error) {
        console.error('サブスクリプション情報取得エラー:', error);
        // エラー時はフリープランを設定
        const fallbackSubscription: SubscriptionInfo = {
          plan: 'free',
          features: SUBSCRIPTION_PLANS.free,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setSubscription(fallbackSubscription);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  // 機能の利用可否を判定
  const canUseFeature = (feature: keyof typeof SUBSCRIPTION_PLANS.free): boolean => {
    if (!subscription) return false;
    
    const featureValue = subscription.features[feature];
    
    if (typeof featureValue === 'boolean') {
      return featureValue;
    }
    
    if (featureValue === 'limited') {
      // フリープランの制限をチェック
      // TODO: 具体的な制限ロジックを実装
      return true;
    }
    
    return featureValue === 'full' || featureValue === 'trial';
  };

  // プランアップグレード
  const upgradePlan = async (plan: SubscriptionPlan): Promise<void> => {
    if (!user) throw new Error('ユーザーが認証されていません');
    
    try {
      // TODO: 決済処理とサブスクリプション更新
      const updatedSubscription: SubscriptionInfo = {
        ...subscription!,
        plan,
        features: SUBSCRIPTION_PLANS[plan],
        updatedAt: new Date(),
      };
      
      setSubscription(updatedSubscription);
    } catch (error) {
      console.error('プランアップグレードエラー:', error);
      throw error;
    }
  };

  // トライアル日数を取得
  const getTrialDays = (): number => {
    if (!subscription?.trialEndDate) return 0;
    
    const now = new Date();
    const trialEnd = new Date(subscription.trialEndDate);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  // 面談クレジット数を取得
  const getMeetingCredits = (): number => {
    return subscription?.meetingCredits || 0;
  };

  const value: SubscriptionContextType = {
    subscription,
    loading,
    canUseFeature,
    upgradePlan,
    getTrialDays,
    getMeetingCredits,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
