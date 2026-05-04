import type { WeeklyAiReportWriteMode } from '@/types/auth';

/** 週次・月次 Aiレポート API に渡す連結テキストの最小文字数（Unicode） */
export const AI_REPORT_INPUT_MIN_TOTAL_CHARS = 150;

function hasText(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function formatTokyoDateTime(d = new Date()): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * 学び帳設定の「Aiレポート作成」反映方式に従い、既存入力と生成結果を合成する。
 */
export function applyAiReportWriteMode(
  current: string | null,
  generated: string,
  mode: WeeklyAiReportWriteMode | undefined
): string {
  const m = mode ?? 'append';
  if (m === 'overwrite') return generated;
  if (m === 'skip_if_nonempty') {
    return hasText(current) ? current!.trim() : generated;
  }
  if (!hasText(current)) return generated;
  return `${current.trim()}\n\n---\nAIレポート（${formatTokyoDateTime()}）\n${generated}`;
}
