import React from 'react';
import { useAppStore } from '../store/useAppStore';

interface PermissionGateProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  fallback = null,
  children,
}) => {
  const { permissions, user } = useAppStore();

  if (user?.role === 'superadmin') {
    return <>{children}</>;
  }

  const isAllowed = permissions[permission] ?? true;
  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
