import type { DocumentData } from 'firebase-admin/firestore';
import { normalizePrimaryCourse } from '@/lib/enrollmentCourse';
import type { UserProfile, WeeklyAiReportWriteMode } from '@/types/auth';
import { normalizeJournalWeekStartsOnField } from '@/lib/journalWeek';

/**
 * Firestore `users/{uid}` の生データを `UserProfile` に変換（クライアント `getUserProfile` と同等のフィールド）。
 */
export function mapUserProfileFromAdmin(uid: string, data: DocumentData): UserProfile {
  const sub = data.subscription ?? {};
  return {
    uid: (data.uid as string) || uid,
    email: (data.email as string) || '',
    displayName: (data.displayName as string) || 'ユーザー',
    photoURL: data.photoURL as string | undefined,
    role: ((data.role as UserProfile['role']) ?? 'user') as UserProfile['role'],
    subscription: {
      plan: sub.plan ?? 'free',
      status: sub.status ?? 'active',
      startDate: sub.startDate?.toDate?.() ?? new Date(),
      endDate: sub.endDate?.toDate?.(),
      trialEndsAt: sub.trialEndsAt?.toDate?.(),
      currentPeriodEnd: sub.currentPeriodEnd?.toDate?.(),
      stripeCustomerId: sub.stripeCustomerId ?? undefined,
      stripeSubscriptionId: sub.stripeSubscriptionId ?? undefined,
      features: sub.features ?? {
        pdca: true,
        aiComments: false,
        coachComments: false,
        zoomMeetings: false,
        communityAccess: false,
        advancedAnalytics: false,
      },
      usage: sub.usage ?? {
        pdcaEntries: 0,
        aiComments: 0,
        zoomMeetings: 0,
        coachSessions: 0,
      },
    },
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
    trialAffirmationMeta: data.trialAffirmationMeta,
    activeCoachingAffirmationId: data.activeCoachingAffirmationId,
    coachShareQuotaPerMonth: data.coachShareQuotaPerMonth,
    coachShareMonthKey: data.coachShareMonthKey,
    coachShareUsedThisMonth: data.coachShareUsedThisMonth,
    weekStartsOn: normalizeJournalWeekStartsOnField(data.weekStartsOn),
    weeklyAiReportWriteMode:
      data.weeklyAiReportWriteMode === 'overwrite' ||
      data.weeklyAiReportWriteMode === 'append' ||
      data.weeklyAiReportWriteMode === 'skip_if_nonempty'
        ? (data.weeklyAiReportWriteMode as WeeklyAiReportWriteMode)
        : undefined,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    lastLoginAt: data.lastLoginAt?.toDate?.() ?? new Date(),
  };
}
