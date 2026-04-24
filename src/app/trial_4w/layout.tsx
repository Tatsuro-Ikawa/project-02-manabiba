import type { ReactNode } from 'react';
import { JournalDetailLevelProvider } from '@/context/JournalDetailLevelContext';

export default function Trial4wLayout({ children }: { children: ReactNode }) {
  return <JournalDetailLevelProvider>{children}</JournalDetailLevelProvider>;
}
