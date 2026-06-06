import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserPlant } from '../types';

const CACHE_KEY_PREFIX = '@picufla_cached_plants_';
const SYNC_KEY_PREFIX = '@picufla_sync_';

export const cacheService = {
  async savePlants(userId: string, plants: UserPlant[]): Promise<void> {
    await AsyncStorage.setItem(CACHE_KEY_PREFIX + userId, JSON.stringify(plants));
    await AsyncStorage.setItem(SYNC_KEY_PREFIX + userId, new Date().toISOString());
  },

  async getPlants(userId: string): Promise<UserPlant[]> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY_PREFIX + userId);
      if (!raw) return [];
      return JSON.parse(raw) as UserPlant[];
    } catch {
      return [];
    }
  },

  async getLastSyncDate(userId: string): Promise<Date | null> {
    try {
      const raw = await AsyncStorage.getItem(SYNC_KEY_PREFIX + userId);
      if (!raw) return null;
      return new Date(raw);
    } catch {
      return null;
    }
  },

  async clearCache(userId: string): Promise<void> {
    await AsyncStorage.multiRemove([CACHE_KEY_PREFIX + userId, SYNC_KEY_PREFIX + userId]);
  },
};
