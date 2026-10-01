'use client';

import { JournalDetailLevelProvider } from '@/context/JournalDetailLevelContext';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <JournalDetailLevelProvider>{children}</JournalDetailLevelProvider>;
}
