import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import pb from '../lib/pocketbase';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async () => {
    if (pb.authStore.isValid && pb.authStore.model) {
      try {
        const record = await pb.collection('users').getOne<UserRecord>(pb.authStore.model.id);
        setUser(record);
      } catch {
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
    await pb.collection('users').authWithPassword(email, password);
    await loadUser();
  };

  const register = async (email: string, password: string, name: string) => {
    await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      name,
      tier: 'free',
    });
    await pb.collection('users').authWithPassword(email, password);
    await loadUser();
  };

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
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
