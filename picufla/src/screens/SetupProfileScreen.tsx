import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image,
  ActivityIndicator, Alert, Modal, Keyboard, Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackNavigationProp } from '@react-navigation/stack';

import { Colors } from '../constants/colors';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import { cacheService } from '../services/cacheService';
import { supabase } from '../services/supabase';
import type { RootStackParamList, ProfileStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList & ProfileStackParamList, 'SetupProfile'>;
};

export default function SetupProfileScreen({ navigation }: Props) {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

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

  const handleSkip = () => {
    if (wasSetupComplete) {
      navigation.goBack();
    } else {
      useAuthStore.getState().setUser({
        ...user,
        setup_complete: true,
      });
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
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>DISPLAY NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={Colors.textDisabled}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>BIO (optional)</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="A short description about yourself"
                placeholderTextColor={Colors.textDisabled}
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={150}
              />
              <Text style={styles.charCount}>{bio.length}/150</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving ? styles.saveButtonDisabled : null]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.textOnDark} />
              ) : (
                <Text style={styles.saveButtonText}>Save Profile</Text>
              )}
            </TouchableOpacity>

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
                  (deleteConfirmText.trim() !== 'DELETE' || deleting) && styles.modalConfirmDisabled,
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
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.soil,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.stone,
    height: 50,
    paddingHorizontal: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  bioInput: {
    height: 80,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textDisabled,
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: Colors.green700,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.textOnDark,
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
