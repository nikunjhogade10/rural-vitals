import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services';

interface User {
  id: string;
  fullName: string;
  employeeId: string;
  role: string;
  facilityId: string;
  preferredLanguage: string;
  facility?: {
    id: string;
    name: string;
    type: string;
    hmisCode: string;
    block: string;
    district: string;
    state: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isOfflineMode: boolean;
  login: (employeeId: string, password: string) => Promise<void>;
  loginOffline: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem('rcl_token');
    localStorage.removeItem('rcl_user');
    setUser(null);
    setIsOfflineMode(false);
  }, []);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('rcl_token');
    const savedUser = localStorage.getItem('rcl_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        logout();
      }
    }
    setIsLoading(false);

    // Listen for token expiry events from api client
    window.addEventListener('rcl:logout', logout);
    return () => window.removeEventListener('rcl:logout', logout);
  }, [logout]);

  const login = async (employeeId: string, password: string) => {
    const data = await authService.login(employeeId, password);
    localStorage.setItem('rcl_token', data.token);
    localStorage.setItem('rcl_user', JSON.stringify(data.user));
    setUser(data.user);
    setIsOfflineMode(false);
  };

  const loginOffline = () => {
    // Offline mode: use cached user if available, else a placeholder
    const savedUser = localStorage.getItem('rcl_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      setUser({
        id: 'offline',
        fullName: 'Offline User',
        employeeId: 'OFFLINE',
        role: 'HEALTH_WORKER',
        facilityId: 'local',
        preferredLanguage: 'en',
      });
    }
    setIsOfflineMode(true);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isOfflineMode, login, loginOffline, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
