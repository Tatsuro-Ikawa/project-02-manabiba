import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse, type NextRequest } from 'next/server';
import { apiJsonError } from '@/lib/api/apiJsonError';
import { COMMUNICATION_BOARD_MESSAGES, COMMUNICATION_BOARD_THREADS } from '@/lib/communicationBoard';
import { getAdminUserProfile } from '@/lib/server/adminUserProfile';
import { requireBearerUid } from '@/lib/server/bearerAuth';
import {
  canUseMessageBoardRead,
  resolveBoardPeerContext,
} from '@/lib/server/communicationBoardAccess';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

type PostBody = {
  peerUid?: unknown;
};

/**
 * メッセージボード既読（最下部到達時）。
 * - スレッド親の coachLastReadAt / clientLastReadAt を更新
 * - 相手発信で readAt 未設定のメッセージに readAt を付与（送信側の「既読」表示用）
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
  if (!peerUid) {
    return apiJsonError(400, 'INVALID_INPUT', 'peerUid が必要です');
  }

  const profile = await getAdminUserProfile(auth.uid);
  if (!profile) {
    return apiJsonError(403, 'PREMIUM_REQUIRED', 'ユーザープロフィールがありません');
  }
  if (!canUseMessageBoardRead(profile)) {
    return apiJsonError(403, 'PREMIUM_REQUIRED', 'メッセージボードを閲覧できません');
  }

  const access = await resolveBoardPeerContext(auth.uid, profile, peerUid);
  if ('code' in access) {
    return apiJsonError(access.status, access.code, access.message);
  }

  const db = getFirebaseAdminApp().firestore();
  const threadRef = db.collection(COMMUNICATION_BOARD_THREADS).doc(access.threadId);
  const messagesCol = threadRef.collection(COMMUNICATION_BOARD_MESSAGES);
  const now = FieldValue.serverTimestamp();
  const peerAuthorUid = access.isCoach ? access.clientUid : access.coachUid;

  const unreadSnap = await messagesCol.where('authorUid', '==', peerAuthorUid).get();
  const toMark = unreadSnap.docs.filter((d) => {
    const readAt = d.data()?.readAt;
    return readAt == null;
  });

  const threadSnap = await threadRef.get();
  const CHUNK = 400;
  for (let i = 0; i < Math.max(toMark.length, 1); i += CHUNK) {
    const batch = db.batch();
    if (i === 0) {
      if (!threadSnap.exists) {
        batch.set(
          threadRef,
          {
            coachUid: access.coachUid,
            clientUid: access.clientUid,
            createdAt: now,
            updatedAt: now,
            ...(access.isCoach ? { coachLastReadAt: now } : { clientLastReadAt: now }),
          },
          { merge: true }
        );
      } else {
        batch.update(threadRef, {
          updatedAt: now,
          ...(access.isCoach ? { coachLastReadAt: now } : { clientLastReadAt: now }),
        });
      }
    }
    const slice = toMark.slice(i, i + CHUNK);
    for (const d of slice) {
      batch.update(d.ref, { readAt: now });
    }
    if (i === 0 || slice.length > 0) {
      await batch.commit();
    }
    if (toMark.length === 0) break;
  }

  return NextResponse.json({
    ok: true,
    markedMessageCount: toMark.length,
  });
}
