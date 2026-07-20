import { NextRequest, NextResponse } from 'next/server';
import { getAdminUserProfile } from '@/lib/server/adminUserProfile';
import { requireBearerUid } from '@/lib/server/bearerAuth';
import { resolveAppBaseUrl } from '@/lib/server/appBaseUrl';
import { getStripeClient, isStripeConfigured } from '@/lib/server/stripeClient';

export const runtime = 'nodejs';

type PortalBody = {
  returnPath?: unknown;
};

function normalizeReturnPath(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return '/courses/change';
  const path = raw.trim();
  return path.startsWith('/') ? path : `/${path}`;
}

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe が未設定です。STRIPE_SECRET_KEY を設定してください。' },
      { status: 503 }
    );
  }

  const auth = await requireBearerUid(request);
  if (!auth.ok) return auth.response;

  let body: PortalBody = {};
  try {
    body = (await request.json()) as PortalBody;
  } catch {
    body = {};
  }

  const profile = await getAdminUserProfile(auth.uid);
  if (!profile) {
    return NextResponse.json({ error: 'ユーザープロフィールがありません。' }, { status: 404 });
  }

  const customerId = profile.subscription?.stripeCustomerId?.trim();
  if (!customerId) {
    return NextResponse.json(
      {
        error:
          'Stripe の契約情報がありません。お申し込みが完了していない場合は、先に有料プランへお申し込みください。',
      },
      { status: 404 }
    );
  }

  try {
    const stripe = getStripeClient();
    const baseUrl = resolveAppBaseUrl(request);
    const returnPath = normalizeReturnPath(body.returnPath);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}${returnPath}`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Portal URL の生成に失敗しました。' }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('stripe customer-portal error:', e);
    const msg = e instanceof Error ? e.message : 'Customer Portal の作成に失敗しました。';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
