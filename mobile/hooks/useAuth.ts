import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { getToken, setToken, removeToken } from '../lib/auth';
import { User } from '../lib/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getToken();
      console.log('Token check:', token ? 'Found' : 'Not found');
      
      if (token) {
        // Skip API call for now to avoid network issues
        // const user = await apiRequest<User>('GET', '/api/auth/me');
        setAuthState({
          user: null, // Set to null for now
          isLoading: false,
          isAuthenticated: false, // Set to false for now
        });
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await removeToken();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiRequest<{ user: User; token: string }>('POST', '/api/auth/signin', {
        email,
        password,
      });
      
      await setToken(response.token);
      setAuthState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      return { success: true };
    } catch (error) {
      console.error('Sign in failed:', error);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await removeToken();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return {
    ...authState,
    signIn,
    signOut,
    checkAuth,
  };
}