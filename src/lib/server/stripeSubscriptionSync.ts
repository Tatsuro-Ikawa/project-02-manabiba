import type { SubscriptionPlan } from '@/types/auth';
import type Stripe from 'stripe';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { featuresForPlan } from '@/lib/subscription/planDefaults';
import type { CheckoutPlan } from '@/lib/stripe/planPrices';
import { planFromPriceId } from '@/lib/stripe/planPrices';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const KIZUKI_TRIAL_DAYS = 28;
/** 04_SUBSCRIPTION_PRODUCT_SCOPE §3.2 */
const SUBSCRIPTION_DATA_RETENTION_DAYS = 90;

function readSubscriptionUnix(
  subscription: Stripe.Subscription,
  field: 'current_period_end' | 'trial_end'
): number | undefined {
  const raw = subscription as unknown as Record<string, unknown>;
  const value = raw[field] ?? raw[field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())];
  return typeof value === 'number' ? value : undefined;
}

function readCancelAtPeriodEnd(subscription: Stripe.Subscription): boolean {
  const raw = subscription as unknown as Record<string, unknown>;
  const value = raw.cancel_at_period_end ?? raw.cancelAtPeriodEnd;
  return value === true;
}

function unixToDate(sec: number | null | undefined): Date | undefined {
  if (sec == null || !Number.isFinite(sec)) return undefined;
  return new Date(sec * 1000);
}

function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status,
  cancelAtPeriodEnd: boolean
): 'active' | 'past_due' | 'inactive' | 'cancelled' | 'expired' {
  if (stripeStatus === 'canceled') return 'expired';
  // 再請求猶予中は有料機能を継続（A-5: 猶予あり）
  if (stripeStatus === 'past_due') return 'past_due';
  if (
    cancelAtPeriodEnd &&
    (stripeStatus === 'active' || stripeStatus === 'trialing')
  ) {
    return 'cancelled';
  }
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active';
  if (stripeStatus === 'unpaid' || stripeStatus === 'incomplete' || stripeStatus === 'paused') {
    return 'inactive';
  }
  return 'inactive';
}

function resolvePlanFromSubscription(sub: Stripe.Subscription): CheckoutPlan | null {
  const priceId = sub.items.data[0]?.price?.id;
  if (priceId) {
    const fromPrice = planFromPriceId(priceId);
    if (fromPrice) return fromPrice;
  }
  const metaPlan = sub.metadata?.plan;
  if (metaPlan === 'standard' || metaPlan === 'premium') return metaPlan;
  return null;
}

export type SyncSubscriptionOptions = {
  uid: string;
  plan: CheckoutPlan;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscription: Stripe.Subscription;
};

/** Stripe Subscription を `users/{uid}.subscription` に反映（Admin SDK・Webhook 専用） */
export async function syncUserSubscriptionFromStripe(
  opts: SyncSubscriptionOptions
): Promise<void> {
  const { uid, plan, stripeCustomerId, stripeSubscriptionId, subscription } = opts;
  const db = getFirebaseAdminApp().firestore();
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new Error(`users/${uid} が存在しません。`);
  }

  const existingSub = snap.data()?.subscription as Record<string, unknown> | undefined;
  const previousPlan = existingSub?.plan as SubscriptionPlan | undefined;
  const rawConsumed = existingSub?.trialConsumedAt;
  const hadTrialConsumed =
    rawConsumed instanceof Timestamp ||
    (rawConsumed && typeof rawConsumed === 'object' && 'toDate' in rawConsumed);
  const existingUsage = (existingSub?.usage as Record<string, unknown> | undefined) ?? {};

  const status = mapStripeStatus(subscription.status, readCancelAtPeriodEnd(subscription));
  const currentPeriodEnd = unixToDate(readSubscriptionUnix(subscription, 'current_period_end'));
  const trialEnd = unixToDate(readSubscriptionUnix(subscription, 'trial_end'));

  const subscriptionPayload: Record<string, unknown> = {
    plan: plan as SubscriptionPlan,
    status,
    features: featuresForPlan(plan),
    stripeCustomerId,
    stripeSubscriptionId,
    startDate: FieldValue.serverTimestamp(),
    usage: {
      pdcaEntries: typeof existingUsage.pdcaEntries === 'number' ? existingUsage.pdcaEntries : 0,
      aiComments: typeof existingUsage.aiComments === 'number' ? existingUsage.aiComments : 0,
      zoomMeetings: typeof existingUsage.zoomMeetings === 'number' ? existingUsage.zoomMeetings : 0,
      coachSessions: typeof existingUsage.coachSessions === 'number' ? existingUsage.coachSessions : 0,
    },
  };

  const downgradedFromPremium = previousPlan === 'premium' && plan === 'standard';
  if (downgradedFromPremium) {
    const retentionEnds = new Date();
    retentionEnds.setDate(retentionEnds.getDate() + SUBSCRIPTION_DATA_RETENTION_DAYS);
    subscriptionPayload.dataRetentionEndsAt = Timestamp.fromDate(retentionEnds);
  } else if (plan === 'premium' || plan === 'standard') {
    subscriptionPayload.dataRetentionEndsAt = FieldValue.delete();
  }

  if (currentPeriodEnd) {
    subscriptionPayload.currentPeriodEnd = Timestamp.fromDate(currentPeriodEnd);
  } else {
    subscriptionPayload.currentPeriodEnd = FieldValue.delete();
  }

  if (subscription.status === 'trialing' && trialEnd) {
    subscriptionPayload.trialEndsAt = Timestamp.fromDate(trialEnd);
  } else if (trialEnd && trialEnd.getTime() > Date.now()) {
    subscriptionPayload.trialEndsAt = Timestamp.fromDate(trialEnd);
  } else {
    subscriptionPayload.trialEndsAt = FieldValue.delete();
  }

  if (!hadTrialConsumed && (subscription.status === 'trialing' || readSubscriptionUnix(subscription, 'trial_end'))) {
    subscriptionPayload.trialConsumedAt = FieldValue.serverTimestamp();
  }

  await userRef.set(
    {
      subscription: subscriptionPayload,
      enrollment: { primaryCourse: 'kizuki' },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function syncUserSubscriptionFromStripeObject(
  uid: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const plan = resolvePlanFromSubscription(subscription);
  if (!plan) {
    throw new Error(`Subscription ${subscription.id} のプランを解決できません。`);
  }
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  if (!customerId) {
    throw new Error(`Subscription ${subscription.id} に customer がありません。`);
  }
  await syncUserSubscriptionFromStripe({
    uid,
    plan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    subscription,
  });
}

export async function markSubscriptionExpired(uid: string): Promise<void> {
  const db = getFirebaseAdminApp().firestore();
  const retentionEnds = new Date();
  retentionEnds.setDate(retentionEnds.getDate() + 90);

  await db.doc(`users/${uid}`).set(
    {
      subscription: {
        plan: 'free',
        status: 'expired',
        features: featuresForPlan('free'),
        stripeSubscriptionId: FieldValue.delete(),
        trialEndsAt: FieldValue.delete(),
        currentPeriodEnd: FieldValue.delete(),
        dataRetentionEndsAt: Timestamp.fromDate(retentionEnds),
      },
      'enrollment.primaryCourse': 'start7d',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export function isEligibleForStripeTrial(
  existingSub: Record<string, unknown> | undefined
): boolean {
  const rawConsumed = existingSub?.trialConsumedAt;
  if (rawConsumed) return false;
  return true;
}

export { KIZUKI_TRIAL_DAYS };
