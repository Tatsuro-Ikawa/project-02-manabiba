import { getFirebaseAdminApp } from '@/lib/firebaseAdmin';
import { coachClientAssignmentDocId } from '@/lib/coachAffirmationShare';
import { COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT } from '@/lib/communicationConstants';
import { canViewMessageBoardRetentionHistory } from '@/lib/subscription/dataRetention';
import { resolveEntitlements } from '@/lib/subscription/resolveEntitlements';
import type { UserProfile } from '@/types/auth';
import {
  COMMUNICATION_BOARD_MESSAGES,
  COMMUNICATION_BOARD_THREADS,
  communicationBoardThreadId,
} from '@/lib/communicationBoard';

export type BoardPeerContext = {
  coachUid: string;
  clientUid: string;
  isCoach: boolean;
  threadId: string;
};

export type BoardAccessError = {
  status: number;
  code: string;
  message: string;
};

function isCoachRole(profile: UserProfile): boolean {
  return profile.role === 'coach' || profile.role === 'senior_coach';
}

export function canUseMessageBoardWrite(profile: UserProfile): boolean {
  if (profile.role === 'admin') return false;
  if (isCoachRole(profile)) return true;
  return resolveEntitlements(profile)['communication.message_board'] === true;
}

export function canUseMessageBoardRead(profile: UserProfile): boolean {
  if (profile.role === 'admin') return false;
  if (isCoachRole(profile)) return true;
  if (resolveEntitlements(profile)['communication.message_board']) return true;
  return canViewMessageBoardRetentionHistory(profile);
}

async function getActiveAssignment(
  coachUid: string,
  clientUid: string
): Promise<boolean> {
  const id = coachClientAssignmentDocId(coachUid, clientUid);
  const snap = await getFirebaseAdminApp()
    .firestore()
    .doc(`coach_client_assignments/${id}`)
    .get();
  if (!snap.exists) return false;
  const d = snap.data()!;
  return (
    d.status === 'active' &&
    d.coachUid === coachUid &&
    d.clientUid === clientUid
  );
}

export async function resolveBoardPeerContext(
  uid: string,
  profile: UserProfile,
  peerUid: string
): Promise<BoardPeerContext | BoardAccessError> {
  if (profile.role === 'admin') {
    return { status: 403, code: 'FORBIDDEN_PEER', message: '管理者は利用できません' };
  }
  if (!peerUid || peerUid === uid) {
    return { status: 403, code: 'FORBIDDEN_PEER', message: '相手 UID が不正です' };
  }

  const coachRole = isCoachRole(profile);
  const coachUid = coachRole ? uid : peerUid;
  const clientUid = coachRole ? peerUid : uid;

  const assigned = await getActiveAssignment(coachUid, clientUid);
  if (!assigned) {
    return {
      status: 403,
      code: 'NOT_ASSIGNED_COACH',
      message: '担当コーチ／クライアントの割当が確認できません',
    };
  }

  return {
    coachUid,
    clientUid,
    isCoach: coachRole,
    threadId: communicationBoardThreadId(coachUid, clientUid),
  };
}

export async function assertBoardWriteAccess(
  uid: string,
  profile: UserProfile,
  peerUid: string
): Promise<BoardPeerContext | BoardAccessError> {
  if (!canUseMessageBoardWrite(profile)) {
    return {
      status: 403,
      code: 'PREMIUM_REQUIRED',
      message: 'メッセージボードはプレミアムプランのみ利用できます',
    };
  }
  return resolveBoardPeerContext(uid, profile, peerUid);
}

export async function assertClientSendLimit(
  ctx: BoardPeerContext
): Promise<BoardAccessError | null> {
  const col = getFirebaseAdminApp()
    .firestore()
    .collection(COMMUNICATION_BOARD_THREADS)
    .doc(ctx.threadId)
    .collection(COMMUNICATION_BOARD_MESSAGES);
  const snap = await col.where('authorUid', '==', ctx.clientUid).get();
  if (snap.size >= COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT) {
    return {
      status: 403,
      code: 'SEND_LIMIT',
      message: `クライアントからの送信は ${COMMUNICATION_CLIENT_MESSAGE_SEND_LIMIT} 件までです。`,
    };
  }
  return null;
}
