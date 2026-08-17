/**
 * 管理者向けユーザー検索・一覧（コーチ割当 UI）
 * 設計: docs/manabiba_01/04_ADMIN_COACH_ASSIGNMENT_SPEC.md
 */
import { collection, getDocs, query, where, type DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import { getUserProfile } from './firestore';
import { listActiveCoachClientAssignments } from './coachAffirmationShare';
import { normalizePrimaryCourse } from '@/lib/enrollmentCourse';
import { normalizeJournalWeekStartsOnField } from '@/lib/journalWeek';
import { normalizeUserSubscription } from '@/lib/subscription/planDefaults';
import { resolveEntitlements } from '@/lib/subscription/resolveEntitlements';
import type { UserProfile, WeeklyAiReportWriteMode } from '@/types/auth';

export function normalizeAdminLookupEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** 入力がメール形式なら email、それ以外は uid として扱う */
export function detectAdminLookupKind(raw: string): 'email' | 'uid' {
  return raw.trim().includes('@') ? 'email' : 'uid';
}

export function mapUserDocToProfile(uid: string, data: DocumentData): UserProfile {
  return {
    ...data,
    uid: (data.uid as string) || uid,
    email: String(data.email ?? ''),
    displayName: String(data.displayName ?? 'ユーザー'),
    photoURL: data.photoURL as string | undefined,
    role: ((data.role as UserProfile['role']) ?? 'user') as UserProfile['role'],
    weekStartsOn: normalizeJournalWeekStartsOnField(data.weekStartsOn),
    weeklyAiReportWriteMode:
      data.weeklyAiReportWriteMode === 'overwrite' ||
      data.weeklyAiReportWriteMode === 'append' ||
      data.weeklyAiReportWriteMode === 'skip_if_nonempty'
        ? (data.weeklyAiReportWriteMode as WeeklyAiReportWriteMode)
        : undefined,
    journalCoachShareDefaultOn: data.journalCoachShareDefaultOn === true,
    affirmationCoachShareDefaultOn: data.affirmationCoachShareDefaultOn === true,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    lastLoginAt: data.lastLoginAt?.toDate?.() ?? new Date(),
    consents: data.consents
      ? {
          ...data.consents,
          acceptedAt: data.consents?.acceptedAt?.toDate?.() ?? data.consents?.acceptedAt,
        }
      : undefined,
    enrollment: data.enrollment
      ? {
          primaryCourse: normalizePrimaryCourse(data.enrollment.primaryCourse) ?? null,
        }
      : undefined,
    applyBilling: data.applyBilling
      ? {
          fullName: String(data.applyBilling.fullName ?? ''),
          postalCode: String(data.applyBilling.postalCode ?? ''),
          address: String(data.applyBilling.address ?? ''),
          phone: String(data.applyBilling.phone ?? ''),
          updatedAt: data.applyBilling.updatedAt?.toDate?.(),
        }
      : undefined,
    subscription: normalizeUserSubscription(
      data.subscription as Record<string, unknown> | undefined
    ),
  } as UserProfile;
}

export async function adminLookupUserByUid(uid: string): Promise<UserProfile | null> {
  const id = uid.trim();
  if (!id) return null;
  return getUserProfile(id);
}

export async function adminLookupUserByEmail(email: string): Promise<UserProfile | null> {
  const trimmed = email.trim();
  if (!trimmed) return null;

  const tryEmails = Array.from(
    new Set([normalizeAdminLookupEmail(trimmed), trimmed].filter(Boolean))
  );

  for (const e of tryEmails) {
    const q = query(collection(db, 'users'), where('email', '==', e));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const uid = snap.docs[0].id;
      return getUserProfile(uid);
    }
  }
  return null;
}

/** メールまたは UID 文字列から 1 件解決 */
export async function adminLookupUser(raw: string): Promise<UserProfile | null> {
  const kind = detectAdminLookupKind(raw);
  if (kind === 'email') return adminLookupUserByEmail(raw);
  return adminLookupUserByUid(raw);
}

export function formatUserAdminLabel(p: UserProfile): string {
  const name = p.displayName?.trim() || '（名前なし）';
  const email = p.email?.trim() || '（メールなし）';
  return `${name} <${email}>`;
}

export function isCoachAssignableRole(role: UserProfile['role']): boolean {
  return role === 'coach' || role === 'senior_coach';
}

/** プレミアムコースかつ有効権限（メッセージボード相当） */
export function isPremiumClientEligible(profile: UserProfile): boolean {
  return resolveEntitlements(profile)['communication.message_board'] === true;
}

/**
 * displayName / email / uid / role に対する部分一致（大小無視）。
 * 空クエリは全員パス。
 */
export function filterUsersByPartialQuery(
  users: UserProfile[],
  rawQuery: string
): UserProfile[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return users;
  return users.filter((u) => {
    const hay = [u.displayName, u.email, u.uid, u.role].map((s) =>
      String(s ?? '').toLowerCase()
    );
    return hay.some((h) => h.includes(q));
  });
}

/** role が coach / senior_coach のユーザー一覧 */
export async function listCoachRoleUsers(): Promise<UserProfile[]> {
  const q = query(
    collection(db, 'users'),
    where('role', 'in', ['coach', 'senior_coach'])
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => mapUserDocToProfile(d.id, d.data()));
  list.sort((a, b) =>
    formatUserAdminLabel(a).localeCompare(formatUserAdminLabel(b), 'ja')
  );
  return list;
}

/**
 * プレミアムかつ担当コーチ未割当（active なし）のクライアント一覧。
 * Firestore: subscription.plan == premium → クライアント側で有効権限・未割当を絞る。
 */
export async function listUnassignedPremiumClients(): Promise<UserProfile[]> {
  const [premiumSnap, activeAssignments] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('subscription.plan', '==', 'premium'))),
    listActiveCoachClientAssignments(),
  ]);
  const assignedClientUids = new Set(activeAssignments.map((a) => a.data.clientUid));

  const list = premiumSnap.docs
    .map((d) => mapUserDocToProfile(d.id, d.data()))
    .filter((p) => isPremiumClientEligible(p))
    .filter((p) => !assignedClientUids.has(p.uid))
    .filter((p) => p.role === 'user' || p.role === 'coach' || p.role === 'admin');

  list.sort((a, b) =>
    formatUserAdminLabel(a).localeCompare(formatUserAdminLabel(b), 'ja')
  );
  return list;
}
