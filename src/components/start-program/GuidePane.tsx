'use client';

import { useCallback, useEffect, useState } from 'react';
import { AffirmationMarkdownView } from '@/components/common/AffirmationMarkdownView';

type GuidePaneProps = {
  guidePath: string;
};

/** 静的 guide.md を fetch して表示 */
export default function GuidePane({ guidePath }: GuidePaneProps) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(guidePath, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`guide の読み込みに失敗しました（${res.status}）`);
      }
      const text = await res.text();
      setMarkdown(text);
    } catch (e) {
      console.error('GuidePane load error:', e);
      setError(e instanceof Error ? e.message : 'guide の読み込みに失敗しました。');
      setMarkdown(null);
    } finally {
      setLoading(false);
    }
  }, [guidePath]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="seven-steps-guide-loading">読み込み中...</p>;
  }

  if (error) {
    return (
      <p className="seven-steps-guide-error" role="alert">
        {error}
      </p>
    );
  }

  if (!markdown) {
    return null;
  }

  return (
    <div className="seven-steps-guide-pane">
      <AffirmationMarkdownView markdown={markdown} className="seven-steps-guide-markdown" />
    </div>
  );
}
