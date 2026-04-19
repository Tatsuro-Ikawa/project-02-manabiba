/**
 * マネジメント日誌の「週」境界（Asia/Tokyo・ユーザの週開始曜日）。
 * @see docs/manabiba_01/04_TRIAL_28_IMPLEMENTATION_DECISIONS.md, docs/manabiba_01/03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md
 */

import type { JournalWeekStartsOn, UserProfile } from '@/types/auth';

export type { JournalWeekStartsOn };

/** `addDaysDateKey` と同アルゴリズム（firestore との循環参照回避） */
function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map((x) => Number(x));
  const base = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  base.setUTCDate(base.getUTCDate() + days);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Firestore または API から来た値を正規化（未設定・不正値は月曜扱い用に undefined） */
export function normalizeJournalWeekStartsOnField(raw: unknown): JournalWeekStartsOn | undefined {
  if (raw === 'sunday') return 'sunday';
  return undefined;
}

/** プロファイルから実効の週開始（未設定は月曜） */
export function resolveJournalWeekStartsOn(profile: UserProfile | null | undefined): JournalWeekStartsOn {
  return profile?.weekStartsOn === 'sunday' ? 'sunday' : 'monday';
}

function weekStartsOnToJsDay(weekStartsOn: JournalWeekStartsOn): number {
  return weekStartsOn === 'sunday' ? 0 : 1; // JS: Sun=0 … Sat=6
}

/** 暦日 dateKey（東京）の曜日 0=日 … 6=土 */
export function getJsWeekdayInTokyo(dateKey: string): number {
  const instant = new Date(`${dateKey}T12:00:00+09:00`);
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    weekday: 'short',
  }).format(instant);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const n = map[short];
  if (n === undefined) throw new Error(`Unexpected Tokyo weekday: ${short} for ${dateKey}`);
  return n;
}

/**
 * 当該 dateKey が属する週の開始日（YYYY-MM-DD）。
 * weekStartsOn が月曜なら ISO 風（月曜始まり）、日曜なら日曜始まり。
 */
export function getWeekStartDateKeyForDateKey(
  dateKey: string,
  weekStartsOn: JournalWeekStartsOn = 'monday'
): string {
  const wd = getJsWeekdayInTokyo(dateKey);
  const start = weekStartsOnToJsDay(weekStartsOn);
  const daysBack = (wd - start + 7) % 7;
  return addDaysToDateKey(dateKey, -daysBack);
}

/** 今日（東京）の暦日キー */
export function getTodayDateKeyTokyo(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(now);
}

/** 今日を含む週の weekStartKey（フェーズ1: 初期フォーカス用） */
export function getWeekStartDateKeyForToday(profile: UserProfile | null | undefined): string {
  const today = getTodayDateKeyTokyo();
  return getWeekStartDateKeyForDateKey(today, resolveJournalWeekStartsOn(profile));
}

/** 週ラベル「M月d日 ～ M月d日」（終端は開始から6日後・同一仕様） */
export function formatWeekRangeLabelJa(weekStartKey: string): string {
  const endKey = addDaysToDateKey(weekStartKey, 6);
  const fmt = (key: string) => {
    const [y, m, d] = key.split('-').map((x) => Number(x));
    if (!y || !m || !d) return key;
    return `${m}月${d}日`;
  };
  return `${fmt(weekStartKey)} ～ ${fmt(endKey)}`;
}

/** 週ナビ: weekStartKey を delta 週だけずらす */
export function shiftWeekStartDateKey(weekStartKey: string, deltaWeeks: number): string {
  return addDaysToDateKey(weekStartKey, deltaWeeks * 7);
}
