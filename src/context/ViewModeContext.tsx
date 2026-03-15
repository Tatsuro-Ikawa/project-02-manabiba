'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

// 画面の表示モード
export type ViewMode = 'client' | 'coach' | 'admin';

interface ViewModeContextValue {
  mode: ViewMode;
  availableModes: ViewMode[];
  setMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextValue | undefined>(undefined);

export const useViewMode = (): ViewModeContextValue => {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return ctx;
};

interface ViewModeProviderProps {
  children: React.ReactNode;
}

export const ViewModeProvider: React.FC<ViewModeProviderProps> = ({ children }) => {
  const { userProfile } = useAuth();

  const role = userProfile?.role;

  const availableModes: ViewMode[] = useMemo(() => {
    const modes: ViewMode[] = ['client'];
    if (role === 'coach' || role === 'senior_coach') {
      modes.push('coach');
    }
    if (role === 'admin') {
      modes.push('admin');
    }
    return modes;
  }, [role]);

  const [mode, setMode] = useState<ViewMode>('client');

  const safeMode = availableModes.includes(mode) ? mode : availableModes[0] ?? 'client';

  const handleSetMode = (next: ViewMode) => {
    if (!availableModes.includes(next)) return;
    setMode(next);
  };

  const value: ViewModeContextValue = {
    mode: safeMode,
    availableModes,
    setMode: handleSetMode,
  };

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
};

