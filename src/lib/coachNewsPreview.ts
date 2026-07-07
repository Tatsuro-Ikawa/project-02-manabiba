import { HOME_COACH_NEWS_PREVIEW_MAX_CHARS } from '@/lib/communicationConstants';

/** ホーム新着用に本文を切り詰める（超過時は末尾に …） */
export function truncateCoachNewsPreview(
  body: string,
  maxChars: number = HOME_COACH_NEWS_PREVIEW_MAX_CHARS
): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}…`;
}
