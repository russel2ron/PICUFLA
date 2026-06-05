import { supabase } from './supabase';
import { getErrorMessage } from '../utils/errorHandler';
import type { AppUser } from '../types';

export const authService = {

  async registerWithEmail(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: undefined,
      },
    });
    if (error) throw new Error(getErrorMessage(error));
  },

  async loginWithEmail(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(getErrorMessage(error));
    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut();
      throw new Error('Please verify your email before logging in.');
    }
    await authService.updateLastLogin(data.user.id);
  },

  async loginWithGoogle(): Promise<void> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'picufla://auth/callback',
      },
    });
    if (error) throw new Error(getErrorMessage(error));
  },

  async resendVerificationEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    if (error) throw new Error(getErrorMessage(error));
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(getErrorMessage(error));
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getUserProfile(userId: string): Promise<AppUser | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data as AppUser;
  },

  async updateLastLogin(userId: string): Promise<void> {
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
  },

  async reauthenticateWithPassword(password: string): Promise<void> {
    const session = await authService.getSession();
    if (!session?.user?.email) throw new Error('No active session.');
    const { error } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password,
    });
    if (error) throw new Error('Re-authentication failed. Incorrect password.');
  },
};
