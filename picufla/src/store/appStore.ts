import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '../constants/storage';

interface AppState {
  isOffline: boolean;
  onboardingComplete: boolean;
  termsAccepted: boolean;
  fontsLoaded: boolean;
  setOffline: (offline: boolean) => void;
  setFontsLoaded: (loaded: boolean) => void;
  loadOnboardingState: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  isOffline: false,
  onboardingComplete: false,
  termsAccepted: false,
  fontsLoaded: false,
  setOffline: (isOffline) => set({ isOffline }),
  setFontsLoaded: (fontsLoaded) => set({ fontsLoaded }),
  loadOnboardingState: async () => {
    try {
      const [onboarding, terms] = await Promise.all([
        AsyncStorage.getItem(StorageKeys.ONBOARDING_COMPLETE),
        AsyncStorage.getItem(StorageKeys.TERMS_ACCEPTED),
      ]);
      set({
        onboardingComplete: onboarding === 'true',
        termsAccepted: terms === 'true',
      });
    } catch {
      set({ onboardingComplete: false, termsAccepted: false });
    }
  },
  completeOnboarding: async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(StorageKeys.ONBOARDING_COMPLETE, 'true'),
        AsyncStorage.setItem(StorageKeys.TERMS_ACCEPTED, 'true'),
      ]);
      set({ onboardingComplete: true, termsAccepted: true });
    } catch {
      set({ onboardingComplete: true, termsAccepted: true });
    }
  },
}));
