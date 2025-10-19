import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface AuthGuardProps {
  children: React.ReactNode;
  requireFullAccess?: boolean;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requireFullAccess = false,
  fallback 
}) => {
  const { hasFullAccess, logout } = useAuth();

  if (requireFullAccess && !hasFullAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Alert>
          <AlertDescription>
            This feature requires password authentication. Please login with the correct password to access this functionality.
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()} variant="outline">
          Go to Login
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};