'use client';

import { useMemo, useState } from 'react';
import type { UserProfile } from '@/types/auth';
import {
  formatDataRetentionBannerMessage,
  getDataRetentionDaysRemaining,
  isDataRetentionActive,
} from '@/lib/subscription/dataRetention';

interface DataRetentionBannerProps {
  userProfile: UserProfile | null | undefined;
  className?: string;
}

/** ダウングレード後90日保持の残日数案内（04_SUBSCRIPTION_PRODUCT_SCOPE §3.2） */
export function DataRetentionBanner({ userProfile, className }: DataRetentionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const message = useMemo(() => {
    if (!isDataRetentionActive(userProfile)) return null;
    const ends = userProfile!.subscription.dataRetentionEndsAt!;
    const days = getDataRetentionDaysRemaining(ends);
    return formatDataRetentionBannerMessage(days);
  }, [userProfile]);

  if (!message || dismissed) return null;

  return (
    <div
      className={`sub-flow-data-retention${className ? ` ${className}` : ''}`}
      role="status"
    >
      <p>{message}</p>
      <button
        type="button"
        className="sub-flow-welcome-back-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="お知らせを閉じる"
      >
        閉じる
      </button>
    </div>
  );
}
