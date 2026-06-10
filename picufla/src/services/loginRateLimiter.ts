import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@picufla_login_attempts';
const RESET_TIMEOUT_MS = 20 * 60 * 1000;

const DELAY_SECONDS = [0, 0, 0, 0, 0, 30, 60, 120, 240, 300];

interface StoredAttempts {
  count: number;
  lastAttemptAt: number;
}

function getDelaySeconds(count: number): number {
  if (count >= DELAY_SECONDS.length) return 300;
  return DELAY_SECONDS[count];
}

export const loginRateLimiter = {
  async getStored(): Promise<StoredAttempts | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async recordFailure(): Promise<void> {
    const stored = await this.getStored();
    const now = Date.now();

    if (!stored || now - stored.lastAttemptAt > RESET_TIMEOUT_MS) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 1, lastAttemptAt: now }));
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ count: stored.count + 1, lastAttemptAt: now }));
    }
  },

  async recordSuccess(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  async getRemainingWaitSeconds(): Promise<number> {
    const stored = await this.getStored();
    if (!stored) return 0;

    const now = Date.now();
    const elapsed = now - stored.lastAttemptAt;

    if (elapsed > RESET_TIMEOUT_MS) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return 0;
    }

    const delay = getDelaySeconds(stored.count) * 1000;
    const remaining = Math.ceil((delay - elapsed) / 1000);
    return Math.max(0, remaining);
  },
};
