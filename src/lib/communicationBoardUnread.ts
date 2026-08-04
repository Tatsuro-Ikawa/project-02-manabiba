/**
 * メッセージボード未読（スレッド親メタ比較・案C）
 * 正本: docs/manabiba_01/04_COMMUNICATION_SCREEN_IMPLEMENTATION.md
 */
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  COMMUNICATION_BOARD_THREADS,
  communicationBoardThreadId,
} from '@/lib/communicationBoard';

export type CommunicationBoardThreadMeta = {
  threadId: string;
  coachUid: string;
  clientUid: string;
  lastMessageAt: Date | null;
  lastMessageAuthorUid: string | null;
  coachLastReadAt: Date | null;
  clientLastReadAt: Date | null;
};

function asDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
    try {
      const d = (v as { toDate: () => Date }).toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  return null;
}

export function parseCommunicationBoardThreadMeta(
  threadId: string,
  data: Record<string, unknown> | undefined
): CommunicationBoardThreadMeta | null {
  if (!data) return null;
  const coachUid = typeof data.coachUid === 'string' ? data.coachUid : '';
  const clientUid = typeof data.clientUid === 'string' ? data.clientUid : '';
  if (!coachUid || !clientUid) return null;
  return {
    threadId,
    coachUid,
    clientUid,
    lastMessageAt: asDate(data.lastMessageAt),
    lastMessageAuthorUid:
      typeof data.lastMessageAuthorUid === 'string' ? data.lastMessageAuthorUid : null,
    coachLastReadAt: asDate(data.coachLastReadAt),
    clientLastReadAt: asDate(data.clientLastReadAt),
  };
}

/** 閲覧者視点で「相手の最新投稿が未読か」 */
export function isBoardThreadUnreadForViewer(
  meta: CommunicationBoardThreadMeta | null | undefined,
  viewerIsCoach: boolean
): boolean {
  if (!meta?.lastMessageAt || !meta.lastMessageAuthorUid) return false;
  const peerAuthored = viewerIsCoach
    ? meta.lastMessageAuthorUid === meta.clientUid
    : meta.lastMessageAuthorUid === meta.coachUid;
  if (!peerAuthored) return false;
  const myRead = viewerIsCoach ? meta.coachLastReadAt : meta.clientLastReadAt;
  if (!myRead) return true;
  return meta.lastMessageAt.getTime() > myRead.getTime();
}

export async function getCommunicationBoardThreadMeta(
  coachUid: string,
  clientUid: string
): Promise<CommunicationBoardThreadMeta | null> {
  const threadId = communicationBoardThreadId(coachUid, clientUid);
  const snap = await getDoc(doc(db, COMMUNICATION_BOARD_THREADS, threadId));
  if (!snap.exists()) return null;
  return parseCommunicationBoardThreadMeta(threadId, snap.data() as Record<string, unknown>);
}

/** コーチ: 担当クライアントごとの未読（表示時一括） */
export async function fetchBoardUnreadClientUidsForCoach(
  coachUid: string,
  clientUids: string[]
): Promise<Set<string>> {
  const unread = new Set<string>();
  await Promise.all(
    clientUids.map(async (clientUid) => {
      const meta = await getCommunicationBoardThreadMeta(coachUid, clientUid);
      if (isBoardThreadUnreadForViewer(meta, true)) unread.add(clientUid);
    })
  );
  return unread;
}

/** クライアント: 担当コーチからの未読があるか */
export async function fetchBoardUnreadFromCoach(
  clientUid: string,
  coachUid: string
): Promise<boolean> {
  const meta = await getCommunicationBoardThreadMeta(coachUid, clientUid);
  return isBoardThreadUnreadForViewer(meta, false);
}
