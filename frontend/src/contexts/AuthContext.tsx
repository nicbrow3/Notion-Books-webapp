import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { NotionService } from '../services/notionService';

interface User {
  id: string;
  name: string;
  workspace_name: string;
  email?: string;
  owner?: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  login: () => Promise<{ success: boolean; message: string; isFirstTime?: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const checkingAuthRef = useRef(false);
  const lastCheckTimeRef = useRef(0);

  const checkAuth = async () => {
    // Prevent multiple simultaneous auth checks
    if (checkingAuthRef.current) {
      console.log('🔄 Auth check already in progress, skipping...');
      return;
    }

    // Debounce rapid auth checks (minimum 1 second between checks)
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 1000) {
      console.log('⏱️ Auth check debounced, too soon since last check');
      return;
    }

    try {
      checkingAuthRef.current = true;
      lastCheckTimeRef.current = now;
      setIsLoading(true);
      
      console.log('🔍 Checking authentication status...');
      const authStatus = await NotionService.checkAuth();
      
      console.log('✅ Auth check result:', { 
        authenticated: authStatus.authenticated, 
        user: authStatus.user?.name || 'Unknown',
        autoAuth: authStatus.autoAuthenticated 
      });
      
      setIsAuthenticated(authStatus.authenticated);
      setUser(authStatus.user || null);
      
      if (authStatus.authenticated && authStatus.autoAuthenticated) {
        console.log('🎉 Auto-authenticated successfully');
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
      checkingAuthRef.current = false;
    }
  };

  const login = async () => {
    try {
      console.log('🔐 Attempting login...');
      const result = await NotionService.setupIntegration();
      if (result.success) {
        console.log('✅ Login successful, refreshing auth status...');
        // Refresh auth status after successful login
        await checkAuth();
      }
      return result;
    } catch (error) {
      console.error('❌ Login failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      await NotionService.logout();
      setIsAuthenticated(false);
      setUser(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Still clear local state even if logout request fails
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // Check auth status on mount
  useEffect(() => {
    console.log('🚀 AuthProvider mounted, checking initial auth status...');
    checkAuth();
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    user,
    isLoading,
    checkAuth,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 