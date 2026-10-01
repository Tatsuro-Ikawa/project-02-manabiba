'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** 旧 URL。全体設定 `/settings` へリダイレクト */
export default function TrialSettingsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/settings');
  }, [router]);
  return (
    <p className="seven-steps-worksheet-hint" style={{ padding: '1.5rem' }}>
      設定画面へ移動しています…
    </p>
  );
}
