import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { getErrorMessage } from '../utils/errorHandler';
import type { AppUser, Gender } from '../types';

export const authService = {

  async registerWithEmail(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {},
    });
    if (error) throw new Error(getErrorMessage(error));
  },

  async loginWithEmail(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(getErrorMessage(error));
    await authService.updateLastLogin(data.user.id);
  },

  async sendOtp(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
    });
    if (error) throw new Error(getErrorMessage(error));
  },

  async verifyOtp(email: string, token: string): Promise<void> {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: 'email',
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

  async updateProfile(userId: string, updates: {
    display_name?: string;
    photo_url?: string | null;
    gender?: Gender | null;
    bio?: string | null;
    setup_complete?: boolean;
  }): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    if (error) throw new Error(getErrorMessage(error));
  },

  async changePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(getErrorMessage(error));
  },

  async uploadProfilePhoto(userId: string, uri: string): Promise<string> {
    const fileName = `${userId}/profile_${Date.now()}.jpg`;
    const file = new File(uri);
    if (file.size > 15 * 1024 * 1024) {
      throw new Error('Image must be under 15MB.');
    }
    const base64 = await file.base64();
    const { error: uploadError } = await supabase.storage
      .from('plant-images')
      .upload(fileName, decode(base64), { contentType: 'image/jpeg' });
    if (uploadError) throw new Error(getErrorMessage(uploadError));

    const { data: signedData, error: signedError } = await supabase.storage
      .from('plant-images')
      .createSignedUrl(fileName, 604800);
    if (signedError || !signedData) {
      throw new Error(getErrorMessage(signedError ?? new Error('Could not create image URL')));
    }
    return signedData.signedUrl;
  },
};
