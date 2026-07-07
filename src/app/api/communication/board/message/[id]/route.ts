import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse, type NextRequest } from 'next/server';
import { apiJsonError } from '@/lib/api/apiJsonError';
import { COMMUNICATION_BOARD_MESSAGES, COMMUNICATION_BOARD_THREADS } from '@/lib/communicationBoard';
import { getAdminUserProfile } from '@/lib/server/adminUserProfile';
import { requireBearerUid } from '@/lib/server/bearerAuth';
import { assertBoardWriteAccess } from '@/lib/server/communicationBoardAccess';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

type PatchBody = {
  peerUid?: unknown;
  body?: unknown;
};

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerUid(request);
  if (!auth.ok) return auth.response;

  const { id: messageId } = await ctx.params;
  if (!messageId) {
    return apiJsonError(400, 'INVALID_INPUT', 'メッセージ ID が必要です');
  }

  let json: PatchBody;
  try {
    json = (await request.json()) as PatchBody;
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

  const access = await assertBoardWriteAccess(auth.uid, profile, peerUid);
  if ('code' in access) {
    return apiJsonError(access.status, access.code, access.message);
  }

  const db = getFirebaseAdminApp().firestore();
  const messageRef = db
    .collection(COMMUNICATION_BOARD_THREADS)
    .doc(access.threadId)
    .collection(COMMUNICATION_BOARD_MESSAGES)
    .doc(messageId);

  const snap = await messageRef.get();
  if (!snap.exists) {
    return apiJsonError(404, 'NOT_FOUND', 'メッセージが見つかりません');
  }
  const data = snap.data()!;
  if (data.authorUid !== auth.uid) {
    return apiJsonError(403, 'FORBIDDEN_PEER', '自分のメッセージのみ編集できます');
  }

  await messageRef.update({
    body: text,
    edited: true,
    editedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    message: {
      id: messageId,
      body: text,
      edited: true,
    },
  });
}
