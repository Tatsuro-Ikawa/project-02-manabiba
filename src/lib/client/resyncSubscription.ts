import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types/auth';
import { buildJsonAuthHeaders } from '@/lib/clientAuthHeaders';

/** 請求期間が未保存、または保存済みの請求期間・お試し期限を過ぎていれば、Webhook 未達の可能性がある */
export function isSubscriptionMirrorStale(profile: UserProfile, now = Date.now()): boolean {
  const sub = profile.subscription;
  if (!sub?.stripeSubscriptionId || sub.status === 'expired') return false;
  const periodEnd = sub.currentPeriodEnd?.getTime();
  const trialEnd = sub.trialEndsAt?.getTime();
  return periodEnd === undefined || periodEnd <= now || (trialEnd !== undefined && trialEnd <= now);
}

/** @returns Firestore が書き換わった場合 true */
export async function resyncSubscriptionFromStripe(user: User): Promise<boolean> {
  const authHeaders = await buildJsonAuthHeaders(user);
  const res = await fetch('/api/stripe/resync-subscription', { method: 'POST', headers: authHeaders });
  if (!res.ok) return false;
  const json = (await res.json().catch(() => ({}))) as { result?: string };
  return json.result === 'synced' || json.result === 'expired';
}
