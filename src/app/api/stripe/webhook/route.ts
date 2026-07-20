import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { getStripeClient, getStripeWebhookSecret } from '@/lib/server/stripeClient';
import {
  markSubscriptionExpired,
  syncUserSubscriptionFromStripe,
  syncUserSubscriptionFromStripeObject,
} from '@/lib/server/stripeSubscriptionSync';
import { isCheckoutPlan } from '@/lib/stripe/planPrices';

export const runtime = 'nodejs';

async function isEventProcessed(eventId: string): Promise<boolean> {
  const ref = getFirebaseAdminApp().firestore().doc(`stripe_webhook_events/${eventId}`);
  const snap = await ref.get();
  return snap.exists;
}

async function markEventProcessed(eventId: string, type: string): Promise<void> {
  await getFirebaseAdminApp()
    .firestore()
    .doc(`stripe_webhook_events/${eventId}`)
    .set({
      type,
      processedAt: FieldValue.serverTimestamp(),
    });
}

function resolveUidFromSubscription(sub: Stripe.Subscription): string | null {
  const uid = sub.metadata?.firebaseUid?.trim();
  return uid || null;
}

function resolveUidFromSession(session: Stripe.Checkout.Session): string | null {
  const fromMeta = session.metadata?.firebaseUid?.trim();
  if (fromMeta) return fromMeta;
  const fromRef = session.client_reference_id?.trim();
  return fromRef || null;
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const uid = resolveUidFromSession(session);
  if (!uid) {
    throw new Error('checkout.session.completed: firebaseUid が見つかりません。');
  }

  const planRaw = session.metadata?.plan;
  if (!isCheckoutPlan(planRaw)) {
    throw new Error('checkout.session.completed: plan metadata が不正です。');
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;

  if (!subscriptionId || !customerId) {
    throw new Error('checkout.session.completed: subscription / customer が不足しています。');
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await syncUserSubscriptionFromStripe({
    uid,
    plan: planRaw,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    subscription,
  });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const uid = resolveUidFromSubscription(sub);
  if (!uid) {
    console.warn('customer.subscription.updated: firebaseUid なし', sub.id);
    return;
  }
  await syncUserSubscriptionFromStripeObject(uid, sub);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const uid = resolveUidFromSubscription(sub);
  if (!uid) {
    console.warn('customer.subscription.deleted: firebaseUid なし', sub.id);
    return;
  }
  await markSubscriptionExpired(uid);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'stripe-signature がありません。' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (e) {
    console.error('stripe webhook signature error:', e);
    return NextResponse.json({ error: '署名検証に失敗しました。' }, { status: 400 });
  }

  if (await isEventProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
    await markEventProcessed(event.id, event.type);
  } catch (e) {
    console.error(`stripe webhook handler error (${event.type}):`, e);
    return NextResponse.json({ error: 'Webhook 処理に失敗しました。' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
