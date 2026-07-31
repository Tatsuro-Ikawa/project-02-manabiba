'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/context/ViewModeContext';
import { getCoachClientAssignment } from '@/lib/coachAffirmationShare';
import { getUserProfile, type UserProfile } from '@/lib/firestore';
import { hasCoachCommentsFeature } from '@/lib/subscription/planDefaults';

/** 週・月・朝晩タブのコーチ閲覧（`coachClient` URL）用コンテキスト */
export function useTrialJournalCoachContext(coachClientUid: string | null) {
  const { user, userProfile, loading } = useAuth();
  const { mode } = useViewMode();
  const loggedIn = !loading && !!user;
  const isCoachView =
    loggedIn &&
    mode === 'coach' &&
    !!userProfile &&
    (userProfile.role === 'coach' || userProfile.role === 'senior_coach');

  const contentUid = isCoachView && coachClientUid ? coachClientUid : user?.uid ?? null;
  const canEdit = !isCoachView && !!user && !loading;

  const [clientProfile, setClientProfile] = useState<UserProfile | null>(null);
  const [coachContextError, setCoachContextError] = useState<string | null>(null);
  const [coachContextReady, setCoachContextReady] = useState(!isCoachView || !coachClientUid);

  useEffect(() => {
    if (!isCoachView || !coachClientUid || !user) {
      setClientProfile(null);
      setCoachContextError(null);
      setCoachContextReady(true);
      return;
    }
    let cancelled = false;
    setCoachContextReady(false);
    setCoachContextError(null);
    void (async () => {
      try {
        const assignment = await getCoachClientAssignment(user.uid, coachClientUid);
        if (!assignment) {
          if (!cancelled) {
            setCoachContextError(
              `担当コーチの割当がありません。coach_client_assignments の ID「${user.uid}_${coachClientUid}」を確認してください。`
            );
            setClientProfile(null);
          }
          return;
        }
        const prof = await getUserProfile(coachClientUid);
        if (!cancelled) setClientProfile(prof);
      } catch (e) {
        console.error('journal coach context load error:', e);
        if (!cancelled) {
          setCoachContextError('クライアント情報の取得に失敗しました。');
          setClientProfile(null);
        }
      } finally {
        if (!cancelled) setCoachContextReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCoachView, coachClientUid, user]);

  const journalProfile = isCoachView ? clientProfile : userProfile;
  const coachCommentsEnabled = hasCoachCommentsFeature(journalProfile);

  return {
    user,
    loading,
    loggedIn,
    isCoachView,
    contentUid,
    canEdit,
    journalProfile,
    coachCommentsEnabled,
    coachContextError,
    coachContextReady,
  };
}
