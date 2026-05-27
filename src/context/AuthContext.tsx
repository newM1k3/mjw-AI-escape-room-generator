import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import pb from '../lib/pocketbase';
import { getPublicConfigWarning } from '../config';
import type { UserRecord } from '../types';

interface AuthContextValue {
  user: UserRecord | null;
  isLoading: boolean;
  isPro: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(timeoutMessage)), AUTH_TIMEOUT_MS);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes('timed out')) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status?: unknown }).status);
    if (status === 400 || status === 401) {
      return 'The email or password is incorrect. Please check your credentials and try again.';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Authentication failed. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async () => {
    const configWarning = getPublicConfigWarning();
    if (configWarning) {
      console.warn(configWarning);
      pb.authStore.clear();
      setUser(null);
      setIsLoading(false);
      return;
    }

    if (pb.authStore.isValid && pb.authStore.model) {
      try {
        const record = await withTimeout(
          pb.collection('users').getOne<UserRecord>(pb.authStore.model.id),
          'Authentication refresh timed out. Please check the PocketBase connection and try again.'
        );
        setUser(record);
      } catch (error) {
        console.warn('Clearing invalid PocketBase auth state:', getAuthErrorMessage(error));
        pb.authStore.clear();
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadUser();

    const unsubscribe = pb.authStore.onChange(() => {
      loadUser();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const configWarning = getPublicConfigWarning();
    if (configWarning) throw new Error(configWarning);

    try {
      await withTimeout(
        pb.collection('users').authWithPassword(email, password),
        'Sign in timed out. Please check the PocketBase connection and try again.'
      );
      await loadUser();
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const configWarning = getPublicConfigWarning();
    if (configWarning) throw new Error(configWarning);

    try {
      await withTimeout(
        pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
          name,
          tier: 'free',
        }),
        'Account creation timed out. Please check the PocketBase connection and try again.'
      );
      await withTimeout(
        pb.collection('users').authWithPassword(email, password),
        'Sign in timed out after account creation. Please try signing in manually.'
      );
      await loadUser();
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
    setIsLoading(false);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const isPro = user?.tier === 'pro';

  return (
    <AuthContext.Provider value={{ user, isLoading, isPro, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
