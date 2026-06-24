import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator,
  Alert, Switch, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';

import * as Notifications from 'expo-notifications';
import { Colors } from '../constants/colors';
import Button from '../components/Button';
import SectionLabel from '../components/SectionLabel';
import { StorageKeys } from '../constants/storage';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useCollectionStore } from '../store/collectionStore';
import { authService } from '../services/authService';
import { cacheService } from '../services/cacheService';
import { supabase } from '../services/supabase';
import type { ProfileStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<ProfileStackParamList, 'Profile'>;
};

function getInitials(displayName: string): string {
  return displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const plants = useCollectionStore((s) => s.plants);

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user?.notifications_enabled ?? false,
  );
  const [savingNotification, setSavingNotification] = useState(false);

  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [loadingSync, setLoadingSync] = useState(true);

  const discoveredCount = plants.filter((p) => !p.is_deleted).length;
  const favoritesCount = plants.filter((p) => p.is_favorite && !p.is_deleted).length;
  const remindersCount = 0;

  const offlineMode = useAppStore((s) => s.isOffline);
  const setOffline = useAppStore((s) => s.setOffline);
  const [cacheSize, setCacheSize] = useState('');

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const date = await cacheService.getLastSyncDate(user.id);
        setLastSyncDate(date);
      } catch {
        // ignore
      } finally {
        setLoadingSync(false);
      }
    })();
  }, [user]);

  const handleToggleOffline = (value: boolean) => {
    setOffline(value);
    AsyncStorage.setItem(StorageKeys.OFFLINE_MODE, String(value));
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (!user) return;
    setNotificationsEnabled(value);
    setSavingNotification(true);
    try {
      await supabase
        .from('profiles')
        .update({ notifications_enabled: value })
        .eq('id', user.id);
    } catch {
      setNotificationsEnabled(!value);
    } finally {
      setSavingNotification(false);
    }
  };

  const performLogout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // continue anyway
    }
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // ignore
    }
    if (user) {
      try {
        await cacheService.clearCache(user.id);
      } catch {
        // ignore
      }
    }
    useAuthStore.getState().clearAuth();
  }, [user, navigation]);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: performLogout },
    ]);
  };

  const formatSyncTime = (date: Date | null): string => {
    if (!date) return 'Never synced';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Synced just now';
    if (diffMins < 60) return `Synced ${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Synced ${diffHours}h ago`;
    return `Synced ${date.toLocaleDateString()}`;
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Not logged in.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.avatar}>
            {user.photo_url ? (
              <Image source={{ uri: user.photo_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{getInitials(user.display_name)}</Text>
            )}
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={11} color={Colors.textOnDark} />
            </View>
          </View>
          <Text style={styles.displayName}>{user.display_name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.providerPill}>
            <Text style={styles.providerPillText}>
              {user.auth_provider === 'google' ? 'Google' : 'Email'}
            </Text>
          </View>
          <Button title="Edit Profile" onPress={() => navigation.navigate('SetupProfile')} variant="secondary" style={styles.editProfileButton} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{discoveredCount}</Text>
            <Text style={styles.statLabel}>Discovered</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{favoritesCount}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{remindersCount}</Text>
            <Text style={styles.statLabel}>Reminders</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel label="Preferences" />
          <View style={styles.sectionCard}>
            <View style={styles.settingRow}>
              <View style={[styles.iconChip, { backgroundColor: Colors.green100 }]}>
                <Feather name="bell" size={16} color={Colors.green700} />
              </View>
              <Text style={styles.settingLabel}>Push notifications</Text>
              {savingNotification ? (
                <ActivityIndicator size="small" color={Colors.green700} />
              ) : (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: Colors.stone, true: Colors.green300 }}
                  thumbColor={notificationsEnabled ? Colors.green700 : Colors.card}
                />
              )}
            </View>

            <View style={styles.settingRow}>
              <View style={[styles.iconChip, { backgroundColor: Colors.green100 }]}>
                <Feather name="map-pin" size={16} color={Colors.green700} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Location access</Text>
                <Text style={styles.settingSubtext}>Manage in device Settings</Text>
              </View>
              <TouchableOpacity
                onPress={() => Linking.openSettings()}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="chevron-right" size={18} color={Colors.bark} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <View style={[styles.iconChip, { backgroundColor: Colors.green100 }]}>
                <Feather name="wifi-off" size={16} color={Colors.green700} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Offline mode</Text>
                <Text style={styles.settingSubtext}>
                  {loadingSync ? '' : formatSyncTime(lastSyncDate)}{cacheSize ? ` · ${cacheSize}` : ''}
                </Text>
              </View>
              <Switch
                value={offlineMode}
                onValueChange={handleToggleOffline}
                trackColor={{ false: Colors.stone, true: Colors.green300 }}
                thumbColor={offlineMode ? Colors.green700 : Colors.card}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel label="Account" />
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => navigation.navigate('PrivacyPolicy')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconChip, { backgroundColor: Colors.green100 }]}>
                <Feather name="file-text" size={16} color={Colors.green700} />
              </View>
              <Text style={[styles.settingLabel, { flex: 1 }]}>Privacy Policy</Text>
              <Feather name="chevron-right" size={18} color={Colors.bark} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingRow, { borderBottomWidth: 0 }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={[styles.iconChip, { backgroundColor: Colors.green100 }]}>
                <Feather name="log-out" size={16} color={Colors.green700} />
              </View>
              <Text style={[styles.settingLabel, { flex: 1 }]}>Log Out</Text>
              <Feather name="chevron-right" size={18} color={Colors.bark} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>
          PICUFLA v1.0.0 {'\n'}
          Protected under the Philippine Data Privacy Act of 2012{'\n'}
          Deletion requests processed within 30 days.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.parchment,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.bark,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    gap: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.green200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    resizeMode: 'cover',
  },
  avatarInitials: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.soil,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.green700,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.linen,
  },
  displayName: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 24,
    color: Colors.soil,
  },
  email: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.bark,
  },
  providerPill: {
    backgroundColor: Colors.green100,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  providerPillText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: Colors.green700,
  },
  editProfileButton: {
    marginTop: 10,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.linen,
    borderWidth: 1,
    borderColor: Colors.stone,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: Colors.soil,
  },
  statLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.bark,
    textTransform: 'uppercase',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.stone,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.stone,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.soil,
  },
  settingContent: {
    flex: 1,
  },
  settingSubtext: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.bark,
    marginTop: 1,
  },
  footer: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.bark,
    textAlign: 'center',
    paddingHorizontal: 32,
    paddingTop: 8,
    paddingBottom: 20,
    lineHeight: 17,
  },
});
