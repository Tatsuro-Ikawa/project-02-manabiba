import { NextResponse, type NextRequest } from 'next/server';
import { apiJsonError } from '@/lib/api/apiJsonError';
import { getAdminUserProfile } from '@/lib/server/adminUserProfile';
import { requireBearerUid } from '@/lib/server/bearerAuth';
import { buildMeSubscriptionPayload } from '@/lib/server/subscriptionApiPayload';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireBearerUid(request);
  if (!auth.ok) return auth.response;

  const profile = await getAdminUserProfile(auth.uid);
  if (!profile) {
    return apiJsonError(404, 'NOT_FOUND', 'ユーザープロフィールがありません');
  }

  return NextResponse.json(buildMeSubscriptionPayload(profile), {
    status: 200,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
