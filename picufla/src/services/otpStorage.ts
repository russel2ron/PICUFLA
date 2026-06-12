import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_EMAIL_KEY = '@picufla_pending_otp_email';

export const otpStorage = {

  async setPendingOtpEmail(email: string): Promise<void> {
    await AsyncStorage.setItem(PENDING_EMAIL_KEY, email);
  },

  async getPendingOtpEmail(): Promise<string | null> {
    return AsyncStorage.getItem(PENDING_EMAIL_KEY);
  },

  async clearPendingOtpEmail(): Promise<void> {
    await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
  },
};
