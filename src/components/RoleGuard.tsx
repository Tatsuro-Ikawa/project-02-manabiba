'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth';

interface RoleGuardProps {
  requiredRole: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  requiredRole,
  children,
  fallback
}) => {
  const { hasRole } = useAuth();

  if (hasRole(requiredRole)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          アクセス権限がありません
        </h3>
        <p className="text-red-600">
          この機能にアクセスするには適切な権限が必要です。
        </p>
      </div>
    </div>
  );
};
