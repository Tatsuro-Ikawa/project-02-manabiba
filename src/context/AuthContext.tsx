'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { signInWithGoogle, signOutUser, onAuthStateChange } from '@/lib/auth';
import { 
  getUserProfile, 
  createDefaultUserProfile, 
  updateLastLogin,
  checkUserPermission 
} from '@/lib/firestore';
import { AuthContextType, AuthState, UserProfile, FeatureAccess, UsageLimits, UserRole } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userProfile: null,
    loading: true,
  });

  // ユーザープロファイルを取得または作成
  const fetchOrCreateUserProfile = async (user: User): Promise<UserProfile> => {
    try {
      console.log('ユーザープロファイル取得開始:', user.uid);
      let userProfile = await getUserProfile(user.uid);
      
      if (!userProfile) {
        // 新規ユーザーの場合、デフォルトプロファイルを作成
        console.log('新規ユーザー: デフォルトプロファイルを作成中...');
        userProfile = await createDefaultUserProfile(user);
        console.log('新規ユーザープロファイルを作成しました:', userProfile);
      } else {
        // 既存ユーザーの場合、最終ログイン時間を更新
        console.log('既存ユーザー: 最終ログイン時間を更新中...');
        await updateLastLogin(user.uid);
        console.log('既存ユーザープロファイルを取得しました:', userProfile);
      }
      
      return userProfile;
    } catch (error) {
      console.error('ユーザープロファイル取得エラー:', error);
      throw error;
    }
  };

  // 機能が利用可能かチェック
  const canUseFeature = (feature: keyof FeatureAccess): boolean => {
    if (!authState.userProfile) return false;
    return authState.userProfile.subscription.features[feature] || false;
  };

  // ロールチェック
  const hasRole = (role: UserRole): boolean => {
    if (!authState.userProfile) return false;
    return authState.userProfile.role === role;
  };

  // 利用状況を取得
  const getUsageInfo = (feature: keyof UsageLimits) => {
    if (!authState.userProfile) {
      return { current: 0, limit: 0 };
    }
    
    const current = authState.userProfile.subscription.usage[feature];
    const plan = authState.userProfile.subscription.plan;
    
    // 利用制限の定義
    const limits = {
      free: {
        pdcaEntries: 30,
        aiComments: 0,
        zoomMeetings: 0,
        coachSessions: 0,
      },
      standard: {
        pdcaEntries: -1, // 無制限
        aiComments: 50,
        zoomMeetings: 0,
        coachSessions: 0,
      },
      premium: {
        pdcaEntries: -1, // 無制限
        aiComments: -1, // 無制限
        zoomMeetings: 4,
        coachSessions: 2,
      },
    };
    
    const limit = limits[plan][feature];
    return { current, limit };
  };

  // ユーザープロファイルを更新
  const refreshUserProfile = async (): Promise<void> => {
    if (!authState.user) return;
    
    try {
      const userProfile = await getUserProfile(authState.user.uid);
      if (userProfile) {
        setAuthState(prev => ({
          ...prev,
          userProfile,
        }));
      }
    } catch (error) {
      console.error('ユーザープロファイル更新エラー:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user: User | null) => {
      console.log('認証状態変更:', user ? 'ログイン済み' : '未ログイン');
      
      if (user) {
        try {
          // ユーザープロファイルを取得または作成
          const userProfile = await fetchOrCreateUserProfile(user);
          
          setAuthState({
            user,
            userProfile,
            loading: false,
          });
        } catch (error) {
          console.error('ユーザープロファイル処理エラー:', error);
          setAuthState({
            user,
            userProfile: null,
            loading: false,
          });
        }
      } else {
        setAuthState({
          user: null,
          userProfile: null,
          loading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignInWithGoogle = async (): Promise<User> => {
    return await signInWithGoogle();
  };

  const handleSignOut = async (): Promise<void> => {
    await signOutUser();
  };

  const value: AuthContextType = {
    user: authState.user,
    userProfile: authState.userProfile,
    loading: authState.loading,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    refreshUserProfile,
    canUseFeature,
    hasRole,
    getUsageInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 