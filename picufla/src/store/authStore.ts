import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { AppUser } from '../types';

interface AuthState {
  session: Session | null;
  user: AppUser | null;
  isLoading: boolean;
  pendingOtpEmail: string | null;
  pendingPasswordReset: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setPendingOtpEmail: (email: string | null) => void;
  setPendingPasswordReset: (value: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  pendingOtpEmail: null,
  pendingPasswordReset: false,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setPendingOtpEmail: (email) => set({ pendingOtpEmail: email }),
  setPendingPasswordReset: (value) => set({ pendingPasswordReset: value }),
  clearAuth: () => set({ session: null, user: null, pendingOtpEmail: null, pendingPasswordReset: false }),
}));
