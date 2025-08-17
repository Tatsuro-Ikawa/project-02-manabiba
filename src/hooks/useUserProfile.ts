import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { getUserProfile, createUserProfile, updateUserProfile, UserProfile } from '@/lib/firestore';

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const userProfile = await getUserProfile(user.uid);
        setProfile(userProfile);
      } catch (err) {
        console.error('プロフィール取得エラー:', err);
        setError('プロフィールの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const createProfile = async (profileData: Omit<UserProfile, 'uid' | 'profileCreatedAt' | 'profileUpdatedAt'>) => {
    if (!user) {
      throw new Error('ユーザーが認証されていません');
    }

    try {
      setError(null);
      await createUserProfile({
        uid: user.uid,
        ...profileData,
      });
      
      // プロフィールを再取得して状態を更新
      const newProfile = await getUserProfile(user.uid);
      setProfile(newProfile);
      
      // 状態更新の完了を確実に待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return newProfile;
    } catch (err) {
      console.error('プロフィール作成エラー:', err);
      setError('プロフィールの作成に失敗しました');
      throw err;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      throw new Error('ユーザーが認証されていません');
    }

    try {
      setError(null);
      await updateUserProfile(user.uid, updates);
      
      // プロフィールを再取得
      const updatedProfile = await getUserProfile(user.uid);
      setProfile(updatedProfile);
    } catch (err) {
      console.error('プロフィール更新エラー:', err);
      setError('プロフィールの更新に失敗しました');
      throw err;
    }
  };

  return {
    profile,
    loading,
    error,
    createProfile,
    updateProfile,
    exists: !!profile,
  };
};
