import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import type { UserProfile } from '@/types/auth';
import { mapUserProfileFromAdmin } from '@/lib/server/mapUserProfileFromAdmin';

export async function getAdminUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getFirebaseAdminApp().firestore().doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  return mapUserProfileFromAdmin(uid, snap.data()!);
}
