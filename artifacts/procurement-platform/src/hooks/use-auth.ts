import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

// Simple auth hook reading from localStorage
export function useAuth() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [userStr, setUserStr] = useState<string | null>(localStorage.getItem('user'));
  const [, setLocation] = useLocation();

  const login = useCallback((newToken: string, user: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(newToken);
    setUserStr(JSON.stringify(user));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUserStr(null);
    setLocation('/login');
  }, [setLocation]);

  const user = userStr ? JSON.parse(userStr) : null;

  return {
    isAuthenticated: !!token,
    token,
    user,
    login,
    logout,
  };
}
