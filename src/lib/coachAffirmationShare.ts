/**
 * A-11 アファメーション — コーチ共有（検証用フェーズ1）
 * 設計: docs/manabiba_01/03_A11_COACH_SHARING_SCHEMA_DRAFT.md
 */
import CryptoJS from 'crypto-js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { decrypt, encrypt } from '@/utils/encryption';
import { getAffirmationPublishedMarkdown } from './firestore';
import type { SubscriptionPlan } from '@/types/auth';

const COACH_CLIENT_ASSIGNMENTS = 'coach_client_assignments';
const AFFIRMATIONS = 'affirmations';

export type CoachClientAssignmentStatus = 'active' | 'ended';

export interface CoachClientAssignment {
  coachUid: string;
  clientUid: string;
  status: CoachClientAssignmentStatus;
  assignedAt: Timestamp;
  endedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AffirmationCoachShareState {
  sharedWithCoach: boolean;
  lastSharedWithCoachAt: Timestamp | null;
  lastSharedBodyFingerprint: string | null;
  coachUnreadAfterClientShare?: boolean;
  clientUnreadLatestCoachReply?: boolean;
}

export interface CoachShareRoundListItem {
  id: string;
  clientSentAt: Timestamp | null;
  bodyFingerprintAtSend: string;
  calendarMonthKey?: string;
  status?: string;
  assignedCoachUid?: string;
}

export interface CoachCommentVersionListItem {
  id: string;
  encryptedBody: string;
  authorCoachUid: string;
  savedAt: Timestamp | null;
  versionIndex?: number;
}

export function coachClientAssignmentDocId(coachUid: string, clientUid: string): string {
  return `${coachUid}_${clientUid}`;
}

/**
 * セキュリティルールは割当パスを `coach_client_assignments/{coachUid}_{clientUid}` 固定で検証する。
 * 一覧は coachUid + status のクエリのみのため、ドキュメント ID が複合でない／フィールド clientUid が ID とずれていると
 * `users/{clientUid}` の read が permission denied になる。ID が `coachUid_` で始まるときはサフィックスを優先する。
 */
export function resolveClientUidFromAssignmentDoc(
  coachUid: string,
  assignmentDocId: string,
  fieldClientUid: string
): string {
  const prefix = `${coachUid}_`;
  if (assignmentDocId.startsWith(prefix)) {
    return assignmentDocId.slice(prefix.length);
  }
  return fieldClientUid;
}

export function computeAffirmationBodyFingerprint(markdown: string): string {
  const normalized = markdown.trim().replace(/\r\n/g, '\n');
  return CryptoJS.SHA256(normalized).toString(CryptoJS.enc.Hex);
}

function calendarMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** コーチ送信クォータの暦月キー（クライアント・コーチで一致させるため Asia/Tokyo 固定） */
export function coachShareCalendarMonthKey(d: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  if (!y || !m) return calendarMonthKey(d);
  return `${y}-${m}`;
}

/** サブスクプランから月間送信上限 N を決定（未設定フィールドのフォールバック） */
export function resolveCoachShareQuotaFromPlan(plan: SubscriptionPlan): number {
  switch (plan) {
    case 'premium':
    case 'standard':
      return 2;
    case 'free':
    default:
      return 1;
  }
}

/** 同一アファメ・同一本文の短時間連打防止（ms） */
export const COACH_SHARE_DUP_FINGERPRINT_WINDOW_MS = 120_000;

/** UI 表示用: 今月の使用状況（テーマ非依存。暦月は Asia/Tokyo） */
export function getCoachShareUsageSummary(
  profile: {
    coachShareMonthKey?: string | null;
    coachShareQuotaPerMonth?: number | null;
    coachShareUsedThisMonth?: number | null;
    subscription?: { plan?: SubscriptionPlan };
  },
  now: Date = new Date()
): { monthKey: string; quota: number; used: number; remaining: number } {
  const monthKey = coachShareCalendarMonthKey(now);
  const quota =
    typeof profile.coachShareQuotaPerMonth === 'number' && profile.coachShareQuotaPerMonth >= 0
      ? profile.coachShareQuotaPerMonth
      : resolveCoachShareQuotaFromPlan(profile.subscription?.plan ?? 'free');
  const storedKey = profile.coachShareMonthKey ?? null;
  const used =
    storedKey === monthKey ? Math.max(0, profile.coachShareUsedThisMonth ?? 0) : 0;
  return {
    monthKey,
    quota,
    used,
    remaining: Math.max(0, quota - used),
  };
}

export function explainShareAffirmationEligibility(params: {
  now: Date;
  lastSharedWithCoachAt: Timestamp | null | undefined;
  lastFingerprint: string | null | undefined;
  currentFingerprint: string;
  activeCoachingAffirmationId: string | null | undefined;
  selectedAffirmationId: string;
  sharedWithCoach: boolean;
  isPublishedSelection: boolean;
  /** users/{uid} のクォータ（未設定は subscriptionPlan で解決） */
  coachShareMonthKey: string | null | undefined;
  coachShareQuotaPerMonth: number | null | undefined;
  coachShareUsedThisMonth: number | null | undefined;
  subscriptionPlan?: SubscriptionPlan;
}): { ok: true } | { ok: false; message: string } {
  if (!params.isPublishedSelection) {
    return {
      ok: false,
      message:
        '発行済みのアファメーションだけコーチへ送信できます。',
    };
  }
  if (!params.sharedWithCoach) {
    return {
      ok: false,
      message:
        'コーチへの共有がオフです。共有を有効にしてから送信してください。',
    };
  }
  if (
    !params.activeCoachingAffirmationId ||
    params.activeCoachingAffirmationId !== params.selectedAffirmationId
  ) {
    return {
      ok: false,
      message:
        'コーチング中のテーマとして選ばれているアファメーションだけ送信できます。テーマを選び直してください。',
    };
  }

  const quota =
    typeof params.coachShareQuotaPerMonth === 'number' && params.coachShareQuotaPerMonth >= 0
      ? params.coachShareQuotaPerMonth
      : resolveCoachShareQuotaFromPlan(params.subscriptionPlan ?? 'free');

  const monthKey = coachShareCalendarMonthKey(params.now);
  const storedKey = params.coachShareMonthKey ?? null;
  const used =
    storedKey === monthKey ? Math.max(0, params.coachShareUsedThisMonth ?? 0) : 0;

  if (used >= quota) {
    return {
      ok: false,
      message: `今月のコーチへ送信は${quota}回までです。（${used}/${quota} 回使用済み）`,
    };
  }

  const last = params.lastSharedWithCoachAt;
  if (
    last != null &&
    params.currentFingerprint === (params.lastFingerprint ?? '') &&
    params.now.getTime() - last.toDate().getTime() >= 0 &&
    params.now.getTime() - last.toDate().getTime() < COACH_SHARE_DUP_FINGERPRINT_WINDOW_MS
  ) {
    return {
      ok: false,
      message: '直前に送信しました。少し待ってから試してください。',
    };
  }

  return { ok: true };
}

export async function listActiveCoachAssignmentsForCoach(
  coachUid: string
): Promise<{ id: string; data: CoachClientAssignment }[]> {
  const q = query(
    collection(db, COACH_CLIENT_ASSIGNMENTS),
    where('coachUid', '==', coachUid),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    data: d.data() as CoachClientAssignment,
  }));
}

/** クライアントの「現在アクティブな」割当 1 件（0 件なら null） */
export async function getActiveCoachAssignmentForClient(
  clientUid: string
): Promise<{ id: string; data: CoachClientAssignment } | null> {
  const q = query(
    collection(db, COACH_CLIENT_ASSIGNMENTS),
    where('clientUid', '==', clientUid),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, data: d.data() as CoachClientAssignment };
}

export async function getAffirmationCoachShareState(
  clientUid: string,
  affirmationId: string
): Promise<AffirmationCoachShareState | null> {
  const ref = doc(db, 'users', clientUid, AFFIRMATIONS, affirmationId);
  const s = await getDoc(ref);
  if (!s.exists()) return null;
  const data = s.data();
  return {
    sharedWithCoach: data.sharedWithCoach === true,
    lastSharedWithCoachAt: (data.lastSharedWithCoachAt as Timestamp) ?? null,
    lastSharedBodyFingerprint:
      typeof data.lastSharedBodyFingerprint === 'string'
        ? data.lastSharedBodyFingerprint
        : null,
    coachUnreadAfterClientShare: data.coachUnreadAfterClientShare === true,
    clientUnreadLatestCoachReply: data.clientUnreadLatestCoachReply === true,
  };
}

export async function setAffirmationSharedWithCoach(
  clientUid: string,
  affirmationId: string,
  shared: boolean
): Promise<void> {
  const parentRef = doc(db, 'users', clientUid, AFFIRMATIONS, affirmationId);
  const publishedRef = doc(
    db,
    'users',
    clientUid,
    AFFIRMATIONS,
    affirmationId,
    'published',
    'current'
  );
  const pubSnap = await getDoc(publishedRef);
  const batch = writeBatch(db);
  batch.update(parentRef, {
    sharedWithCoach: shared,
    updatedAt: serverTimestamp(),
  });
  if (pubSnap.exists()) {
    batch.update(publishedRef, {
      coachCanReadPublished: shared,
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function updateUserActiveCoachingAffirmationId(
  clientUid: string,
  affirmationId: string | null
): Promise<void> {
  await updateDoc(doc(db, 'users', clientUid), {
    activeCoachingAffirmationId: affirmationId,
    updatedAt: serverTimestamp(),
  });
}

export async function shareAffirmationWithCoach(params: {
  clientUid: string;
  affirmationId: string;
}): Promise<void> {
  const markdown = await getAffirmationPublishedMarkdown(
    params.clientUid,
    params.affirmationId
  );
  if (markdown == null || !markdown.trim()) {
    throw new Error('本文を読み込めませんでした。');
  }
  const fingerprint = computeAffirmationBodyFingerprint(markdown);
  const assignment = await getActiveCoachAssignmentForClient(params.clientUid);
  if (!assignment) {
    throw new Error('担当コーチの割当がありません。管理者に確認してください。');
  }
  const share = await getAffirmationCoachShareState(
    params.clientUid,
    params.affirmationId
  );
  if (!share) {
    throw new Error('アファメーションが見つかりません。');
  }

  const profileSnap = await getDoc(doc(db, 'users', params.clientUid));
  if (!profileSnap.exists()) {
    throw new Error('ユーザープロファイルが見つかりません。');
  }
  const profileData = profileSnap.data();
  const activeId =
    (profileData.activeCoachingAffirmationId as string | undefined) ?? null;
  const subPlan = (profileData.subscription?.plan as SubscriptionPlan | undefined) ?? 'free';
  const quotaStored = profileData.coachShareQuotaPerMonth;
  const quota =
    typeof quotaStored === 'number' && quotaStored >= 0
      ? quotaStored
      : resolveCoachShareQuotaFromPlan(subPlan);

  const eligibility = explainShareAffirmationEligibility({
    now: new Date(),
    lastSharedWithCoachAt: share.lastSharedWithCoachAt,
    lastFingerprint: share.lastSharedBodyFingerprint,
    currentFingerprint: fingerprint,
    activeCoachingAffirmationId: activeId,
    selectedAffirmationId: params.affirmationId,
    sharedWithCoach: share.sharedWithCoach,
    isPublishedSelection: true,
    coachShareMonthKey: profileData.coachShareMonthKey as string | undefined,
    coachShareQuotaPerMonth: typeof quotaStored === 'number' ? quotaStored : null,
    coachShareUsedThisMonth:
      typeof profileData.coachShareUsedThisMonth === 'number'
        ? profileData.coachShareUsedThisMonth
        : null,
    subscriptionPlan: subPlan,
  });
  if (!eligibility.ok) {
    throw new Error(eligibility.message);
  }

  const userRef = doc(db, 'users', params.clientUid);
  const parentRef = doc(
    db,
    'users',
    params.clientUid,
    AFFIRMATIONS,
    params.affirmationId
  );
  const publishedRef = doc(
    db,
    'users',
    params.clientUid,
    AFFIRMATIONS,
    params.affirmationId,
    'published',
    'current'
  );
  const roundsCol = collection(
    db,
    'users',
    params.clientUid,
    AFFIRMATIONS,
    params.affirmationId,
    'coach_share_rounds'
  );

  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const parentSnap = await transaction.get(parentRef);
    const pubSnap = await transaction.get(publishedRef);
    if (!userSnap.exists()) throw new Error('ユーザープロファイルが見つかりません。');
    if (!parentSnap.exists()) throw new Error('アファメーションが見つかりません。');
    if (!pubSnap.exists()) throw new Error('発行済み本文が見つかりません。');

    const u = userSnap.data()!;
    const p = parentSnap.data()!;
    const now = new Date();
    const monthKey = coachShareCalendarMonthKey(now);
    const plan = (u.subscription?.plan as SubscriptionPlan | undefined) ?? 'free';
    const q =
      typeof u.coachShareQuotaPerMonth === 'number' && u.coachShareQuotaPerMonth >= 0
        ? u.coachShareQuotaPerMonth
        : resolveCoachShareQuotaFromPlan(plan);
    const storedKey = typeof u.coachShareMonthKey === 'string' ? u.coachShareMonthKey : null;
    const used = storedKey === monthKey ? Math.max(0, (u.coachShareUsedThisMonth as number) ?? 0) : 0;

    if (used >= q) {
      throw new Error(`今月のコーチへ送信は${q}回までです。（${used}/${q} 回使用済み）`);
    }

    const act = (u.activeCoachingAffirmationId as string | undefined) ?? null;
    if (!act || act !== params.affirmationId) {
      throw new Error(
        'コーチング中のテーマとして選ばれているアファメーションだけ送信できます。'
      );
    }
    if (p.sharedWithCoach !== true) {
      throw new Error('コーチへの共有がオフです。');
    }

    const lastAt = p.lastSharedWithCoachAt as Timestamp | undefined;
    const lastFp =
      typeof p.lastSharedBodyFingerprint === 'string' ? p.lastSharedBodyFingerprint : null;
    if (
      lastAt &&
      lastFp === fingerprint &&
      now.getTime() - lastAt.toDate().getTime() >= 0 &&
      now.getTime() - lastAt.toDate().getTime() < COACH_SHARE_DUP_FINGERPRINT_WINDOW_MS
    ) {
      throw new Error('直前に送信しました。少し待ってから試してください。');
    }

    const newRoundRef = doc(roundsCol);
    transaction.set(newRoundRef, {
      clientSentAt: serverTimestamp(),
      bodyFingerprintAtSend: fingerprint,
      calendarMonthKey: coachShareCalendarMonthKey(now),
      status: 'awaiting_coach',
      assignedCoachUid: assignment.data.coachUid,
    });
    transaction.update(userRef, {
      coachShareMonthKey: monthKey,
      coachShareUsedThisMonth: used + 1,
      coachShareQuotaPerMonth: q,
      updatedAt: serverTimestamp(),
    });
    transaction.update(parentRef, {
      lastSharedWithCoachAt: serverTimestamp(),
      lastSharedBodyFingerprint: fingerprint,
      sharedWithCoach: true,
      coachUnreadAfterClientShare: true,
      updatedAt: serverTimestamp(),
    });
    transaction.update(publishedRef, {
      coachCanReadPublished: true,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function listCoachShareRounds(
  clientUid: string,
  affirmationId: string
): Promise<CoachShareRoundListItem[]> {
  const colRef = collection(
    db,
    'users',
    clientUid,
    AFFIRMATIONS,
    affirmationId,
    'coach_share_rounds'
  );
  const snap = await getDocs(colRef);
  const items: CoachShareRoundListItem[] = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      clientSentAt: (x.clientSentAt as Timestamp) ?? null,
      bodyFingerprintAtSend:
        typeof x.bodyFingerprintAtSend === 'string' ? x.bodyFingerprintAtSend : '',
      calendarMonthKey:
        typeof x.calendarMonthKey === 'string' ? x.calendarMonthKey : undefined,
      status: typeof x.status === 'string' ? x.status : undefined,
      assignedCoachUid:
        typeof x.assignedCoachUid === 'string' ? x.assignedCoachUid : undefined,
    };
  });
  items.sort(
    (a, b) => (a.clientSentAt?.toMillis() ?? 0) - (b.clientSentAt?.toMillis() ?? 0)
  );
  return items;
}

export async function listCoachCommentVersions(
  clientUid: string,
  affirmationId: string,
  roundId: string
): Promise<CoachCommentVersionListItem[]> {
  const colRef = collection(
    db,
    'users',
    clientUid,
    AFFIRMATIONS,
    affirmationId,
    'coach_share_rounds',
    roundId,
    'coach_comment_versions'
  );
  const snap = await getDocs(colRef);
  const items: CoachCommentVersionListItem[] = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      encryptedBody: typeof x.encryptedBody === 'string' ? x.encryptedBody : '',
      authorCoachUid:
        typeof x.authorCoachUid === 'string' ? x.authorCoachUid : '',
      savedAt: (x.savedAt as Timestamp) ?? null,
      versionIndex: typeof x.versionIndex === 'number' ? x.versionIndex : undefined,
    };
  });
  items.sort((a, b) => (a.savedAt?.toMillis() ?? 0) - (b.savedAt?.toMillis() ?? 0));
  return items;
}

export async function appendCoachCommentVersion(params: {
  coachUid: string;
  clientUid: string;
  affirmationId: string;
  roundId: string;
  plaintext: string;
}): Promise<void> {
  const t = params.plaintext.trim();
  if (!t) {
    throw new Error('コメントを入力してください。');
  }
  const encryptedBody = await encrypt(t, params.clientUid);
  const versionsCol = collection(
    db,
    'users',
    params.clientUid,
    AFFIRMATIONS,
    params.affirmationId,
    'coach_share_rounds',
    params.roundId,
    'coach_comment_versions'
  );
  const parentRef = doc(
    db,
    'users',
    params.clientUid,
    AFFIRMATIONS,
    params.affirmationId
  );

  const batch = writeBatch(db);
  const vref = doc(versionsCol);
  batch.set(vref, {
    encryptedBody,
    authorCoachUid: params.coachUid,
    savedAt: serverTimestamp(),
  });
  batch.update(parentRef, {
    coachUnreadAfterClientShare: false,
    clientUnreadLatestCoachReply: true,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function clearClientUnreadCoachReply(
  clientUid: string,
  affirmationId: string
): Promise<void> {
  await updateDoc(doc(db, 'users', clientUid, AFFIRMATIONS, affirmationId), {
    clientUnreadLatestCoachReply: false,
    updatedAt: serverTimestamp(),
  });
}

export async function decryptCoachCommentForDisplay(
  encryptedBody: string,
  clientUid: string
): Promise<string> {
  if (!encryptedBody) return '';
  try {
    return await decrypt(encryptedBody, clientUid);
  } catch {
    return '（コメントを表示できません）';
  }
}
