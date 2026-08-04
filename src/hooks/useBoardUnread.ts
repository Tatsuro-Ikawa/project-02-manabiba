'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getActiveCoachAssignmentForClient,
  listActiveCoachAssignmentsForCoach,
  resolveClientUidFromAssignmentDoc,
} from '@/lib/coachAffirmationShare';
import {
  fetchBoardUnreadClientUidsForCoach,
  fetchBoardUnreadFromCoach,
} from '@/lib/communicationBoardUnread';

type CoachUnreadState = {
  unreadClientUids: Set<string>;
  anyUnread: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

type ClientUnreadState = {
  hasUnread: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

/** コーチ: 担当クライアントのボード未読（表示時取得） */
export function useCoachBoardUnread(coachUid: string | null | undefined, enabled: boolean): CoachUnreadState {
  const [unreadClientUids, setUnreadClientUids] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !coachUid) {
      setUnreadClientUids(new Set());
      return;
    }
    setLoading(true);
    try {
      const assignments = await listActiveCoachAssignmentsForCoach(coachUid);
      const clientUids = assignments.map((a) =>
        resolveClientUidFromAssignmentDoc(coachUid, a.id, a.data.clientUid)
      );
      const unread = await fetchBoardUnreadClientUidsForCoach(coachUid, clientUids);
      setUnreadClientUids(unread);
    } catch (e) {
      console.error(e);
      setUnreadClientUids(new Set());
    } finally {
      setLoading(false);
    }
  }, [coachUid, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    unreadClientUids,
    anyUnread: unreadClientUids.size > 0,
    loading,
    refresh,
  };
}

/** クライアント: 担当コーチからのボード未読（表示時取得） */
export function useClientBoardUnread(
  clientUid: string | null | undefined,
  enabled: boolean
): ClientUnreadState {
  const [hasUnread, setHasUnread] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !clientUid) {
      setHasUnread(false);
      return;
    }
    setLoading(true);
    try {
      const asg = await getActiveCoachAssignmentForClient(clientUid);
      const coachUid = asg?.data.coachUid;
      if (!coachUid) {
        setHasUnread(false);
        return;
      }
      setHasUnread(await fetchBoardUnreadFromCoach(clientUid, coachUid));
    } catch (e) {
      console.error(e);
      setHasUnread(false);
    } finally {
      setLoading(false);
    }
  }, [clientUid, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { hasUnread, loading, refresh };
}
