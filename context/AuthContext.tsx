
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import * as db from '../services/db';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  canEdit: boolean;
  canViewCompany: (companyName: string) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for active session on load
    const initializeAuth = () => {
      try {
        const savedUserId = localStorage.getItem('active_user_id');
        if (savedUserId) {
          const users = db.getUsers();
          const foundUser = users.find(u => u.id === savedUserId);
          if (foundUser) {
            setUser(foundUser);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (username: string, password: string): boolean => {
    const users = db.getUsers();
    const foundUser = users.find(u => u.username === username && u.password === password);
    
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('active_user_id', foundUser.id);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('active_user_id');
  };

  const isAdmin = user?.role === 'admin';
  
  const canEdit = user?.role === 'admin' || (user?.permissions?.canEdit ?? false);

  const canViewCompany = (companyName: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    const allowed = user.permissions?.allowedCompanies || [];
    if (allowed.includes('*')) return true;
    return allowed.includes(companyName);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user,
      isLoading,
      canEdit,
      canViewCompany,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};
