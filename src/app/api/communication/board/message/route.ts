import { NextResponse, type NextRequest } from 'next/server';
import { apiJsonError } from '@/lib/api/apiJsonError';
import { getAdminUserProfile } from '@/lib/server/adminUserProfile';
import { requireBearerUid } from '@/lib/server/bearerAuth';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { coachClientAssignmentDocId } from '@/lib/coachAffirmationShare';
import { resolveEntitlements } from '@/lib/subscription/resolveEntitlements';

export const runtime = 'nodejs';

type PostBody = {
  peerUid?: unknown;
  body?: unknown;
};

/**
 * メッセージボード送信（検証のみ・永続化は未接続。Phase B4）。
 */
export async function POST(request: NextRequest) {
  const auth = await requireBearerUid(request);
  if (!auth.ok) return auth.response;

  let json: PostBody;
  try {
    json = (await request.json()) as PostBody;
  } catch {
    return apiJsonError(400, 'INVALID_JSON', 'JSON 形式が不正です');
  }

  const peerUid = typeof json.peerUid === 'string' ? json.peerUid.trim() : '';
  const text = typeof json.body === 'string' ? json.body.trim() : '';
  if (!peerUid || !text) {
    return apiJsonError(400, 'INVALID_INPUT', 'peerUid と body が必要です');
  }

  const profile = await getAdminUserProfile(auth.uid);
  if (!profile) {
    return apiJsonError(403, 'PREMIUM_REQUIRED', 'ユーザープロフィールがありません');
  }

  if (profile.role === 'admin') {
    return apiJsonError(403, 'FORBIDDEN_PEER', '管理者はメッセージ送信できません');
  }

  const ent = resolveEntitlements(profile);
  if (!ent['communication.message_board']) {
    return apiJsonError(403, 'PREMIUM_REQUIRED', 'メッセージボードはプレミアムプランのみ利用できます');
  }

  const isCoach = profile.role === 'coach' || profile.role === 'senior_coach';
  const coachUid = isCoach ? auth.uid : peerUid;
  const clientUid = isCoach ? peerUid : auth.uid;
  if (!coachUid || !clientUid || coachUid === clientUid) {
    return apiJsonError(403, 'FORBIDDEN_PEER', '相手 UID が不正です');
  }

  const assignmentId = coachClientAssignmentDocId(coachUid, clientUid);
  const asgSnap = await getFirebaseAdminApp().firestore().doc(`coach_client_assignments/${assignmentId}`).get();
  if (!asgSnap.exists || asgSnap.data()?.status !== 'active') {
    return apiJsonError(403, 'NOT_ASSIGNED_COACH', '担当コーチ／クライアントの割当が確認できません');
  }
  const d = asgSnap.data()!;
  if (d.coachUid !== coachUid || d.clientUid !== clientUid) {
    return apiJsonError(403, 'FORBIDDEN_PEER', '割当内容と一致しません');
  }

  const id = `srv-${Date.now()}`;
  return NextResponse.json(
    {
      message: {
        id,
        body: text,
        createdAt: new Date().toISOString(),
        edited: false,
      },
    },
    { status: 201 }
  );
}
