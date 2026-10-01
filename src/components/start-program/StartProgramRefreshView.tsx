'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Feature Flag ON 時、刷新 UI の入口へリダイレクト */
export default function StartProgramRefreshView() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/start-program/seven-steps/step/0?pane=guide');
  }, [router]);

  return (
    <p className="legal-page-placeholder" style={{ textAlign: 'center' }}>
      読み込み中...
    </p>
  );
}
