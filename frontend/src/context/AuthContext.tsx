import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  switchRoleDemo: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('apex_access_token');
      const storedUser = localStorage.getItem('apex_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // Verify with server in background
          const meData = await api.getCurrentUser();
          setUser(meData.user);
          localStorage.setItem('apex_user', JSON.stringify(meData.user));
        } catch (err) {
          // Token might be valid or refreshable
        }
      } else {
        // Fallback default demo user (Admin)
        try {
          const authData = await api.login('admin', 'Admin@123');
          setUser(authData.user);
        } catch (_) {
          // Demo fallback
          const defaultAdmin: User = {
            id: 1,
            username: 'admin',
            email: 'admin@apexstock.io',
            first_name: 'Eleanor',
            last_name: 'Vance',
            role: 'ADMIN',
            department: 'Executive Leadership',
            is_active: true,
            is_admin: true,
            is_manager: true
          };
          setUser(defaultAdmin);
          localStorage.setItem('apex_user', JSON.stringify(defaultAdmin));
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.login(username, password);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('apex_access_token');
    localStorage.removeItem('apex_refresh_token');
    localStorage.removeItem('apex_user');
    setUser(null);
  };

  const switchRoleDemo = async (role: UserRole) => {
    setIsLoading(true);
    const credentials: Record<UserRole, { u: string; p: string }> = {
      ADMIN: { u: 'admin', p: 'Admin@123' },
      MANAGER: { u: 'manager', p: 'Manager@123' },
      STAFF: { u: 'staff', p: 'Staff@123' },
      VIEWER: { u: 'viewer', p: 'Viewer@123' }
    };
    try {
      const cred = credentials[role];
      const data = await api.login(cred.u, cred.p);
      setUser(data.user);
    } catch (_) {
      if (user) {
        const updated = { ...user, role, username: role.toLowerCase() };
        setUser(updated);
        localStorage.setItem('apex_user', JSON.stringify(updated));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchRoleDemo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
