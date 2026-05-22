import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { apiJsonError } from '@/lib/api/apiJsonError';
import { getAdminUserProfile } from '@/lib/server/adminUserProfile';
import { requireBearerUid } from '@/lib/server/bearerAuth';
import type { FeatureKey } from '@/lib/subscription/featureKeys';
import { resolveEntitlements } from '@/lib/subscription/resolveEntitlements';

/**
 * AI Route Handler 用: Bearer 検証後、entitlement を確認する。
 * `MANABIBA_DISABLE_AI_ENTITLEMENT_CHECK=true` のときは entitlement のみスキップ（認証は必須）。
 */
export async function guardAiEntitlement(
  request: NextRequest,
  feature: FeatureKey
): Promise<NextResponse | null> {
  const auth = await requireBearerUid(request);
  if (!auth.ok) return auth.response;

  if (process.env.MANABIBA_DISABLE_AI_ENTITLEMENT_CHECK === 'true') {
    return null;
  }

  let profile;
  try {
    profile = await getAdminUserProfile(auth.uid);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('PERMISSION_DENIED') || msg.includes('insufficient permissions')) {
      return apiJsonError(
        503,
        'SERVER_CONFIG',
        'Firestore の読み取り権限がありません。サービスアカウントに Cloud Datastore User 等を付与するか、ローカルでは MANABIBA_DISABLE_AI_ENTITLEMENT_CHECK=true を .env.local に設定してください。'
      );
    }
    throw e;
  }
  if (!profile) {
    return apiJsonError(403, 'PLAN_REQUIRED', 'ユーザープロフィールがありません', feature);
  }
  const ent = resolveEntitlements(profile);
  if (!ent[feature]) {
    return apiJsonError(403, 'PLAN_REQUIRED', 'このプランでは該当の AI 機能を利用できません', feature);
  }
  return null;
}
