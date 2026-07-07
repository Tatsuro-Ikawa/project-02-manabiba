import { HOME_DOJO_NEWS_PREVIEW_MAX_CHARS } from '@/lib/communicationConstants';

/** Markdown 記法を除いた平文（ホーム抜粋用） */
export function stripMarkdownForPlainPreview(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** ホーム新着用に本文を切り詰める（超過時は末尾に …） */
export function truncateDirectorAnnouncementPreview(
  bodyMarkdown: string,
  maxChars: number = HOME_DOJO_NEWS_PREVIEW_MAX_CHARS
): string {
  const plain = stripMarkdownForPlainPreview(bodyMarkdown);
  if (plain.length <= maxChars) return plain;
  return `${plain.slice(0, maxChars)}…`;
}
