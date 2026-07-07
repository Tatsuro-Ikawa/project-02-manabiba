import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  DIRECTOR_ANNOUNCEMENT_BODY_MAX_LENGTH,
  DIRECTOR_ANNOUNCEMENT_PAGE_SIZE,
  DIRECTOR_ANNOUNCEMENT_TITLE_MAX_LENGTH,
} from '@/lib/communicationConstants';

export const DIRECTOR_ANNOUNCEMENTS_COLLECTION = 'director_announcements';

export type DirectorAnnouncementStatus = 'draft' | 'scheduled' | 'published';

export type DirectorAnnouncement = {
  id: string;
  title: string;
  bodyMarkdown: string;
  status: DirectorAnnouncementStatus;
  /** 一覧表示・並び用の掲載日時（公開時＝即時、予約時＝予約日時） */
  postedAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorUid: string;
};

export type DirectorAnnouncementInput = {
  title: string;
  bodyMarkdown: string;
  status: DirectorAnnouncementStatus;
  postedAt: Date | null;
  scheduledAt: Date | null;
};

export type DirectorAnnouncementPage = {
  items: DirectorAnnouncement[];
  nextCursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

function tsToDate(v: unknown): Date | null {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return null;
}

function mapDoc(snap: QueryDocumentSnapshot<DocumentData>): DirectorAnnouncement {
  const d = snap.data();
  return {
    id: snap.id,
    title: typeof d.title === 'string' ? d.title : '',
    bodyMarkdown: typeof d.bodyMarkdown === 'string' ? d.bodyMarkdown : '',
    status:
      d.status === 'draft' || d.status === 'scheduled' || d.status === 'published'
        ? d.status
        : 'draft',
    postedAt: tsToDate(d.postedAt),
    scheduledAt: tsToDate(d.scheduledAt),
    createdAt: tsToDate(d.createdAt) ?? new Date(0),
    updatedAt: tsToDate(d.updatedAt) ?? new Date(0),
    authorUid: typeof d.authorUid === 'string' ? d.authorUid : '',
  };
}

export function validateDirectorAnnouncementInput(input: DirectorAnnouncementInput): string | null {
  const title = input.title.trim();
  const body = input.bodyMarkdown.trim();
  if (!title) return 'タイトルを入力してください。';
  if (title.length > DIRECTOR_ANNOUNCEMENT_TITLE_MAX_LENGTH) {
    return `タイトルは${DIRECTOR_ANNOUNCEMENT_TITLE_MAX_LENGTH}文字以内にしてください。`;
  }
  if (!body) return '本文を入力してください。';
  if (body.length > DIRECTOR_ANNOUNCEMENT_BODY_MAX_LENGTH) {
    return `本文は${DIRECTOR_ANNOUNCEMENT_BODY_MAX_LENGTH}文字以内にしてください。`;
  }
  if (input.status === 'scheduled') {
    if (!input.scheduledAt) return '予約公開の日時を指定してください。';
    if (input.scheduledAt.getTime() <= Date.now()) {
      return '予約公開は未来の日時を指定してください。';
    }
  }
  return null;
}

function toFirestorePayload(input: DirectorAnnouncementInput, authorUid: string) {
  const title = input.title.trim();
  const bodyMarkdown = input.bodyMarkdown.trim();
  const base: Record<string, unknown> = {
    title,
    bodyMarkdown,
    status: input.status,
    authorUid,
    updatedAt: serverTimestamp(),
  };
  if (input.postedAt) {
    base.postedAt = Timestamp.fromDate(input.postedAt);
  } else {
    base.postedAt = null;
  }
  if (input.scheduledAt) {
    base.scheduledAt = Timestamp.fromDate(input.scheduledAt);
  } else {
    base.scheduledAt = null;
  }
  return base;
}

/** 公開一覧（ゲスト含む）。postedAt 新着順・ページング */
export async function fetchPublicDirectorAnnouncementsPage(
  pageSize: number = DIRECTOR_ANNOUNCEMENT_PAGE_SIZE,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<DirectorAnnouncementPage> {
  const col = collection(db, DIRECTOR_ANNOUNCEMENTS_COLLECTION);
  const now = Timestamp.now();

  const q = cursor
    ? query(
        col,
        where('status', 'in', ['published', 'scheduled']),
        where('postedAt', '<=', now),
        orderBy('postedAt', 'desc'),
        startAfter(cursor),
        limit(pageSize + 1)
      )
    : query(
        col,
        where('status', 'in', ['published', 'scheduled']),
        where('postedAt', '<=', now),
        orderBy('postedAt', 'desc'),
        limit(pageSize + 1)
      );

  const snap = await getDocs(q);
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
  const items = pageDocs.map(mapDoc);
  const nextCursor = hasMore && pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;
  return { items, nextCursor, hasMore };
}

/** ホーム用：最新の公開1件 */
export async function fetchLatestPublicDirectorAnnouncement(): Promise<DirectorAnnouncement | null> {
  const page = await fetchPublicDirectorAnnouncementsPage(1);
  return page.items[0] ?? null;
}

/** 管理者用：全件（下書き含む） */
export async function fetchAllDirectorAnnouncementsAdmin(): Promise<DirectorAnnouncement[]> {
  const col = collection(db, DIRECTOR_ANNOUNCEMENTS_COLLECTION);
  const q = query(col, orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(mapDoc);
}

export async function createDirectorAnnouncement(
  input: DirectorAnnouncementInput,
  authorUid: string
): Promise<string> {
  const err = validateDirectorAnnouncementInput(input);
  if (err) throw new Error(err);
  const col = collection(db, DIRECTOR_ANNOUNCEMENTS_COLLECTION);
  const payload = {
    ...toFirestorePayload(input, authorUid),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(col, payload);
  return ref.id;
}

export async function updateDirectorAnnouncement(
  id: string,
  input: DirectorAnnouncementInput,
  authorUid: string
): Promise<void> {
  const err = validateDirectorAnnouncementInput(input);
  if (err) throw new Error(err);
  const ref = doc(db, DIRECTOR_ANNOUNCEMENTS_COLLECTION, id);
  await updateDoc(ref, toFirestorePayload(input, authorUid));
}

export async function deleteDirectorAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, DIRECTOR_ANNOUNCEMENTS_COLLECTION, id));
}

export function directorAnnouncementStatusLabel(status: DirectorAnnouncementStatus): string {
  switch (status) {
    case 'draft':
      return '下書き';
    case 'scheduled':
      return '予約';
    case 'published':
      return '公開中';
    default:
      return status;
  }
}

export function directorAnnouncementDisplayDate(a: DirectorAnnouncement): Date | null {
  if (a.status === 'scheduled' && a.scheduledAt) return a.scheduledAt;
  return a.postedAt ?? a.updatedAt;
}

/** 下書き保存用 */
export function buildDraftInput(title: string, bodyMarkdown: string): DirectorAnnouncementInput {
  return {
    title,
    bodyMarkdown,
    status: 'draft',
    postedAt: null,
    scheduledAt: null,
  };
}

/** 即時公開用 */
export function buildPublishNowInput(title: string, bodyMarkdown: string): DirectorAnnouncementInput {
  const now = new Date();
  return {
    title,
    bodyMarkdown,
    status: 'published',
    postedAt: now,
    scheduledAt: null,
  };
}

/** 予約公開用 */
export function buildScheduledInput(
  title: string,
  bodyMarkdown: string,
  scheduledAt: Date
): DirectorAnnouncementInput {
  return {
    title,
    bodyMarkdown,
    status: 'scheduled',
    postedAt: scheduledAt,
    scheduledAt,
  };
}
