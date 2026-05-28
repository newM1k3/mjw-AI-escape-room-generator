/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import pb from '../lib/pocketbase';
import { getPublicConfigWarning } from '../config';
import { getEntitlementStatus, hasProEntitlement, type EntitlementStatus } from '../lib/entitlements';
import type { UserRecord } from '../types';

interface AuthContextValue {
  user: UserRecord | null;
  isLoading: boolean;
  isEntitlementLoading: boolean;
  entitlementStatus: EntitlementStatus;
  isPro: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<UserRecord | null>;
  authToken: string;
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

function getFieldMessage(error: unknown, field: string): string | null {
  if (!error || typeof error !== 'object' || !('data' in error)) return null;
  const data = (error as { data?: { data?: Record<string, { message?: string }> } }).data?.data;
  return data?.[field]?.message || null;
}

function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes('timed out')) {
    return error.message;
  }

  if (error instanceof TypeError && /fetch|network|failed/i.test(error.message)) {
    return 'PuzzleFlow AI could not reach the authentication service. Please check your connection and try again.';
  }

  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status?: unknown }).status);
    const emailMessage = getFieldMessage(error, 'email');
    const passwordMessage = getFieldMessage(error, 'password');

    if (status === 0) {
      return 'PuzzleFlow AI could not reach PocketBase. Please try again in a moment or contact support if this continues.';
    }

    if (emailMessage) {
      return `Email issue: ${emailMessage}`;
    }

    if (passwordMessage) {
      return `Password issue: ${passwordMessage}`;
    }

    if (status === 400 || status === 401) {
      return 'The email or password is incorrect. Please check your credentials and try again.';
    }

    if (status === 404) {
      return 'The authentication service is not available at the configured PocketBase URL.';
    }

    if (status >= 500) {
      return 'The authentication service is temporarily unavailable. Please try again shortly.';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Authentication failed. Please try again.';
}

function getPasswordResetErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes('timed out')) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status?: unknown }).status);

    if (status === 400 || status === 404) {
      return 'Password reset could not be started. Confirm this email belongs to a PuzzleFlow AI account, then try again.';
    }

    if (status >= 500) {
      return 'Password reset email could not be sent. PocketBase email delivery may not be configured yet. Contact support for help.';
    }
  }

  if (error instanceof TypeError && /fetch|network|failed/i.test(error.message)) {
    return 'PuzzleFlow AI could not reach the authentication service. Please check your connection and try again.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Password reset could not be started. If this continues, PocketBase email delivery may need to be configured.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEntitlementLoading, setIsEntitlementLoading] = useState(true);

  const loadUser = useCallback(async (): Promise<UserRecord | null> => {
    setIsLoading(true);
    setIsEntitlementLoading(true);
    const configWarning = getPublicConfigWarning();
    if (configWarning) {
      console.warn(configWarning);
      pb.authStore.clear();
      setUser(null);
      setIsLoading(false);
      setIsEntitlementLoading(false);
      return null;
    }

    if (pb.authStore.isValid && pb.authStore.model) {
      try {
        const record = await withTimeout(
          pb.collection('users').getOne<UserRecord>(pb.authStore.model.id),
          'Authentication refresh timed out. Please check the PocketBase connection and try again.'
        );
        setUser(record);
        return record;
      } catch (error) {
        console.warn('Clearing invalid PocketBase auth state:', getAuthErrorMessage(error));
        pb.authStore.clear();
        setUser(null);
        return null;
      } finally {
        setIsLoading(false);
        setIsEntitlementLoading(false);
      }
    }

    setUser(null);
    setIsLoading(false);
    setIsEntitlementLoading(false);
    return null;
  }, []);

  useEffect(() => {
    loadUser();

    const unsubscribe = pb.authStore.onChange(() => {
      loadUser();
    });

    return () => {
      unsubscribe();
    };
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const configWarning = getPublicConfigWarning();
    if (configWarning) throw new Error(configWarning);

    try {
      await withTimeout(
        pb.collection('users').authWithPassword(email.trim().toLowerCase(), password),
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
      const normalizedEmail = email.trim().toLowerCase();
      await withTimeout(
        pb.collection('users').create({
          email: normalizedEmail,
          password,
          passwordConfirm: password,
          name: name.trim(),
          tier: 'free',
        }),
        'Account creation timed out. Please check the PocketBase connection and try again.'
      );
      await withTimeout(
        pb.collection('users').authWithPassword(normalizedEmail, password),
        'Sign in timed out after account creation. Please try signing in manually.'
      );
      await loadUser();
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const requestPasswordReset = async (email: string) => {
    const configWarning = getPublicConfigWarning();
    if (configWarning) throw new Error(configWarning);

    try {
      await withTimeout(
        pb.collection('users').requestPasswordReset(email.trim().toLowerCase()),
        'Password reset request timed out. Please check the PocketBase connection and try again.'
      );
    } catch (error) {
      throw new Error(getPasswordResetErrorMessage(error));
    }
  };

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
    setIsLoading(false);
    setIsEntitlementLoading(false);
  };

  const refreshUser = async () => {
    return loadUser();
  };

  const entitlementStatus = getEntitlementStatus(user, isLoading || isEntitlementLoading);
  const isPro = hasProEntitlement(user);
  const authToken = pb.authStore.token || '';

  return (
    <AuthContext.Provider value={{ user, isLoading, isEntitlementLoading, entitlementStatus, isPro, login, register, requestPasswordReset, logout, refreshUser, authToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
