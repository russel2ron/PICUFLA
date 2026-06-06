import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator,
  Alert, TextInput, Switch, Modal, Linking, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackNavigationProp } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../store/authStore';
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
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const user = useAuthStore((s) => s.user);
  const plants = useCollectionStore((s) => s.plants);

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user?.notifications_enabled ?? false,
  );
  const [savingNotification, setSavingNotification] = useState(false);

  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [loadingSync, setLoadingSync] = useState(true);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteType, setDeleteType] = useState<'account' | 'plant_data'>('plant_data');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [reauthModalVisible, setReauthModalVisible] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthing, setReauthing] = useState(false);
  const [reauthError, setReauthError] = useState('');

  const discoveredCount = plants.filter((p) => !p.is_deleted).length;
  const favoritesCount = plants.filter((p) => p.is_favorite && !p.is_deleted).length;
  const remindersCount = 0;

  React.useEffect(() => {
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
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }),
    );
  }, [user, navigation]);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: performLogout },
    ]);
  };

  const handleReauthSubmit = async () => {
    setReauthError('');
    setReauthing(true);
    try {
      await authService.reauthenticateWithPassword(reauthPassword);
      setReauthModalVisible(false);
      setReauthPassword('');
      setDeleteType('account');
      setDeleteConfirmText('');
      setDeleteModalVisible(true);
    } catch (err: any) {
      setReauthError(err.message || 'Re-authentication failed.');
    } finally {
      setReauthing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'delete-user',
        {
          body: {
            confirmationText: deleteConfirmText.trim(),
            deletionType: deleteType,
          },
        },
      );

      if (invokeError) throw invokeError;
      const result = data as { success?: boolean; message?: string; error?: string };
      if (!result.success) throw new Error(result.error ?? 'Delete failed.');

      setDeleteModalVisible(false);
      setDeleteConfirmText('');

      if (deleteType === 'account') {
        await authService.logout().catch(() => {});
        await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
        await cacheService.clearCache(user.id).catch(() => {});
        useAuthStore.getState().clearAuth();
        navigation.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }),
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setDeleting(false);
    }
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

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.green700} />
      </View>
    );
  }

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
          <Text style={styles.sectionLabel}>Preferences</Text>
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
                {loadingSync ? (
                  <ActivityIndicator size="small" color={Colors.bark} />
                ) : (
                  <Text style={styles.settingSubtext}>{formatSyncTime(lastSyncDate)}</Text>
                )}
              </View>
              <Feather name="chevron-right" size={18} color={Colors.bark} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
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
              style={styles.settingRow}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={[styles.iconChip, { backgroundColor: Colors.green100 }]}>
                <Feather name="log-out" size={16} color={Colors.green700} />
              </View>
              <Text style={[styles.settingLabel, { flex: 1 }]}>Log Out</Text>
              <Feather name="chevron-right" size={18} color={Colors.bark} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                setDeleteType('plant_data');
                setDeleteConfirmText('');
                setDeleteModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconChip, { backgroundColor: Colors.terraLight }]}>
                <Feather name="trash-2" size={16} color={Colors.terra} />
              </View>
              <Text style={[styles.settingLabel, { flex: 1, color: Colors.soil }]}>
                Erase Plant Data
              </Text>
              <Feather name="chevron-right" size={18} color={Colors.bark} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingRow, { borderBottomWidth: 0 }]}
              onPress={() => {
                if (user.auth_provider === 'google') {
                  Alert.alert(
                    'Re-authentication Required',
                    'Please sign in with Google again to delete your account.',
                  );
                  return;
                }
                setReauthPassword('');
                setReauthError('');
                setReauthModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconChip, { backgroundColor: Colors.errorBg }]}>
                <Feather name="alert-circle" size={16} color={Colors.error} />
              </View>
              <Text style={[styles.settingLabel, { flex: 1, color: Colors.error }]}>
                Delete Account
              </Text>
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

      <Modal visible={reauthModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Re-enter Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your password to confirm account deletion.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Password"
              placeholderTextColor={Colors.bark}
              secureTextEntry
              autoCapitalize="none"
              value={reauthPassword}
              onChangeText={setReauthPassword}
            />
            {reauthError !== '' && (
              <Text style={styles.reauthError}>{reauthError}</Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setReauthModalVisible(false);
                  setReauthPassword('');
                  setReauthError('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  (!reauthPassword.trim() || reauthing) && styles.modalConfirmDisabled,
                ]}
                onPress={handleReauthSubmit}
                disabled={!reauthPassword.trim() || reauthing}
                activeOpacity={0.7}
              >
                {reauthing ? (
                  <ActivityIndicator size="small" color={Colors.textOnDark} />
                ) : (
                  <Text style={styles.modalConfirmText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {deleteType === 'account' ? 'Delete Account' : 'Erase Plant Data'}
            </Text>
            <Text style={styles.modalWarning}>
              {deleteType === 'account'
                ? 'This permanently deletes your account and all data within 30 days. This cannot be undone.'
                : 'This will permanently delete all your plant discoveries and photos within 30 days.'}
            </Text>
            <Text style={styles.modalConfirmLabel}>Type DELETE to confirm</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="DELETE"
              placeholderTextColor={Colors.bark}
              autoCorrect={false}
              autoCapitalize="characters"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirmText('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  (deleteConfirmText.trim() !== 'DELETE' || deleting) &&
                    styles.modalConfirmDisabled,
                ]}
                onPress={handleDeleteConfirm}
                disabled={deleteConfirmText.trim() !== 'DELETE' || deleting}
                activeOpacity={0.7}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={Colors.textOnDark} />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 20,
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
    fontSize: 22,
    color: Colors.soil,
  },
  email: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
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
  sectionLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.bark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  modalTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 20,
    color: Colors.soil,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.bark,
    textAlign: 'center',
  },
  modalWarning: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    lineHeight: 19,
  },
  modalConfirmLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.soil,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: Colors.linen,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.stone,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.soil,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.linen,
    borderRadius: 10,
  },
  modalCancelText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: Colors.bark,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: 10,
  },
  modalConfirmDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: Colors.textOnDark,
  },
  reauthError: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.error,
    textAlign: 'center',
  },
});
