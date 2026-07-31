import type { Trial4wDailyPlain } from '@/lib/firestore';
import {
  computeEveningExecutionSymbol,
  computeMorningCompletionSymbol,
} from '@/lib/trialDailyWeekSymbols';

/** 週次 `coachDailySummaryByDate` の 1 日分（日次本文は含めない。sharedWithCoach は日次本文の共有可否） */
export type JournalCoachDailySummaryEntry = {
  morningSym: string;
  morningCls: string;
  eveningSym: string;
  eveningCls: string;
  eveningSatisfaction: number | null;
  /** 当該日の journal_daily.sharedWithCoach（コーチが朝・晩本文へ遷移可能か） */
  sharedWithCoach?: boolean;
};

export function buildCoachDailySummaryEntry(
  d: Trial4wDailyPlain | undefined,
  dateKey: string,
  todayKey: string
): JournalCoachDailySummaryEntry {
  const m = computeMorningCompletionSymbol(d, dateKey, todayKey);
  const e = computeEveningExecutionSymbol(d, dateKey, todayKey);
  const sat =
    dateKey > todayKey
      ? null
      : typeof d?.eveningSatisfaction === 'number' && !Number.isNaN(d.eveningSatisfaction)
        ? d.eveningSatisfaction
        : null;
  return {
    morningSym: m.sym,
    morningCls: m.cls,
    eveningSym: e.sym,
    eveningCls: e.cls,
    eveningSatisfaction: sat,
    sharedWithCoach: d?.sharedWithCoach === true,
  };
}

export function parseCoachDailySummaryByDate(
  raw: unknown
): Record<string, JournalCoachDailySummaryEntry> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, JournalCoachDailySummaryEntry> = {};
  for (const [dateKey, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const o = v as Record<string, unknown>;
    if (typeof o.morningSym !== 'string' || typeof o.eveningSym !== 'string') continue;
    out[dateKey] = {
      morningSym: o.morningSym,
      morningCls: typeof o.morningCls === 'string' ? o.morningCls : 'symbol-none',
      eveningSym: o.eveningSym,
      eveningCls: typeof o.eveningCls === 'string' ? o.eveningCls : 'symbol-none',
      eveningSatisfaction:
        typeof o.eveningSatisfaction === 'number' && !Number.isNaN(o.eveningSatisfaction)
          ? o.eveningSatisfaction
          : null,
      sharedWithCoach: o.sharedWithCoach === true,
    };
  }
  return out;
}

/** 月次コーチ閲覧: 共有 ON の各週サマリを dateKey でマージ */
export function mergeCoachDailySummariesFromWeeklies(
  weeklies: Array<{
    sharedWithCoach?: boolean;
    coachDailySummaryByDate?: Record<string, JournalCoachDailySummaryEntry>;
  }>
): Record<string, JournalCoachDailySummaryEntry> {
  const out: Record<string, JournalCoachDailySummaryEntry> = {};
  for (const w of weeklies) {
    if (w.sharedWithCoach !== true) continue;
    const map = w.coachDailySummaryByDate ?? {};
    for (const [dk, entry] of Object.entries(map)) {
      out[dk] = entry;
    }
  }
  return out;
}
