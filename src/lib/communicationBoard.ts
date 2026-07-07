/**
 * メッセージボード（コーチ↔クライアント 1ペア1スレッド）
 * 設計: docs/manabiba_01/04_SUBSCRIPTION_PRODUCT_SCOPE.md 付録A（パターンB）
 */
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { coachClientAssignmentDocId } from '@/lib/coachAffirmationShare';
import { db } from '@/lib/firebase';

export const COMMUNICATION_BOARD_THREADS = 'communication_board_threads';
export const COMMUNICATION_BOARD_MESSAGES = 'messages';

export function communicationBoardThreadId(coachUid: string, clientUid: string): string {
  return coachClientAssignmentDocId(coachUid, clientUid);
}

export type CommunicationBoardMessageDoc = {
  authorUid: string;
  body: string;
  createdAt: Date;
  edited: boolean;
  editedAt?: Date | null;
  readAt?: Date | null;
};

export type CommunicationBoardMessage = CommunicationBoardMessageDoc & {
  id: string;
};

/** メッセージボード表示中のみ subscribe すること（画面外では呼ばない） */
export function subscribeCommunicationBoardMessages(
  coachUid: string,
  clientUid: string,
  onMessages: (messages: CommunicationBoardMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const threadId = communicationBoardThreadId(coachUid, clientUid);
  const q = query(
    collection(db, COMMUNICATION_BOARD_THREADS, threadId, COMMUNICATION_BOARD_MESSAGES),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: CommunicationBoardMessage[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          authorUid: String(data.authorUid ?? ''),
          body: String(data.body ?? ''),
          createdAt: data.createdAt?.toDate?.() ?? new Date(0),
          edited: data.edited === true,
          editedAt: data.editedAt?.toDate?.() ?? null,
          readAt: data.readAt?.toDate?.() ?? null,
        };
      });
      onMessages(list);
    },
    (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

/** スレッド内のコーチ発信のうち、直近1件を取得（ホーム新着プレビュー用） */
export async function fetchLatestCoachBoardMessage(
  coachUid: string,
  clientUid: string
): Promise<CommunicationBoardMessage | null> {
  const threadId = communicationBoardThreadId(coachUid, clientUid);
  const q = query(
    collection(db, COMMUNICATION_BOARD_THREADS, threadId, COMMUNICATION_BOARD_MESSAGES),
    where('authorUid', '==', coachUid),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    id: d.id,
    authorUid: String(data.authorUid ?? ''),
    body: String(data.body ?? ''),
    createdAt: data.createdAt?.toDate?.() ?? new Date(0),
    edited: data.edited === true,
    editedAt: data.editedAt?.toDate?.() ?? null,
    readAt: data.readAt?.toDate?.() ?? null,
  };
}
