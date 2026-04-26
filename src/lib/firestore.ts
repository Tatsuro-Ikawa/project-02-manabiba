import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  addDoc,
  runTransaction,
  Timestamp,
  serverTimestamp,
  deleteDoc,
  deleteField,
  writeBatch,
  type Transaction,
  type FieldValue
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizeJournalWeekStartsOnField } from '@/lib/journalWeek';
import { decrypt, encrypt } from '@/utils/encryption';
import { User } from 'firebase/auth';
import { 
  UserProfile,
  TrialAffirmationSubmenu, 
  type JournalWeekStartsOn,
  UserRole, 
  SubscriptionPlan, 
  FeatureAccess, 
  UsageLimits, 
  SubscriptionInfo 
} from '@/types/auth';

export interface PDCAData {
  id?: string;
  uid: string;
  date: string;
  plan?: string;
  planCreatedAt?: Timestamp;
  planUpdatedAt?: Timestamp;
  do?: string;
  doCreatedAt?: Timestamp;
  doUpdatedAt?: Timestamp;
  check?: string;
  checkCreatedAt?: Timestamp;
  checkUpdatedAt?: Timestamp;
  action?: string;
  actionCreatedAt?: Timestamp;
  actionUpdatedAt?: Timestamp;
  // 週・月単位の集約用フィールド
  weekOfYear?: number;
  monthOfYear?: number;
  year?: number;
  // コメント機能
  comments?: string[];
  coachComments?: string[];
  aiComments?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// 週・月単位の集約データ
export interface PDCAAggregation {
  id?: string;
  uid: string;
  period: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  weekOfYear?: number;
  monthOfYear?: number;
  year: number;
  summary: {
    totalEntries: number;
    completedEntries: number;
    completionRate: number;
    keyAchievements: string[];
    challenges: string[];
    nextActions: string[];
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// コーチング機能の型定義
export interface CoachingSession {
  id?: string;
  userId: string;
  sessionType: 'coaching' | 'goalSetting' | 'aiAnalysis';
  sessionDate: Timestamp;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Goal {
  id?: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: Timestamp;
  status: 'notStarted' | 'inProgress' | 'completed';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AIAnalysis {
  id?: string;
  userId: string;
  analysisType: 'daily' | 'weekly' | 'monthly';
  analysisDate: Timestamp;
  summary?: string;
  keyPoints?: string[];
  challenges?: string[];
  recommendations?: string[];
  createdAt?: Timestamp;
}

export interface CoachingSettings {
  id?: string;
  userId: string;
  autoGoalCreation: boolean;
  autoAnalysisGeneration: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** ホーム画面「最新動画」1件（DB保存用。id はクライアント側で付与） */
export interface HomeLatestVideoEntry {
  url: string;
  title: string;
  thumbnailUrl: string;
  order: number;
  author_name?: string;
  author_url?: string;
}

/** ホーム画面「最新記事」1件（サムネイル・見出し・リード・出所） */
export interface HomeLatestArticleEntry {
  url: string;
  title: string;
  lead: string;
  source: string;
  thumbnailUrl: string;
  order: number;
}

/** ホーム画面「いちおしサイト」1件（OGP 流用で URL から取得） */
export interface HomeReferenceLinkEntry {
  url: string;
  title?: string;
  siteName: string;
  thumbnailUrl: string;
  order: number;
}

/** site_content/home ドキュメントの型（ホーム画面用共通コンテンツ） */
export interface HomeContent {
  latestVideos?: HomeLatestVideoEntry[];
  referenceLinks?: HomeReferenceLinkEntry[];
  latestArticles?: HomeLatestArticleEntry[];
  ad?: unknown;
  updatedAt?: Timestamp;
}

// ユーザープロファイル関連の関数
export const createUserProfile = async (userProfile: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'lastLoginAt'>): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await setDoc(doc(db, 'users', userProfile.uid), {
      ...userProfile,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });
  } catch (error) {
    console.error('ユーザープロファイル作成エラー:', error);
    throw error;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        weekStartsOn: normalizeJournalWeekStartsOnField(data.weekStartsOn),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        lastLoginAt: data.lastLoginAt?.toDate(),
        consents: data.consents
          ? {
              ...data.consents,
              acceptedAt: data.consents?.acceptedAt?.toDate?.() ?? data.consents?.acceptedAt,
            }
          : undefined,
        subscription: {
          ...data.subscription,
          startDate: data.subscription?.startDate?.toDate(),
          endDate: data.subscription?.endDate?.toDate(),
        },
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('ユーザープロファイル取得エラー:', error);
    throw error;
  }
};

/** マネジメント日誌の週の開始曜日（`monday` のときはフィールド削除でデフォルトと一致） */
export const updateJournalWeekStartsOn = async (
  uid: string,
  weekStartsOn: JournalWeekStartsOn
): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    if (weekStartsOn === 'monday') {
      await updateDoc(doc(db, 'users', uid), {
        weekStartsOn: deleteField(),
        updatedAt: now,
      });
    } else {
      await updateDoc(doc(db, 'users', uid), {
        weekStartsOn: 'sunday',
        updatedAt: now,
      });
    }
  } catch (error) {
    console.error('weekStartsOn 更新エラー:', error);
    throw error;
  }
};

export const updateUserConsents = async (
  uid: string,
  consents: { termsVersion: string; privacyVersion: string }
): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await updateDoc(doc(db, 'users', uid), {
      consents: {
        ...consents,
        acceptedAt: now,
      },
      updatedAt: now,
    });
  } catch (error) {
    console.error('同意情報更新エラー:', error);
    throw error;
  }
};

// アファメーション（穴埋め）下書き
const AFFIRMATION_DRAFTS_SUBCOLLECTION = 'affirmation_drafts';

export interface AffirmationDraftDoc {
  profileId: string;
  /** 暗号化された JSON（slotId -> value） */
  encryptedSlots: string;
  updatedAt?: unknown;
}

/** 下書き 1 件取得。`updatedAtMs` は一覧の最終更新ソート用 */
export const getAffirmationDraft = async (
  uid: string,
  profileId: string
): Promise<{ encryptedSlots: string; updatedAtMs: number } | null> => {
  try {
    const ref = doc(db, 'users', uid, AFFIRMATION_DRAFTS_SUBCOLLECTION, profileId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    const updatedAt = data.updatedAt as Timestamp | undefined;
    return {
      encryptedSlots: data.encryptedSlots as string,
      updatedAtMs: updatedAt?.toMillis() ?? Date.now(),
    };
  } catch (error) {
    console.error('アファメーション下書き取得エラー:', error);
    throw error;
  }
};

export const saveAffirmationDraft = async (
  uid: string,
  profileId: string,
  encryptedSlots: string
): Promise<void> => {
  try {
    const ref = doc(db, 'users', uid, AFFIRMATION_DRAFTS_SUBCOLLECTION, profileId);
    await setDoc(
      ref,
      {
        profileId,
        encryptedSlots,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('アファメーション下書き保存エラー:', error);
    throw error;
  }
};

/** プロファイル単位の穴埋め下書きを削除（発行完了後のリセットや、将来の「下書き破棄」用） */
export const deleteAffirmationDraft = async (uid: string, profileId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'users', uid, AFFIRMATION_DRAFTS_SUBCOLLECTION, profileId));
  } catch (error) {
    console.error('アファメーション下書き削除エラー:', error);
    throw error;
  }
};

// マネジメント日誌（学び帳）— 日次: 朝・晩（旧名 trial_4w_daily）
const JOURNAL_DAILY_SUBCOLLECTION = 'journal_daily';

export type Trial4wDateKey = `${number}-${string}-${string}`; // YYYY-MM-DD（簡易）

export type Trial4wMorningAffirmationDeclaration = 'done' | 'undone';
export type Trial4wEveningExecution = 'done' | 'partial' | 'none';
export type Trial4wEveningBrake = 'yes' | 'partial' | 'no';

export type Trial4wDailyPlain = {
  dateKey: string;
  tz: 'Asia/Tokyo';
  morningAffirmationDeclaration: Trial4wMorningAffirmationDeclaration | null;
  morningTodayActionText: string | null;
  morningActionGoalText: string | null;
  morningActionContentText: string | null;
  morningImagingDone: boolean | null;

  eveningExecution: Trial4wEveningExecution | null;
  eveningSpecificActionsText: string | null;
  eveningResultText: string | null;
  eveningResultExecutionText: string | null;
  eveningResultGoalProgressText: string | null;
  eveningSatisfaction: number | null; // 0..10
  eveningEmotionThoughtText: string | null;
  eveningBrake: Trial4wEveningBrake | null;
  /** 反論できたか（できた／一部できた／できなかった）。旧 free text は eveningBrakeRebuttedText */
  eveningBrakeRebuttalChoice: Trial4wEveningExecution | null;
  eveningRebuttalText: string | null;
  eveningBrakeWorkedText: string | null;
  eveningBrakeRebuttedText: string | null;
  eveningBrakeWordsText: string | null;
  eveningInsightText: string | null;
  eveningImprovementText: string | null;
  eveningAiSuggestionText: string | null;
  eveningAiSuggestionRunCount: number | null;
  eveningMessageToSelfText: string | null;
  eveningTomorrowActionSeedText: string | null;
  eveningTomorrowGoalText: string | null;
  eveningTomorrowActionContentText: string | null;
  eveningTomorrowImagingDone: boolean | null;
};

export type Trial4wDailyEncrypted = {
  dateKey: string;
  tz: 'Asia/Tokyo';
  morningAffirmationDeclaration: Trial4wMorningAffirmationDeclaration | null;
  morningTodayActionTextEncrypted: string | null;
  morningActionGoalTextEncrypted: string | null;
  morningActionContentTextEncrypted: string | null;
  morningImagingDone: boolean | null;

  eveningExecution: Trial4wEveningExecution | null;
  eveningSpecificActionsTextEncrypted: string | null;
  eveningResultTextEncrypted: string | null;
  eveningResultExecutionTextEncrypted: string | null;
  eveningResultGoalProgressTextEncrypted: string | null;
  eveningSatisfaction: number | null;
  eveningEmotionThoughtTextEncrypted: string | null;
  eveningBrake: Trial4wEveningBrake | null;
  eveningBrakeRebuttalChoice: Trial4wEveningExecution | null;
  eveningRebuttalTextEncrypted: string | null;
  eveningBrakeWorkedTextEncrypted: string | null;
  eveningBrakeRebuttedTextEncrypted: string | null;
  eveningBrakeWordsTextEncrypted: string | null;
  eveningInsightTextEncrypted: string | null;
  eveningImprovementTextEncrypted: string | null;
  eveningAiSuggestionTextEncrypted: string | null;
  eveningAiSuggestionRunCount: number | null;
  eveningMessageToSelfTextEncrypted: string | null;
  eveningTomorrowActionSeedTextEncrypted: string | null;
  eveningTomorrowGoalTextEncrypted: string | null;
  eveningTomorrowActionContentTextEncrypted: string | null;
  eveningTomorrowImagingDone: boolean | null;

  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
};

function toDateKeyTokyo(d: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(d); // YYYY-MM-DD
}

export function addDaysDateKey(dateKey: string, days: number): string {
  // dateKey は YYYY-MM-DD を想定。日付操作は JST 固定で扱いたいが、
  // まずは UTC で日付を組み立てて加算（YYYY-MM-DD の前後移動用途）。
  const [y, m, d] = dateKey.split('-').map((x) => Number(x));
  const base = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  base.setUTCDate(base.getUTCDate() + days);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function clampSatisfaction(x: number | null | undefined): number | null {
  if (x == null || Number.isNaN(x)) return null;
  return Math.max(0, Math.min(10, Math.round(x)));
}

function normalizeText(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const t = x.trim();
  return t ? t : null;
}

export async function getTrial4wDailyPlain(
  uid: string,
  dateKey?: string | null
): Promise<Trial4wDailyPlain> {
  const dk = dateKey ?? toDateKeyTokyo(new Date());
  const ref = doc(db, 'users', uid, JOURNAL_DAILY_SUBCOLLECTION, dk);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return {
      dateKey: dk,
      tz: 'Asia/Tokyo',
      morningAffirmationDeclaration: null,
      morningTodayActionText: null,
      morningActionGoalText: null,
      morningActionContentText: null,
      morningImagingDone: null,
      eveningExecution: null,
      eveningSpecificActionsText: null,
      eveningResultText: null,
      eveningResultExecutionText: null,
      eveningResultGoalProgressText: null,
      eveningSatisfaction: null,
      eveningEmotionThoughtText: null,
      eveningBrake: null,
      eveningBrakeRebuttalChoice: null,
      eveningRebuttalText: null,
      eveningBrakeWorkedText: null,
      eveningBrakeRebuttedText: null,
      eveningBrakeWordsText: null,
      eveningInsightText: null,
      eveningImprovementText: null,
      eveningAiSuggestionText: null,
      eveningAiSuggestionRunCount: null,
      eveningMessageToSelfText: null,
      eveningTomorrowActionSeedText: null,
      eveningTomorrowGoalText: null,
      eveningTomorrowActionContentText: null,
      eveningTomorrowImagingDone: null,
    };
  }
  const data = snap.data() as Trial4wDailyEncrypted;
  const decryptOrNull = async (enc: unknown): Promise<string | null> => {
    if (typeof enc !== 'string' || !enc) return null;
    try {
      return await decrypt(enc, uid);
    } catch {
      return null;
    }
  };
  const morningTodayActionText = await decryptOrNull(data.morningTodayActionTextEncrypted);
  const morningActionGoalText = (await decryptOrNull(data.morningActionGoalTextEncrypted)) ?? morningTodayActionText;
  const eveningResultText = await decryptOrNull(data.eveningResultTextEncrypted);
  const eveningResultExecutionText =
    (await decryptOrNull(data.eveningResultExecutionTextEncrypted)) ?? eveningResultText;
  const eveningRebuttalText = await decryptOrNull(data.eveningRebuttalTextEncrypted);
  const eveningBrakeRebuttedText =
    (await decryptOrNull(data.eveningBrakeRebuttedTextEncrypted)) ?? eveningRebuttalText;
  const eveningBrakeWordsText = (await decryptOrNull(data.eveningBrakeWordsTextEncrypted)) ?? eveningRebuttalText;
  const eveningTomorrowGoalText =
    (await decryptOrNull(data.eveningTomorrowGoalTextEncrypted)) ??
    (await decryptOrNull(data.eveningTomorrowActionSeedTextEncrypted));

  return {
    dateKey: dk,
    tz: 'Asia/Tokyo',
    morningAffirmationDeclaration:
      data.morningAffirmationDeclaration === 'done' || data.morningAffirmationDeclaration === 'undone'
        ? data.morningAffirmationDeclaration
        : null,
    morningTodayActionText,
    morningActionGoalText,
    morningActionContentText: await decryptOrNull(data.morningActionContentTextEncrypted),
    morningImagingDone: typeof data.morningImagingDone === 'boolean' ? data.morningImagingDone : null,

    eveningExecution:
      data.eveningExecution === 'done' || data.eveningExecution === 'partial' || data.eveningExecution === 'none'
        ? data.eveningExecution
        : null,
    eveningSpecificActionsText: await decryptOrNull(data.eveningSpecificActionsTextEncrypted),
    eveningResultText,
    eveningResultExecutionText,
    eveningResultGoalProgressText: await decryptOrNull(data.eveningResultGoalProgressTextEncrypted),
    eveningSatisfaction: typeof data.eveningSatisfaction === 'number' ? clampSatisfaction(data.eveningSatisfaction) : null,
    eveningEmotionThoughtText: await decryptOrNull(data.eveningEmotionThoughtTextEncrypted),
    eveningBrake:
      data.eveningBrake === 'yes' || data.eveningBrake === 'partial' || data.eveningBrake === 'no'
        ? data.eveningBrake
        : null,
    eveningBrakeRebuttalChoice:
      data.eveningBrakeRebuttalChoice === 'done' ||
      data.eveningBrakeRebuttalChoice === 'partial' ||
      data.eveningBrakeRebuttalChoice === 'none'
        ? data.eveningBrakeRebuttalChoice
        : null,
    eveningRebuttalText,
    eveningBrakeWorkedText: await decryptOrNull(data.eveningBrakeWorkedTextEncrypted),
    eveningBrakeRebuttedText,
    eveningBrakeWordsText,
    eveningInsightText: await decryptOrNull(data.eveningInsightTextEncrypted),
    eveningImprovementText: await decryptOrNull(data.eveningImprovementTextEncrypted),
    eveningAiSuggestionText: await decryptOrNull(data.eveningAiSuggestionTextEncrypted),
    eveningAiSuggestionRunCount:
      typeof data.eveningAiSuggestionRunCount === 'number'
        ? Math.max(0, Math.floor(data.eveningAiSuggestionRunCount))
        : null,
    eveningMessageToSelfText: await decryptOrNull(data.eveningMessageToSelfTextEncrypted),
    eveningTomorrowActionSeedText: await decryptOrNull(data.eveningTomorrowActionSeedTextEncrypted),
    eveningTomorrowGoalText,
    eveningTomorrowActionContentText: await decryptOrNull(data.eveningTomorrowActionContentTextEncrypted),
    eveningTomorrowImagingDone:
      typeof data.eveningTomorrowImagingDone === 'boolean' ? data.eveningTomorrowImagingDone : null,
  };
}

/** 週次集約用: 指定範囲（JST の dateKey）の日次をまとめて取得 */
export async function listJournalDailyPlainInRange(params: {
  uid: string;
  startDateKey: string; // inclusive YYYY-MM-DD
  endDateKey: string; // inclusive YYYY-MM-DD
}): Promise<Record<string, Trial4wDailyPlain>> {
  const { uid, startDateKey, endDateKey } = params;
  if (!uid) return {};
  if (!startDateKey || !endDateKey) return {};

  const q = query(
    collection(db, 'users', uid, JOURNAL_DAILY_SUBCOLLECTION),
    where('dateKey', '>=', startDateKey),
    where('dateKey', '<=', endDateKey),
    orderBy('dateKey', 'asc')
  );
  const snaps = await getDocs(q);

  const decryptOrNull = async (enc: unknown): Promise<string | null> => {
    if (typeof enc !== 'string' || !enc) return null;
    try {
      return await decrypt(enc, uid);
    } catch {
      return null;
    }
  };

  const out: Record<string, Trial4wDailyPlain> = {};
  for (const snap of snaps.docs) {
    const raw = snap.data() as Partial<Trial4wDailyEncrypted>;
    const dk = typeof raw.dateKey === 'string' ? raw.dateKey : snap.id;
    const morningTodayActionText = await decryptOrNull(raw.morningTodayActionTextEncrypted);
    const morningActionGoalText = (await decryptOrNull(raw.morningActionGoalTextEncrypted)) ?? morningTodayActionText;
    const eveningResultText = await decryptOrNull(raw.eveningResultTextEncrypted);
    const eveningResultExecutionText =
      (await decryptOrNull(raw.eveningResultExecutionTextEncrypted)) ?? eveningResultText;
    const eveningRebuttalText = await decryptOrNull(raw.eveningRebuttalTextEncrypted);
    const eveningBrakeRebuttedText =
      (await decryptOrNull(raw.eveningBrakeRebuttedTextEncrypted)) ?? eveningRebuttalText;
    const eveningBrakeWordsText = (await decryptOrNull(raw.eveningBrakeWordsTextEncrypted)) ?? eveningRebuttalText;
    const eveningTomorrowGoalText =
      (await decryptOrNull(raw.eveningTomorrowGoalTextEncrypted)) ??
      (await decryptOrNull(raw.eveningTomorrowActionSeedTextEncrypted));

    out[dk] = {
      dateKey: dk,
      tz: 'Asia/Tokyo',
      morningAffirmationDeclaration:
        raw.morningAffirmationDeclaration === 'done' || raw.morningAffirmationDeclaration === 'undone'
          ? raw.morningAffirmationDeclaration
          : null,
      morningTodayActionText,
      morningActionGoalText,
      morningActionContentText: await decryptOrNull(raw.morningActionContentTextEncrypted),
      morningImagingDone: typeof raw.morningImagingDone === 'boolean' ? raw.morningImagingDone : null,
      eveningExecution:
        raw.eveningExecution === 'done' || raw.eveningExecution === 'partial' || raw.eveningExecution === 'none'
          ? raw.eveningExecution
          : null,
      eveningSpecificActionsText: await decryptOrNull(raw.eveningSpecificActionsTextEncrypted),
      eveningResultText,
      eveningResultExecutionText,
      eveningResultGoalProgressText: await decryptOrNull(raw.eveningResultGoalProgressTextEncrypted),
      eveningSatisfaction: typeof raw.eveningSatisfaction === 'number' ? clampSatisfaction(raw.eveningSatisfaction) : null,
      eveningEmotionThoughtText: await decryptOrNull(raw.eveningEmotionThoughtTextEncrypted),
      eveningBrake:
        raw.eveningBrake === 'yes' || raw.eveningBrake === 'partial' || raw.eveningBrake === 'no'
          ? raw.eveningBrake
          : null,
      eveningBrakeRebuttalChoice:
        raw.eveningBrakeRebuttalChoice === 'done' ||
        raw.eveningBrakeRebuttalChoice === 'partial' ||
        raw.eveningBrakeRebuttalChoice === 'none'
          ? raw.eveningBrakeRebuttalChoice
          : null,
      eveningRebuttalText,
      eveningBrakeWorkedText: await decryptOrNull(raw.eveningBrakeWorkedTextEncrypted),
      eveningBrakeRebuttedText,
      eveningBrakeWordsText,
      eveningInsightText: await decryptOrNull(raw.eveningInsightTextEncrypted),
      eveningImprovementText: await decryptOrNull(raw.eveningImprovementTextEncrypted),
      eveningAiSuggestionText: await decryptOrNull(raw.eveningAiSuggestionTextEncrypted),
      eveningAiSuggestionRunCount:
        typeof raw.eveningAiSuggestionRunCount === 'number'
          ? Math.max(0, Math.floor(raw.eveningAiSuggestionRunCount))
          : null,
      eveningMessageToSelfText: await decryptOrNull(raw.eveningMessageToSelfTextEncrypted),
      eveningTomorrowActionSeedText: await decryptOrNull(raw.eveningTomorrowActionSeedTextEncrypted),
      eveningTomorrowGoalText,
      eveningTomorrowActionContentText: await decryptOrNull(raw.eveningTomorrowActionContentTextEncrypted),
      eveningTomorrowImagingDone:
        typeof raw.eveningTomorrowImagingDone === 'boolean' ? raw.eveningTomorrowImagingDone : null,
    };
  }
  return out;
}

export async function saveTrial4wDailyPlain(params: {
  uid: string;
  dateKey: string;
  patch: Partial<Trial4wDailyPlain>;
}): Promise<void> {
  const ref = doc(db, 'users', params.uid, JOURNAL_DAILY_SUBCOLLECTION, params.dateKey);
  const now = serverTimestamp();

  const payload: Partial<Trial4wDailyEncrypted> = {
    dateKey: params.dateKey,
    tz: 'Asia/Tokyo',
    updatedAt: now as FieldValue,
  };

  if ('morningAffirmationDeclaration' in params.patch) {
    payload.morningAffirmationDeclaration = params.patch.morningAffirmationDeclaration ?? null;
  }
  if ('morningImagingDone' in params.patch) {
    payload.morningImagingDone =
      typeof params.patch.morningImagingDone === 'boolean' ? params.patch.morningImagingDone : null;
  }
  if ('eveningExecution' in params.patch) {
    payload.eveningExecution = params.patch.eveningExecution ?? null;
  }
  if ('eveningBrake' in params.patch) {
    payload.eveningBrake = params.patch.eveningBrake ?? null;
  }
  if ('eveningBrakeRebuttalChoice' in params.patch) {
    const c = params.patch.eveningBrakeRebuttalChoice;
    payload.eveningBrakeRebuttalChoice =
      c === 'done' || c === 'partial' || c === 'none' ? c : null;
  }
  if ('eveningSatisfaction' in params.patch) {
    payload.eveningSatisfaction = clampSatisfaction(params.patch.eveningSatisfaction);
  }
  if ('eveningAiSuggestionRunCount' in params.patch) {
    const n = params.patch.eveningAiSuggestionRunCount;
    payload.eveningAiSuggestionRunCount =
      typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
  }
  if ('eveningTomorrowImagingDone' in params.patch) {
    payload.eveningTomorrowImagingDone =
      typeof params.patch.eveningTomorrowImagingDone === 'boolean'
        ? params.patch.eveningTomorrowImagingDone
        : null;
  }

  const encFields: Array<[keyof Trial4wDailyEncrypted, string | null]> = [];
  if ('morningTodayActionText' in params.patch) {
    encFields.push(['morningTodayActionTextEncrypted', normalizeText(params.patch.morningTodayActionText)]);
  }
  if ('morningActionGoalText' in params.patch) {
    encFields.push(['morningActionGoalTextEncrypted', normalizeText(params.patch.morningActionGoalText)]);
  }
  if ('morningActionContentText' in params.patch) {
    encFields.push(['morningActionContentTextEncrypted', normalizeText(params.patch.morningActionContentText)]);
  }
  if ('eveningSpecificActionsText' in params.patch) {
    encFields.push(['eveningSpecificActionsTextEncrypted', normalizeText(params.patch.eveningSpecificActionsText)]);
  }
  if ('eveningResultText' in params.patch) {
    encFields.push(['eveningResultTextEncrypted', normalizeText(params.patch.eveningResultText)]);
  }
  if ('eveningResultExecutionText' in params.patch) {
    encFields.push(['eveningResultExecutionTextEncrypted', normalizeText(params.patch.eveningResultExecutionText)]);
  }
  if ('eveningResultGoalProgressText' in params.patch) {
    encFields.push(['eveningResultGoalProgressTextEncrypted', normalizeText(params.patch.eveningResultGoalProgressText)]);
  }
  if ('eveningEmotionThoughtText' in params.patch) {
    encFields.push(['eveningEmotionThoughtTextEncrypted', normalizeText(params.patch.eveningEmotionThoughtText)]);
  }
  if ('eveningRebuttalText' in params.patch) {
    encFields.push(['eveningRebuttalTextEncrypted', normalizeText(params.patch.eveningRebuttalText)]);
  }
  if ('eveningBrakeWorkedText' in params.patch) {
    encFields.push(['eveningBrakeWorkedTextEncrypted', normalizeText(params.patch.eveningBrakeWorkedText)]);
  }
  if ('eveningBrakeRebuttedText' in params.patch) {
    encFields.push(['eveningBrakeRebuttedTextEncrypted', normalizeText(params.patch.eveningBrakeRebuttedText)]);
  }
  if ('eveningBrakeWordsText' in params.patch) {
    encFields.push(['eveningBrakeWordsTextEncrypted', normalizeText(params.patch.eveningBrakeWordsText)]);
  }
  if ('eveningInsightText' in params.patch) {
    encFields.push(['eveningInsightTextEncrypted', normalizeText(params.patch.eveningInsightText)]);
  }
  if ('eveningImprovementText' in params.patch) {
    encFields.push(['eveningImprovementTextEncrypted', normalizeText(params.patch.eveningImprovementText)]);
  }
  if ('eveningAiSuggestionText' in params.patch) {
    encFields.push(['eveningAiSuggestionTextEncrypted', normalizeText(params.patch.eveningAiSuggestionText)]);
  }
  if ('eveningMessageToSelfText' in params.patch) {
    encFields.push(['eveningMessageToSelfTextEncrypted', normalizeText(params.patch.eveningMessageToSelfText)]);
  }
  if ('eveningTomorrowActionSeedText' in params.patch) {
    encFields.push([
      'eveningTomorrowActionSeedTextEncrypted',
      normalizeText(params.patch.eveningTomorrowActionSeedText),
    ]);
  }
  if ('eveningTomorrowGoalText' in params.patch) {
    encFields.push(['eveningTomorrowGoalTextEncrypted', normalizeText(params.patch.eveningTomorrowGoalText)]);
  }
  if ('eveningTomorrowActionContentText' in params.patch) {
    encFields.push([
      'eveningTomorrowActionContentTextEncrypted',
      normalizeText(params.patch.eveningTomorrowActionContentText),
    ]);
  }

  for (const [k, t] of encFields) {
    (payload as any)[k] = t ? await encrypt(t, params.uid) : null;
  }

  // 翌日の「今日の行動内容（目標）」へコピー（未入力のときのみ）
  const seedGoal = normalizeText(params.patch.eveningTomorrowGoalText) ?? normalizeText(params.patch.eveningTomorrowActionSeedText);
  const seedContent = normalizeText(params.patch.eveningTomorrowActionContentText);
  if (seedGoal || seedContent) {
    const nextKey = addDaysDateKey(params.dateKey, 1);
    const nextRef = doc(db, 'users', params.uid, JOURNAL_DAILY_SUBCOLLECTION, nextKey);
    await runTransaction(db, async (tx: Transaction) => {
      const nextSnap = await tx.get(nextRef);
      const nextData = nextSnap.exists() ? (nextSnap.data() as Trial4wDailyEncrypted) : null;
      const already = typeof nextData?.morningTodayActionTextEncrypted === 'string' && nextData.morningTodayActionTextEncrypted;
      const alreadyGoal = typeof nextData?.morningActionGoalTextEncrypted === 'string' && nextData.morningActionGoalTextEncrypted;
      const alreadyContent =
        typeof nextData?.morningActionContentTextEncrypted === 'string' && nextData.morningActionContentTextEncrypted;

      const morningTodayActionTextEncrypted =
        already || !seedGoal ? nextData?.morningTodayActionTextEncrypted ?? null : await encrypt(seedGoal, params.uid);
      const morningActionGoalTextEncrypted =
        alreadyGoal || !seedGoal ? nextData?.morningActionGoalTextEncrypted ?? null : await encrypt(seedGoal, params.uid);
      const morningActionContentTextEncrypted =
        alreadyContent || !seedContent
          ? nextData?.morningActionContentTextEncrypted ?? null
          : await encrypt(seedContent, params.uid);

      if (!nextSnap.exists()) {
        tx.set(nextRef, {
          dateKey: nextKey,
          tz: 'Asia/Tokyo',
          morningTodayActionTextEncrypted,
          morningActionGoalTextEncrypted,
          morningActionContentTextEncrypted,
          createdAt: now as FieldValue,
          updatedAt: now as FieldValue,
        } as any);
      } else {
        const nextPatch: Record<string, unknown> = { updatedAt: now as FieldValue };
        if (!already && morningTodayActionTextEncrypted) {
          nextPatch.morningTodayActionTextEncrypted = morningTodayActionTextEncrypted;
        }
        if (!alreadyGoal && morningActionGoalTextEncrypted) {
          nextPatch.morningActionGoalTextEncrypted = morningActionGoalTextEncrypted;
        }
        if (!alreadyContent && morningActionContentTextEncrypted) {
          nextPatch.morningActionContentTextEncrypted = morningActionContentTextEncrypted;
        }
        if (Object.keys(nextPatch).length > 1) {
          tx.update(nextRef, nextPatch as any);
        }
      }
      tx.set(ref, { ...payload, createdAt: now as FieldValue } as any, { merge: true });
    });
    return;
  }

  await setDoc(ref, { ...payload, createdAt: now as FieldValue } as any, { merge: true });
}

// マネジメント日誌（学び帳）— 週次（SCREEN-006）
const JOURNAL_WEEKLY_SUBCOLLECTION = 'journal_weekly';

/** 週次ドキュメント ID = 当該週の開始日 YYYY-MM-DD（JST・ユーザの週開始設定に準拠したキー） */
export type JournalWeeklyPlain = {
  weekStartKey: string;
  tz: 'Asia/Tokyo';
  /** 今週の行動目標 */
  thisWeekActionGoalText: string | null;
  /** 行動内容と成果 */
  actionContentAndOutcomeText: string | null;
  /** 行動時の思考・感情 */
  emotionAndThoughtText: string | null;
  /** 今週の気づき・感動・学び */
  insightAndLearningText: string | null;
  /** 今週の改善まとめ */
  improvementSummaryText: string | null;
  /** 来週の行動目標 */
  nextWeekActionGoalText: string | null;
};

export type JournalWeeklyEncrypted = {
  weekStartKey: string;
  tz: 'Asia/Tokyo';
  thisWeekActionGoalTextEncrypted: string | null;
  actionContentAndOutcomeTextEncrypted: string | null;
  emotionAndThoughtTextEncrypted: string | null;
  insightAndLearningTextEncrypted: string | null;
  improvementSummaryTextEncrypted: string | null;
  nextWeekActionGoalTextEncrypted: string | null;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
};

export function journalWeeklyPlainEmpty(weekStartKey: string): JournalWeeklyPlain {
  return {
    weekStartKey,
    tz: 'Asia/Tokyo',
    thisWeekActionGoalText: null,
    actionContentAndOutcomeText: null,
    emotionAndThoughtText: null,
    insightAndLearningText: null,
    improvementSummaryText: null,
    nextWeekActionGoalText: null,
  };
}

export async function getJournalWeeklyPlain(
  uid: string,
  weekStartKey: string
): Promise<JournalWeeklyPlain> {
  if (!weekStartKey) return journalWeeklyPlainEmpty('');
  const ref = doc(db, 'users', uid, JOURNAL_WEEKLY_SUBCOLLECTION, weekStartKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return journalWeeklyPlainEmpty(weekStartKey);
  }
  const data = snap.data() as JournalWeeklyEncrypted;
  const decryptOrNull = async (enc: unknown): Promise<string | null> => {
    if (typeof enc !== 'string' || !enc) return null;
    try {
      return await decrypt(enc, uid);
    } catch {
      return null;
    }
  };
  return {
    weekStartKey,
    tz: 'Asia/Tokyo',
    thisWeekActionGoalText: await decryptOrNull(data.thisWeekActionGoalTextEncrypted),
    actionContentAndOutcomeText: await decryptOrNull(data.actionContentAndOutcomeTextEncrypted),
    emotionAndThoughtText: await decryptOrNull(data.emotionAndThoughtTextEncrypted),
    insightAndLearningText: await decryptOrNull(data.insightAndLearningTextEncrypted),
    improvementSummaryText: await decryptOrNull(data.improvementSummaryTextEncrypted),
    nextWeekActionGoalText: await decryptOrNull(data.nextWeekActionGoalTextEncrypted),
  };
}

export async function saveJournalWeeklyPlain(params: {
  uid: string;
  weekStartKey: string;
  patch: Partial<JournalWeeklyPlain>;
}): Promise<void> {
  if (!params.weekStartKey) return;
  const ref = doc(db, 'users', params.uid, JOURNAL_WEEKLY_SUBCOLLECTION, params.weekStartKey);
  const now = serverTimestamp();

  const payload: Partial<JournalWeeklyEncrypted> = {
    weekStartKey: params.weekStartKey,
    tz: 'Asia/Tokyo',
    updatedAt: now as FieldValue,
  };

  const encPairs: Array<[keyof JournalWeeklyEncrypted, string | null]> = [];
  if ('thisWeekActionGoalText' in params.patch) {
    encPairs.push(['thisWeekActionGoalTextEncrypted', normalizeText(params.patch.thisWeekActionGoalText)]);
  }
  if ('actionContentAndOutcomeText' in params.patch) {
    encPairs.push(['actionContentAndOutcomeTextEncrypted', normalizeText(params.patch.actionContentAndOutcomeText)]);
  }
  if ('emotionAndThoughtText' in params.patch) {
    encPairs.push(['emotionAndThoughtTextEncrypted', normalizeText(params.patch.emotionAndThoughtText)]);
  }
  if ('insightAndLearningText' in params.patch) {
    encPairs.push(['insightAndLearningTextEncrypted', normalizeText(params.patch.insightAndLearningText)]);
  }
  if ('improvementSummaryText' in params.patch) {
    encPairs.push(['improvementSummaryTextEncrypted', normalizeText(params.patch.improvementSummaryText)]);
  }
  if ('nextWeekActionGoalText' in params.patch) {
    encPairs.push(['nextWeekActionGoalTextEncrypted', normalizeText(params.patch.nextWeekActionGoalText)]);
  }

  for (const [k, t] of encPairs) {
    (payload as Record<string, unknown>)[k as string] = t ? await encrypt(t, params.uid) : null;
  }

  await setDoc(ref, { ...payload, createdAt: now as FieldValue } as Record<string, unknown>, {
    merge: true,
  });
}

/**
 * フェーズ6: 「来週の行動目標」→ 翌週の「今週の行動目標」へ繰り越し（上書きしない）。
 * - target（翌週）の thisWeekActionGoalText が空ならセット
 * - すでに入力済みなら何もしない
 */
export async function carryOverNextWeekGoalToNextThisWeek(params: {
  uid: string;
  targetWeekStartKey: string;
  nextWeekActionGoalText: string | null | undefined;
}): Promise<void> {
  const goal = normalizeText(params.nextWeekActionGoalText);
  if (!goal) return;
  if (!params.targetWeekStartKey) return;

  const ref = doc(db, 'users', params.uid, JOURNAL_WEEKLY_SUBCOLLECTION, params.targetWeekStartKey);
  const now = serverTimestamp();

  await runTransaction(db, async (tx: Transaction) => {
    const snap = await tx.get(ref);
    const existing = snap.exists() ? (snap.data() as Partial<JournalWeeklyEncrypted>) : null;
    const already =
      typeof existing?.thisWeekActionGoalTextEncrypted === 'string' && !!existing.thisWeekActionGoalTextEncrypted;

    if (!snap.exists()) {
      tx.set(
        ref,
        {
          weekStartKey: params.targetWeekStartKey,
          tz: 'Asia/Tokyo',
          thisWeekActionGoalTextEncrypted: already ? existing!.thisWeekActionGoalTextEncrypted : await encrypt(goal, params.uid),
          createdAt: now as FieldValue,
          updatedAt: now as FieldValue,
        } as Record<string, unknown>,
        { merge: true }
      );
      return;
    }

    if (!already) {
      tx.set(
        ref,
        {
          tz: 'Asia/Tokyo',
          thisWeekActionGoalTextEncrypted: await encrypt(goal, params.uid),
          updatedAt: now as FieldValue,
        } as Record<string, unknown>,
        { merge: true }
      );
    }
  });
}

// マネジメント日誌（学び帳）— 月次（SCREEN-007）
const JOURNAL_MONTHLY_SUBCOLLECTION = 'journal_monthly';

/** 月次ドキュメント ID = 暦月 YYYY-MM（Asia/Tokyo） */
export type JournalMonthlyPlain = {
  monthKey: string;
  tz: 'Asia/Tokyo';
  /** 今月成果目標 */
  thisMonthOutcomeGoalText: string | null;
  /** 今月行動目標 */
  thisMonthActionGoalText: string | null;
  /** 行動概要と成果達成状況 */
  actionSummaryAndOutcomeProgressText: string | null;
  /** 気づき・感動・学び */
  insightAndLearningText: string | null;
  /** 改善点 */
  improvementPointsText: string | null;
  /** 来月の行動目標 */
  nextMonthActionGoalText: string | null;
  /** 人コーチへの共有（閲覧）を許可するか */
  sharedWithCoach?: boolean;
};

export type JournalMonthlyEncrypted = {
  monthKey: string;
  tz: 'Asia/Tokyo';
  thisMonthOutcomeGoalTextEncrypted: string | null;
  thisMonthActionGoalTextEncrypted: string | null;
  actionSummaryAndOutcomeProgressTextEncrypted: string | null;
  insightAndLearningTextEncrypted: string | null;
  improvementPointsTextEncrypted: string | null;
  nextMonthActionGoalTextEncrypted: string | null;
  sharedWithCoach?: boolean;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
};

export function journalMonthlyPlainEmpty(monthKey: string): JournalMonthlyPlain {
  return {
    monthKey,
    tz: 'Asia/Tokyo',
    thisMonthOutcomeGoalText: null,
    thisMonthActionGoalText: null,
    actionSummaryAndOutcomeProgressText: null,
    insightAndLearningText: null,
    improvementPointsText: null,
    nextMonthActionGoalText: null,
    sharedWithCoach: false,
  };
}

export async function getJournalMonthlyPlain(uid: string, monthKey: string): Promise<JournalMonthlyPlain> {
  if (!monthKey) return journalMonthlyPlainEmpty('');
  const ref = doc(db, 'users', uid, JOURNAL_MONTHLY_SUBCOLLECTION, monthKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return journalMonthlyPlainEmpty(monthKey);
  }
  const data = snap.data() as JournalMonthlyEncrypted;
  const decryptOrNull = async (enc: unknown): Promise<string | null> => {
    if (typeof enc !== 'string' || !enc) return null;
    try {
      return await decrypt(enc, uid);
    } catch {
      return null;
    }
  };
  return {
    monthKey,
    tz: 'Asia/Tokyo',
    thisMonthOutcomeGoalText: await decryptOrNull(data.thisMonthOutcomeGoalTextEncrypted),
    thisMonthActionGoalText: await decryptOrNull(data.thisMonthActionGoalTextEncrypted),
    actionSummaryAndOutcomeProgressText: await decryptOrNull(data.actionSummaryAndOutcomeProgressTextEncrypted),
    insightAndLearningText: await decryptOrNull(data.insightAndLearningTextEncrypted),
    improvementPointsText: await decryptOrNull(data.improvementPointsTextEncrypted),
    nextMonthActionGoalText: await decryptOrNull(data.nextMonthActionGoalTextEncrypted),
    sharedWithCoach: data.sharedWithCoach ?? false,
  };
}

export async function saveJournalMonthlyPlain(params: {
  uid: string;
  monthKey: string;
  patch: Partial<JournalMonthlyPlain>;
}): Promise<void> {
  if (!params.monthKey) return;
  const ref = doc(db, 'users', params.uid, JOURNAL_MONTHLY_SUBCOLLECTION, params.monthKey);
  const now = serverTimestamp();

  const payload: Partial<JournalMonthlyEncrypted> = {
    monthKey: params.monthKey,
    tz: 'Asia/Tokyo',
    updatedAt: now as FieldValue,
  };

  const encPairs: Array<[keyof JournalMonthlyEncrypted, string | null]> = [];
  if ('sharedWithCoach' in params.patch) {
    payload.sharedWithCoach = !!params.patch.sharedWithCoach;
  }
  if ('thisMonthOutcomeGoalText' in params.patch) {
    encPairs.push(['thisMonthOutcomeGoalTextEncrypted', normalizeText(params.patch.thisMonthOutcomeGoalText)]);
  }
  if ('thisMonthActionGoalText' in params.patch) {
    encPairs.push(['thisMonthActionGoalTextEncrypted', normalizeText(params.patch.thisMonthActionGoalText)]);
  }
  if ('actionSummaryAndOutcomeProgressText' in params.patch) {
    encPairs.push([
      'actionSummaryAndOutcomeProgressTextEncrypted',
      normalizeText(params.patch.actionSummaryAndOutcomeProgressText),
    ]);
  }
  if ('insightAndLearningText' in params.patch) {
    encPairs.push(['insightAndLearningTextEncrypted', normalizeText(params.patch.insightAndLearningText)]);
  }
  if ('improvementPointsText' in params.patch) {
    encPairs.push(['improvementPointsTextEncrypted', normalizeText(params.patch.improvementPointsText)]);
  }
  if ('nextMonthActionGoalText' in params.patch) {
    encPairs.push(['nextMonthActionGoalTextEncrypted', normalizeText(params.patch.nextMonthActionGoalText)]);
  }

  for (const [k, t] of encPairs) {
    (payload as Record<string, unknown>)[k as string] = t ? await encrypt(t, params.uid) : null;
  }

  await setDoc(ref, { ...payload, createdAt: now as FieldValue } as Record<string, unknown>, {
    merge: true,
  });
}

const AFFIRMATIONS_SUBCOLLECTION = 'affirmations';

/**
 * 穴埋め結果を 1 本文（Markdown 相当の文字列）として発行する（案 B）。
 * - 親: `users/{uid}/affirmations/{affirmationId}`（メタ）
 * - 本文: `users/{uid}/affirmations/{affirmationId}/published/current`（暗号化）
 */
/** 発行済み本文（Markdown 平文）の上限（§9.7 #6a） */
export const AFFIRMATION_MARKDOWN_BODY_MAX_LENGTH = 1000;

export function validateAffirmationMarkdownBody(
  body: string
): { ok: true } | { ok: false; message: string } {
  const t = body.trim();
  if (!t) return { ok: false, message: '本文を入力してください。' };
  if (t.length > AFFIRMATION_MARKDOWN_BODY_MAX_LENGTH) {
    return {
      ok: false,
      message: `本文は${AFFIRMATION_MARKDOWN_BODY_MAX_LENGTH}文字以内にしてください。`,
    };
  }
  return { ok: true };
}

export const publishAffirmation = async (
  uid: string,
  params: {
    title: string;
    profileId: string;
    /** 発行する本文（プレビューと同じ生成結果を渡す） */
    markdownBody: string;
  }
): Promise<{ affirmationId: string }> => {
  try {
    const v = validateAffirmationMarkdownBody(params.markdownBody);
    if (!v.ok) {
      throw new Error(v.message);
    }
    const colRef = collection(db, 'users', uid, AFFIRMATIONS_SUBCOLLECTION);
    const affirmationRef = doc(colRef);
    const affirmationId = affirmationRef.id;
    const encryptedBody = await encrypt(params.markdownBody.trim(), uid);
    const now = serverTimestamp();

    await setDoc(affirmationRef, {
      title: params.title,
      status: 'published',
      profileId: params.profileId,
      sharedWithCoach: false,
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, 'users', uid, AFFIRMATIONS_SUBCOLLECTION, affirmationId, 'published', 'current'), {
      encryptedBody,
      publishedAt: now,
      updatedAt: now,
      coachCanReadPublished: false,
    });

    return { affirmationId };
  } catch (error) {
    console.error('アファメーション発行エラー:', error);
    throw error;
  }
};

/** 一覧用（A-7）。`updatedAt` で降順ソート（クライアント側。複合インデックス不要） */
export type AffirmationListItem = {
  id: string;
  title: string;
  status: string;
  profileId: string;
  updatedAtMs: number;
};

/** `coachScoped: true` … 担当コーチがクライアントの一覧を読むとき。ルールは共有 ON の親のみ read 可のため必須。 */
export const listUserAffirmations = async (
  uid: string,
  options?: { coachScoped?: boolean }
): Promise<AffirmationListItem[]> => {
  try {
    const colRef = collection(db, 'users', uid, AFFIRMATIONS_SUBCOLLECTION);
    const qRef =
      options?.coachScoped === true
        ? query(colRef, where('sharedWithCoach', '==', true))
        : colRef;
    const snap = await getDocs(qRef);
    const items: AffirmationListItem[] = snap.docs.map((d) => {
      const data = d.data();
      const updatedAt = data.updatedAt as Timestamp | undefined;
      return {
        id: d.id,
        title: typeof data.title === 'string' ? data.title : '',
        status: typeof data.status === 'string' ? data.status : 'unknown',
        profileId: typeof data.profileId === 'string' ? data.profileId : '',
        updatedAtMs: updatedAt?.toMillis() ?? 0,
      };
    });
    items.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    return items;
  } catch (error) {
    console.error('アファメーション一覧取得エラー:', error);
    throw error;
  }
};

/** `published/current` の本文を復号して返す（無い・失敗時は null） */
export const getAffirmationPublishedMarkdown = async (
  uid: string,
  affirmationId: string
): Promise<string | null> => {
  try {
    const ref = doc(db, 'users', uid, AFFIRMATIONS_SUBCOLLECTION, affirmationId, 'published', 'current');
    const s = await getDoc(ref);
    if (!s.exists()) return null;
    const data = s.data();
    const enc = data.encryptedBody;
    if (typeof enc !== 'string') return null;
    return await decrypt(enc, uid);
  } catch (error) {
    console.error('アファメーション本文取得エラー:', error);
    return null;
  }
};

/** A-9：履歴一覧の 1 行（`savedAt` 降順で並べ替え済みを想定） */
export type AffirmationHistoryListItem = {
  id: string;
  savedAtMs: number;
  /** 保存当時の名称（復号） */
  title: string;
};

/**
 * A-9：`affirmations/{id}/history` を列挙し、日時の新しい順で返す。
 * 各行のタイトルは復号（失敗時はプレースホルダ文言）。
 */
export const listAffirmationHistory = async (
  uid: string,
  affirmationId: string
): Promise<AffirmationHistoryListItem[]> => {
  try {
    const colRef = collection(db, 'users', uid, AFFIRMATIONS_SUBCOLLECTION, affirmationId, 'history');
    const snap = await getDocs(colRef);
    const items: AffirmationHistoryListItem[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      const savedAt = data.savedAt as Timestamp | undefined;
      const encTitle = data.encryptedTitle;
      let title = '（無題）';
      if (typeof encTitle === 'string') {
        try {
          const t = await decrypt(encTitle, uid);
          if (t.trim()) title = t;
        } catch {
          title = '（名称を表示できません）';
        }
      }
      items.push({
        id: d.id,
        savedAtMs: savedAt?.toMillis() ?? 0,
        title,
      });
    }
    items.sort((a, b) => b.savedAtMs - a.savedAtMs);
    return items;
  } catch (error) {
    console.error('アファメーション履歴一覧取得エラー:', error);
    throw error;
  }
};

export type AffirmationHistoryEntryDecrypted = {
  title: string;
  bodyMarkdown: string;
  savedAtMs: number;
};

/** A-9：履歴 1 件を復号（参照のみ・編集・復元はしない） */
export const getAffirmationHistoryEntryDecrypted = async (
  uid: string,
  affirmationId: string,
  historyDocId: string
): Promise<AffirmationHistoryEntryDecrypted | null> => {
  try {
    const ref = doc(
      db,
      'users',
      uid,
      AFFIRMATIONS_SUBCOLLECTION,
      affirmationId,
      'history',
      historyDocId
    );
    const s = await getDoc(ref);
    if (!s.exists()) return null;
    const data = s.data();
    const savedAt = data.savedAt as Timestamp | undefined;
    let title = '（無題）';
    let bodyMarkdown = '';
    const encT = data.encryptedTitle;
    if (typeof encT === 'string') {
      try {
        const t = await decrypt(encT, uid);
        if (t.trim()) title = t;
      } catch {
        title = '（名称を復号できません）';
      }
    }
    const encB = data.encryptedBody;
    if (typeof encB === 'string') {
      try {
        bodyMarkdown = await decrypt(encB, uid);
      } catch {
        bodyMarkdown = '';
      }
    }
    return {
      title,
      bodyMarkdown,
      savedAtMs: savedAt?.toMillis() ?? 0,
    };
  } catch (error) {
    console.error('アファメーション履歴取得エラー:', error);
    return null;
  }
};

/**
 * 発行済み本文を更新（A-8）。親 `updatedAt` も更新。
 * `keepHistory`: true のとき、更新前の本文＋親タイトルを `history` に 1 件追加してから `published/current` を更新。
 */
export const savePublishedAffirmationBody = async (
  uid: string,
  affirmationId: string,
  params: { newMarkdownBody: string; keepHistory: boolean }
): Promise<void> => {
  const v = validateAffirmationMarkdownBody(params.newMarkdownBody);
  if (!v.ok) {
    throw new Error(v.message);
  }
  const trimmed = params.newMarkdownBody.trim();
  try {
    const parentRef = doc(db, 'users', uid, AFFIRMATIONS_SUBCOLLECTION, affirmationId);
    const publishedRef = doc(
      db,
      'users',
      uid,
      AFFIRMATIONS_SUBCOLLECTION,
      affirmationId,
      'published',
      'current'
    );
    const [parentSnap, pubSnap] = await Promise.all([getDoc(parentRef), getDoc(publishedRef)]);
    if (!parentSnap.exists()) throw new Error('アファメーションが見つかりません。');
    if (!pubSnap.exists()) throw new Error('発行済み本文が見つかりません。');

    const title =
      typeof parentSnap.data().title === 'string' ? parentSnap.data().title : '';
    const now = serverTimestamp();
    const newEnc = await encrypt(trimmed, uid);

    if (params.keepHistory) {
      const oldEnc = pubSnap.data().encryptedBody;
      if (typeof oldEnc !== 'string') throw new Error('現行本文の読み取りに失敗しました。');
      const oldMarkdown = await decrypt(oldEnc, uid);
      const histEncBody = await encrypt(oldMarkdown, uid);
      const histEncTitle = await encrypt(title, uid);
      const batch = writeBatch(db);
      const histRef = doc(
        collection(db, 'users', uid, AFFIRMATIONS_SUBCOLLECTION, affirmationId, 'history')
      );
      batch.set(histRef, {
        savedAt: now,
        encryptedBody: histEncBody,
        encryptedTitle: histEncTitle,
      });
      batch.update(publishedRef, {
        encryptedBody: newEnc,
        updatedAt: now,
      });
      batch.update(parentRef, { updatedAt: now });
      await batch.commit();
    } else {
      const batch = writeBatch(db);
      batch.update(publishedRef, {
        encryptedBody: newEnc,
        updatedAt: now,
      });
      batch.update(parentRef, { updatedAt: now });
      await batch.commit();
    }
  } catch (error) {
    console.error('発行済み本文保存エラー:', error);
    throw error;
  }
};

/** 同一ユーザ内で `title` が既に使われているか（トリム後一致。除外 ID は自分自身の改名時用） */
export const isAffirmationTitleTaken = async (
  uid: string,
  title: string,
  excludeAffirmationId?: string | null
): Promise<boolean> => {
  const t = title.trim();
  if (!t) return false;
  try {
    const q = query(collection(db, 'users', uid, AFFIRMATIONS_SUBCOLLECTION), where('title', '==', t));
    const snap = await getDocs(q);
    if (excludeAffirmationId) {
      return snap.docs.some((d) => d.id !== excludeAffirmationId);
    }
    return !snap.empty;
  } catch (error) {
    console.error('アファメーション名重複チェックエラー:', error);
    throw error;
  }
};

export const updateAffirmationTitle = async (
  uid: string,
  affirmationId: string,
  title: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', uid, AFFIRMATIONS_SUBCOLLECTION, affirmationId), {
      title: title.trim(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('アファメーション名更新エラー:', error);
    throw error;
  }
};

/**
 * 親・`published/*`・`history/*` をまとめて物理削除（バッチ分割 450 件単位）
 */
export const deleteAffirmationFully = async (uid: string, affirmationId: string): Promise<void> => {
  try {
    const parentRef = doc(db, 'users', uid, AFFIRMATIONS_SUBCOLLECTION, affirmationId);
    const pubSnap = await getDocs(collection(db, 'users', uid, AFFIRMATIONS_SUBCOLLECTION, affirmationId, 'published'));
    const histSnap = await getDocs(collection(db, 'users', uid, AFFIRMATIONS_SUBCOLLECTION, affirmationId, 'history'));
    const refs = [...pubSnap.docs.map((d) => d.ref), ...histSnap.docs.map((d) => d.ref), parentRef];
    const chunkSize = 450;
    for (let i = 0; i < refs.length; i += chunkSize) {
      const batch = writeBatch(db);
      for (const r of refs.slice(i, i + chunkSize)) {
        batch.delete(r);
      }
      await batch.commit();
    }
  } catch (error) {
    console.error('アファメーション削除エラー:', error);
    throw error;
  }
};

/** `users/{uid}.trialAffirmationMeta` の部分更新（ドット記法。localStorage は使わない） */
export const updateTrialAffirmationUiMetaFields = async (
  uid: string,
  fields: Partial<{
    lastSubmenu: TrialAffirmationSubmenu | null;
    lastSelectedAffirmationId: string | null;
  }>
): Promise<void> => {
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if ('lastSubmenu' in fields) {
      payload['trialAffirmationMeta.lastSubmenu'] = fields.lastSubmenu;
    }
    if ('lastSelectedAffirmationId' in fields) {
      payload['trialAffirmationMeta.lastSelectedAffirmationId'] = fields.lastSelectedAffirmationId;
    }
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    console.error('trialAffirmationMeta 更新エラー:', error);
    throw error;
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: now,
    });
  } catch (error) {
    console.error('ユーザープロファイル更新エラー:', error);
    throw error;
  }
};

export const updateLastLogin = async (uid: string): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await updateDoc(doc(db, 'users', uid), {
      lastLoginAt: now,
    });
  } catch (error) {
    console.error('最終ログイン更新エラー:', error);
    throw error;
  }
};

// サイト共通コンテンツ（ホーム画面用）
const HOME_CONTENT_COLLECTION = 'site_content';
const HOME_CONTENT_DOC_ID = 'home';

/** ホーム画面用コンテンツを取得（未認証でも読める） */
export const getHomeContent = async (): Promise<HomeContent | null> => {
  try {
    const docRef = doc(db, HOME_CONTENT_COLLECTION, HOME_CONTENT_DOC_ID);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      latestVideos: data.latestVideos ?? [],
      referenceLinks: data.referenceLinks,
      latestArticles: data.latestArticles,
      ad: data.ad,
      updatedAt: data.updatedAt,
    } as HomeContent;
  } catch (error) {
    console.error('getHomeContent error:', error);
    throw error;
  }
};

/** 最新動画一覧を更新（管理者のみ。セキュリティルールで admin を要求） */
export const updateHomeLatestVideos = async (
  latestVideos: HomeLatestVideoEntry[]
): Promise<void> => {
  try {
    const docRef = doc(db, HOME_CONTENT_COLLECTION, HOME_CONTENT_DOC_ID);
    const payload = {
      latestVideos,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.error('updateHomeLatestVideos error:', error);
    throw error;
  }
};

/** 最新記事一覧を更新（管理者のみ） */
export const updateHomeLatestArticles = async (
  latestArticles: HomeLatestArticleEntry[]
): Promise<void> => {
  try {
    const docRef = doc(db, HOME_CONTENT_COLLECTION, HOME_CONTENT_DOC_ID);
    const payload = {
      latestArticles,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.error('updateHomeLatestArticles error:', error);
    throw error;
  }
};

/** いちおしサイト（参考リンク）一覧を更新（管理者のみ） */
export const updateHomeReferenceLinks = async (
  referenceLinks: HomeReferenceLinkEntry[]
): Promise<void> => {
  try {
    const docRef = doc(db, HOME_CONTENT_COLLECTION, HOME_CONTENT_DOC_ID);
    const payload = {
      referenceLinks,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.error('updateHomeReferenceLinks error:', error);
    throw error;
  }
};

// サブスクリプション関連の関数
export const updateSubscription = async (
  uid: string, 
  subscription: Partial<SubscriptionInfo>
): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await updateDoc(doc(db, 'users', uid), {
      'subscription': {
        ...subscription,
        startDate: subscription.startDate || now,
        updatedAt: now,
      },
      updatedAt: now,
    });
  } catch (error) {
    console.error('サブスクリプション更新エラー:', error);
    throw error;
  }
};

export const updateUsageLimits = async (
  uid: string, 
  usage: Partial<UsageLimits>
): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await updateDoc(doc(db, 'users', uid), {
      'subscription.usage': usage,
      updatedAt: now,
    });
  } catch (error) {
    console.error('利用制限更新エラー:', error);
    throw error;
  }
};

// 権限チェック用の関数
export const checkUserPermission = async (
  uid: string, 
  feature: keyof FeatureAccess
): Promise<boolean> => {
  try {
    const userProfile = await getUserProfile(uid);
    if (!userProfile) return false;
    
    const plan = userProfile.subscription.plan;
    const SUBSCRIPTION_PLANS = {
      free: {
        pdca: true,
        aiComments: false,
        coachComments: false,
        zoomMeetings: false,
        communityAccess: false,
        advancedAnalytics: false,
      },
      standard: {
        pdca: true,
        aiComments: true,
        coachComments: false,
        zoomMeetings: false,
        communityAccess: true,
        advancedAnalytics: false,
      },
      premium: {
        pdca: true,
        aiComments: true,
        coachComments: true,
        zoomMeetings: true,
        communityAccess: true,
        advancedAnalytics: true,
      },
    };
    
    return SUBSCRIPTION_PLANS[plan][feature] || false;
  } catch (error) {
    console.error('権限チェックエラー:', error);
    return false;
  }
};

// デフォルトユーザープロファイル作成
export const createDefaultUserProfile = async (user: User): Promise<UserProfile> => {
  const defaultProfile: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'lastLoginAt'> = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || 'ユーザー',
    photoURL: user.photoURL || undefined,
    role: 'user',
    subscription: {
      plan: 'free',
      status: 'active',
      startDate: new Date(),
      features: {
        pdca: true,
        aiComments: false,
        coachComments: false,
        zoomMeetings: false,
        communityAccess: false,
        advancedAnalytics: false,
      },
      usage: {
        pdcaEntries: 0,
        aiComments: 0,
        zoomMeetings: 0,
        coachSessions: 0,
      },
    },
  };
  
  await createUserProfile(defaultProfile);
  return {
    ...defaultProfile,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };
};

// PDCA操作
export const getPDCAEntry = async (uid: string, date: string): Promise<PDCAData | null> => {
  try {
    const q = query(
      collection(db, 'pdca_entries'),
      where('uid', '==', uid),
      where('date', '==', date)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as PDCAData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('PDCAエントリ取得エラー:', error);
    throw error;
  }
};

export const getUserPDCAEntries = async (uid: string): Promise<PDCAData[]> => {
  try {
    const q = query(
      collection(db, 'pdca_entries'),
      where('uid', '==', uid),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PDCAData[];
  } catch (error) {
    console.error('ユーザーPDCAエントリ取得エラー:', error);
    throw error;
  }
};

export const createPDCAEntry = async (pdcaData: Omit<PDCAData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = serverTimestamp() as Timestamp;
    const entryData: Omit<PDCAData, 'id'> = {
      ...pdcaData,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(collection(db, 'pdca_entries'), entryData);
    return docRef.id;
  } catch (error) {
    console.error('PDCAエントリ作成エラー:', error);
    throw error;
  }
};

export const updatePDCAEntry = async (id: string, updates: Partial<PDCAData>): Promise<void> => {
  try {
    const docRef = doc(db, 'pdca_entries', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('PDCAエントリ更新エラー:', error);
    throw error;
  }
};

// 特定のPDCA項目を更新
export const updatePDCAItem = async (
  uid: string, 
  date: string, 
  item: 'plan' | 'do' | 'check' | 'action', 
  value: string
): Promise<void> => {
  try {
    const entry = await getPDCAEntry(uid, date);
    const now = serverTimestamp() as Timestamp;
    
    if (entry) {
      // 既存エントリを更新
      await updatePDCAEntry(entry.id!, {
        [item]: value,
        [`${item}CreatedAt`]: entry[`${item}CreatedAt`] || now,
        [`${item}UpdatedAt`]: now,
      });
    } else {
      // 新規エントリを作成
      const newEntry: Omit<PDCAData, 'id' | 'createdAt' | 'updatedAt'> = {
        uid,
        date,
        [item]: value,
        [`${item}CreatedAt`]: now,
        [`${item}UpdatedAt`]: now,
      };
      await createPDCAEntry(newEntry);
    }
  } catch (error) {
    console.error('PDCA項目更新エラー:', error);
    throw error;
  }
};

// コーチング機能のFirestore関数
export const createCoachingSession = async (session: Omit<CoachingSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = serverTimestamp() as Timestamp;
    const docRef = await addDoc(collection(db, 'coaching_sessions'), {
      ...session,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('コーチングセッション作成エラー:', error);
    throw error;
  }
};

export const getCoachingSessions = async (userId: string): Promise<CoachingSession[]> => {
  try {
    const q = query(
      collection(db, 'coaching_sessions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as CoachingSession[];
  } catch (error) {
    console.error('コーチングセッション取得エラー:', error);
    throw error;
  }
};

export const updateCoachingSession = async (sessionId: string, updates: Partial<CoachingSession>): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await updateDoc(doc(db, 'coaching_sessions', sessionId), {
      ...updates,
      updatedAt: now,
    });
  } catch (error) {
    console.error('コーチングセッション更新エラー:', error);
    throw error;
  }
};

export const createGoal = async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = serverTimestamp() as Timestamp;
    const docRef = await addDoc(collection(db, 'goals'), {
      ...goal,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('目標作成エラー:', error);
    throw error;
  }
};

export const getUserGoals = async (userId: string): Promise<Goal[]> => {
  try {
    const q = query(
      collection(db, 'goals'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Goal[];
  } catch (error) {
    console.error('目標取得エラー:', error);
    throw error;
  }
};

export const updateGoal = async (goalId: string, updates: Partial<Goal>): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await updateDoc(doc(db, 'goals', goalId), {
      ...updates,
      updatedAt: now,
    });
  } catch (error) {
    console.error('目標更新エラー:', error);
    throw error;
  }
};

export const deleteGoal = async (goalId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'goals', goalId));
  } catch (error) {
    console.error('目標削除エラー:', error);
    throw error;
  }
};

export const createAIAnalysis = async (analysis: Omit<AIAnalysis, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const now = serverTimestamp() as Timestamp;
    const docRef = await addDoc(collection(db, 'ai_analyses'), {
      ...analysis,
      createdAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('AI分析作成エラー:', error);
    throw error;
  }
};

export const getAIAnalyses = async (userId: string, analysisType?: 'daily' | 'weekly' | 'monthly'): Promise<AIAnalysis[]> => {
  try {
    let q = query(
      collection(db, 'ai_analyses'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    if (analysisType) {
      q = query(q, where('analysisType', '==', analysisType));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as AIAnalysis[];
  } catch (error) {
    console.error('AI分析取得エラー:', error);
    throw error;
  }
};

export const getCoachingSettings = async (userId: string): Promise<CoachingSettings | null> => {
  try {
    const docRef = doc(db, 'coaching_settings', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as CoachingSettings;
    }
    return null;
  } catch (error) {
    console.error('コーチング設定取得エラー:', error);
    throw error;
  }
};

export const updateCoachingSettings = async (userId: string, settings: Partial<CoachingSettings>): Promise<void> => {
  try {
    const now = serverTimestamp() as Timestamp;
    await setDoc(doc(db, 'coaching_settings', userId), {
      ...settings,
      userId,
      updatedAt: now,
    }, { merge: true });
  } catch (error) {
    console.error('コーチング設定更新エラー:', error);
    throw error;
  }
};

// 週・月単位のPDCA集約データ取得
export const getPDCAAggregation = async (
  userId: string, 
  aggregationType: 'weekly' | 'monthly',
  startDate: string,
  endDate: string
): Promise<PDCAAggregation | null> => {
  try {
    const q = query(
      collection(db, 'pdca_aggregations'),
      where('userId', '==', userId),
      where('aggregationType', '==', aggregationType),
      where('startDate', '==', startDate),
      where('endDate', '==', endDate)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as PDCAAggregation;
    }
    return null;
  } catch (error) {
    console.error('PDCA集約データ取得エラー:', error);
    throw error;
  }
};

export const createPDCAAggregation = async (aggregation: Omit<PDCAAggregation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = serverTimestamp() as Timestamp;
    const docRef = await addDoc(collection(db, 'pdca_aggregations'), {
      ...aggregation,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('PDCA集約データ作成エラー:', error);
    throw error;
  }
};
