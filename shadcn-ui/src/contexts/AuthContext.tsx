import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  hasFullAccess: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// You can change this password as needed
const ADMIN_PASSWORD = 'admin123';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [hasFullAccess, setHasFullAccess] = useState<boolean>(false);

  useEffect(() => {
    // Check if user was previously authenticated (stored in sessionStorage)
    const authStatus = sessionStorage.getItem('auth-status');
    if (authStatus === 'full-access') {
      setIsAuthenticated(true);
      setHasFullAccess(true);
    }
  }, []);

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setHasFullAccess(true);
      sessionStorage.setItem('auth-status', 'full-access');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setHasFullAccess(false);
    sessionStorage.removeItem('auth-status');
  };

  const value = {
    isAuthenticated,
    login,
    logout,
    hasFullAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};