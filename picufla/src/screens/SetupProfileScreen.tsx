import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image,
  Alert, Modal, Keyboard, Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Feather } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';

import { Colors } from '../constants/colors';
import { StorageKeys } from '../constants/storage';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import { cacheService } from '../services/cacheService';
import { supabase } from '../services/supabase';
import type { RootStackParamList, ProfileStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList & ProfileStackParamList, 'SetupProfile'>;
};

export default function SetupProfileScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(user?.photo_url ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const wasSetupComplete = user?.setup_complete ?? false;

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteType, setDeleteType] = useState<'account' | 'plant_data'>('plant_data');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [reauthModalVisible, setReauthModalVisible] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthing, setReauthing] = useState(false);
  const [reauthError, setReauthError] = useState('');

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Not logged in.</Text>
      </View>
    );
  }

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Gallery access is required to set a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {}
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      Alert.alert('Required', 'Display name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      let photoUrl = user.photo_url;
      if (photoUri && photoUri !== user.photo_url) {
        photoUrl = await authService.uploadProfilePhoto(user.id, photoUri);
      }

      await authService.updateProfile(user.id, {
        display_name: trimmedName,
        photo_url: photoUrl,
        bio: bio.trim() || null,
        setup_complete: true,
      });

      await AsyncStorage.setItem(StorageKeys.LAST_OTP_TIME, String(Date.now()));

      useAuthStore.getState().setUser({
        ...user,
        display_name: trimmedName,
        photo_url: photoUrl,
        bio: bio.trim() || null,
        setup_complete: true,
      });

      if (wasSetupComplete) {
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save profile.');
    } finally {
      setIsSaving(false);
    }
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
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSkip = async () => {
    if (wasSetupComplete) {
      navigation.goBack();
      return;
    }
    try {
      await authService.updateProfile(user.id, {
        setup_complete: true,
      });
      await AsyncStorage.setItem(StorageKeys.LAST_OTP_TIME, String(Date.now()));
      useAuthStore.getState().setUser({
        ...user,
        setup_complete: true,
      });
    } catch {
      Alert.alert('Error', 'Could not skip setup. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable onPress={Keyboard.dismiss}>
          <View style={styles.header}>
            <Text style={styles.title}>Set Up Your Profile</Text>
            <Text style={styles.subtitle}>Tell us a little about yourself</Text>
          </View>

          <TouchableOpacity style={styles.avatarArea} onPress={handlePickPhoto} activeOpacity={0.8}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="camera" size={28} color={Colors.bark} />
              </View>
            )}
            <Text style={styles.avatarLabel}>
              {photoUri ? 'Change Photo' : 'Add Photo'}
            </Text>
          </TouchableOpacity>

          <View style={styles.form}>
            <Input
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              autoCapitalize="words"
            />

            <Input
              label="Bio (optional)"
              value={bio}
              onChangeText={setBio}
              placeholder="A short description about yourself"
              multiline
              maxLength={150}
            />

            <Button
              title="Save Profile"
              onPress={handleSave}
              loading={isSaving}
              style={styles.submitSpacing}
            />

            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>

            {wasSetupComplete && (
              <>
                <View style={styles.dangerDivider} />
                <Text style={styles.dangerLabel}>Danger Zone</Text>

                <TouchableOpacity
                  style={styles.dangerRow}
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
                  <Text style={[styles.dangerRowText, { flex: 1 }]}>Erase Plant Data</Text>
                  <Feather name="chevron-right" size={18} color={Colors.bark} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dangerRow}
                  onPress={() => {
                    if (user?.auth_provider === 'google') {
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
                  <Text style={[styles.dangerRowText, { flex: 1, color: Colors.error }]}>Delete Account</Text>
                  <Feather name="chevron-right" size={18} color={Colors.bark} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </ScrollView>

      <Modal visible={reauthModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Re-enter Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your password to confirm account deletion.
            </Text>
            <Input
              value={reauthPassword}
              onChangeText={setReauthPassword}
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
              error={reauthError || undefined}
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setReauthModalVisible(false);
                  setReauthPassword('');
                  setReauthError('');
                }}
                style={styles.modalBtnHalf}
              />
              <Button
                title="Continue"
                onPress={handleReauthSubmit}
                loading={reauthing}
                disabled={!reauthPassword.trim()}
                style={styles.modalBtnHalf}
              />
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
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirmText('');
                }}
                style={styles.modalBtnHalf}
              />
              <Button
                title="Confirm"
                onPress={handleDeleteConfirm}
                loading={deleting}
                disabled={deleteConfirmText.trim() !== 'DELETE'}
                variant="danger"
                style={styles.modalBtnHalf}
              />
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
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.soil,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.bark,
  },
  avatarArea: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: Colors.green300,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.linen,
    borderWidth: 2,
    borderColor: Colors.stone,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.green700,
  },
  form: {
    width: '100%',
    gap: 20,
  },
  submitSpacing: {
    marginTop: 8,
  },
  skipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.bark,
    textAlign: 'center',
    marginTop: 4,
  },
  dangerDivider: {
    height: 1,
    backgroundColor: Colors.stone,
    marginTop: 48,
    marginBottom: 6,
  },
  dangerLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: Colors.error,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 4,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.stone,
  },
  dangerRowText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.soil,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
  modalBtnHalf: {
    flex: 1,
  },
});
