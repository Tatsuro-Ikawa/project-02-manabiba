'use client';

import ReactMarkdown from 'react-markdown';

export type AffirmationMarkdownViewProps = {
  /** 発行済み本文・プレビュー用の Markdown 文字列（アファメーション共通） */
  markdown: string;
  /** 追加クラス（例: affirmation-preview-body と併用） */
  className?: string;
};

/**
 * アファメーションのプレビュー・発行済み閲覧・履歴表示などで共通利用する Markdown レンダラ（A-10）。
 * 別画面でもそのまま import して使える。
 */
export function AffirmationMarkdownView({ markdown, className }: AffirmationMarkdownViewProps) {
  return (
    <div className={`affirmation-markdown-view ${className ?? ''}`.trim()}>
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
