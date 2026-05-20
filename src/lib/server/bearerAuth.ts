import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { apiJsonError } from '@/lib/api/apiJsonError';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';

export type BearerAuthResult =
  | { ok: true; uid: string }
  | { ok: false; response: NextResponse };

export async function requireBearerUid(request: NextRequest): Promise<BearerAuthResult> {
  const h = request.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) {
    return { ok: false, response: apiJsonError(401, 'UNAUTHENTICATED', 'Authorization: Bearer が必要です') };
  }
  const token = h.slice(7).trim();
  if (!token) {
    return { ok: false, response: apiJsonError(401, 'UNAUTHENTICATED', 'トークンが空です') };
  }
  try {
    const app = getFirebaseAdminApp();
    const decoded = await app.auth().verifyIdToken(token);
    return { ok: true, uid: decoded.uid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Firebase Admin') || msg.includes('credential')) {
      return { ok: false, response: apiJsonError(503, 'SERVER_CONFIG', msg) };
    }
    return { ok: false, response: apiJsonError(401, 'UNAUTHENTICATED', 'ID トークンの検証に失敗しました') };
  }
}
