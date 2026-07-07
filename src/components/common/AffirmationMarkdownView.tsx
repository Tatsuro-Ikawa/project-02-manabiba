'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export type AffirmationMarkdownViewProps = {
  /** 発行済み本文・プレビュー用の Markdown 文字列（アファメーション共通） */
  markdown: string;
  /** 追加クラス（例: affirmation-preview-body と併用） */
  className?: string;
};

/**
 * ReactMarkdown（CommonMark）は単独の `\n` を改行にしないため、
 * 行末2スペース＋改行（ハード改行）に変換する。
 * 編集 textarea で入れた改行を表示画面でも再現する。
 */
function markdownHardLineBreaks(s: string): string {
  return s.replace(/\n/g, '  \n');
}

/**
 * アファメーションのプレビュー・発行済み閲覧・履歴表示などで共通利用する Markdown レンダラ（A-10）。
 * 別画面でもそのまま import して使える。
 */
export function AffirmationMarkdownView({ markdown, className }: AffirmationMarkdownViewProps) {
  return (
    <div className={`affirmation-markdown-view ${className ?? ''}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownHardLineBreaks(markdown)}</ReactMarkdown>
    </div>
  );
}
