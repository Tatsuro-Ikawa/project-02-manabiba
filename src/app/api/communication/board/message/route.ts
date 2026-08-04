import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse, type NextRequest } from 'next/server';
import { apiJsonError } from '@/lib/api/apiJsonError';
import { COMMUNICATION_BOARD_MESSAGES, COMMUNICATION_BOARD_THREADS } from '@/lib/communicationBoard';
import { getAdminUserProfile } from '@/lib/server/adminUserProfile';
import { requireBearerUid } from '@/lib/server/bearerAuth';
import {
  assertBoardWriteAccess,
  assertClientSendLimit,
} from '@/lib/server/communicationBoardAccess';
import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

type PostBody = {
  peerUid?: unknown;
  body?: unknown;
};

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

  const access = await assertBoardWriteAccess(auth.uid, profile, peerUid);
  if ('code' in access) {
    return apiJsonError(access.status, access.code, access.message);
  }

  if (!access.isCoach) {
    const limitErr = await assertClientSendLimit(access);
    if (limitErr) {
      return apiJsonError(limitErr.status, limitErr.code, limitErr.message);
    }
  }

  const db = getFirebaseAdminApp().firestore();
  const threadRef = db.collection(COMMUNICATION_BOARD_THREADS).doc(access.threadId);
  const messageRef = threadRef.collection(COMMUNICATION_BOARD_MESSAGES).doc();
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const threadSnap = await tx.get(threadRef);
    if (!threadSnap.exists) {
      tx.set(threadRef, {
        coachUid: access.coachUid,
        clientUid: access.clientUid,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
        lastMessageAuthorUid: auth.uid,
        lastMessageId: messageRef.id,
      });
    } else {
      tx.update(threadRef, {
        updatedAt: now,
        lastMessageAt: now,
        lastMessageAuthorUid: auth.uid,
        lastMessageId: messageRef.id,
      });
    }
    tx.set(messageRef, {
      authorUid: auth.uid,
      body: text,
      createdAt: now,
      edited: false,
    });
  });

  const saved = await messageRef.get();
  const createdAt = saved.data()?.createdAt?.toDate?.() ?? new Date();

  return NextResponse.json(
    {
      message: {
        id: messageRef.id,
        body: text,
        createdAt: createdAt.toISOString(),
        edited: false,
      },
    },
    { status: 201 }
  );
}
