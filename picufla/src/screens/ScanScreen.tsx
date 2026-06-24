import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Linking, Modal, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';
import Button from '../components/Button';
import ScanOverlay from '../components/ScanOverlay';
import { StorageKeys } from '../constants/storage';
import { permissionService, PermissionStatus } from '../services/permissionService';
import { identificationService } from '../services/identificationService';
import { getErrorMessage } from '../utils/errorHandler';
import type { ScanStackParamList } from '../types';

const SCAN_COUNT_KEY = StorageKeys.SCAN_COUNT;
const RATE_LIMIT = 5;

type ViewState = 'viewfinder' | 'preview' | 'identifying';
type FlashMode = 'off' | 'on' | 'auto';

const FLASH_LABELS: Record<FlashMode, string> = { off: 'Off', on: 'On', auto: 'Auto' };
const FLASH_ICONS: Record<FlashMode, keyof typeof Feather.glyphMap> = { off: 'zap-off', on: 'zap', auto: 'zap' };

type Props = {
  navigation: StackNavigationProp<ScanStackParamList, 'Scan'>;
};

function PermissionDeniedView() {
  return (
    <View style={styles.permissionDeniedContainer}>
      <Feather name="lock" size={48} color={Colors.green600} />
      <Text style={styles.permissionDeniedTitle}>Camera Access Required</Text>
      <Text style={styles.permissionDeniedSubtitle}>
        PICUFLA needs camera access to identify plants.
      </Text>
      <Button title="Open Settings" onPress={() => Linking.openSettings()} />
    </View>
  );
}

export default function ScanScreen({ navigation }: Props) {
  const [viewState, setViewState] = useState<ViewState>('viewfinder');
  const [cameraPermission, setCameraPermission] = useState<PermissionStatus>('undetermined');
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<'camera' | 'gallery' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tipsVisible, setTipsVisible] = useState(false);
  const [remainingCount, setRemainingCount] = useState(RATE_LIMIT);
  const [limitModalVisible, setLimitModalVisible] = useState(false);
  const [flash, setFlash] = useState<FlashMode>('off');
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    loadRemainingCount();
  }, []);

  const loadRemainingCount = async () => {
    try {
      const raw = await AsyncStorage.getItem(SCAN_COUNT_KEY);
      if (raw) {
        const { count, windowStart } = JSON.parse(raw);
        if (Date.now() - windowStart > 60 * 60 * 1000) {
          await AsyncStorage.removeItem(SCAN_COUNT_KEY);
          setRemainingCount(RATE_LIMIT);
        } else {
          setRemainingCount(Math.max(0, RATE_LIMIT - count));
        }
      }
    } catch {}
  };

  const incrementScanCount = async () => {
    try {
      const raw = await AsyncStorage.getItem(SCAN_COUNT_KEY);
      if (raw) {
        const { count, windowStart } = JSON.parse(raw);
        if (Date.now() - windowStart > 60 * 60 * 1000) {
          await AsyncStorage.setItem(SCAN_COUNT_KEY, JSON.stringify({ count: 1, windowStart: Date.now() }));
        } else {
          await AsyncStorage.setItem(SCAN_COUNT_KEY, JSON.stringify({ count: count + 1, windowStart }));
        }
      } else {
        await AsyncStorage.setItem(SCAN_COUNT_KEY, JSON.stringify({ count: 1, windowStart: Date.now() }));
      }
      setRemainingCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  useEffect(() => {
    (async () => {
      const camStatus = await permissionService.getCameraStatus();
      setCameraPermission(camStatus);
      if (camStatus === 'undetermined') {
        const newStatus = await permissionService.requestCamera();
        setCameraPermission(newStatus);
      }
      setPermissionsLoading(false);
    })();
  }, []);

  if (permissionsLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.soil, gap: 16 }}>
        <ActivityIndicator size="large" color={Colors.textOnDark} />
        <Text style={{ fontFamily: 'DMSerifDisplay_400Regular', fontSize: 18, color: Colors.textOnDark }}>Preparing camera…</Text>
      </View>
    );
  }

  if (cameraPermission === 'denied') {
    return <PermissionDeniedView />;
  }

  const handleTakePhoto = async () => {
    if (remainingCount === 0) { setLimitModalVisible(true); return; }
    if (!cameraRef.current || !cameraReady) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      setCapturedUri(photo.uri);
      setImageSource('camera');
      setViewState('preview');
      setErrorMessage(null);
    } catch {
      setErrorMessage('Failed to take photo. Please try again.');
    }
  };

  const handleIdentify = async () => {
    if (!capturedUri) return;

    setViewState('identifying');
    setErrorMessage(null);

    try {
      const result = await identificationService.identifyPlant(capturedUri);
      await incrementScanCount();
      navigation.navigate('IdentificationResult', { result, capturedImageUri: capturedUri, imageSource: imageSource ?? undefined });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setViewState('preview');
    }
  };

  const handleRetake = () => {
    setCapturedUri(null);
    setViewState('viewfinder');
    setErrorMessage(null);
  };

  const handlePickFromGallery = async () => {
    if (remainingCount === 0) { setLimitModalVisible(true); return; }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setErrorMessage('Gallery access is required to pick a photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (!result.canceled && result.assets.length > 0) {
        setCapturedUri(result.assets[0].uri);
        setImageSource('gallery');
        setViewState('preview');
        setErrorMessage(null);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Could not open gallery.');
    }
  };

  const cycleFlash = () => {
    setFlash((prev) => {
      const order: FlashMode[] = ['off', 'on', 'auto'];
      const idx = order.indexOf(prev);
      return order[(idx + 1) % order.length];
    });
  };

  return (
    <View style={styles.container}>
      {viewState === 'viewfinder' && (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" flash={flash} onCameraReady={() => setCameraReady(true)} onMountError={(e) => setErrorMessage(e.message)} />
          <ScanOverlay />
          <View style={styles.topChips}>
            <TouchableOpacity style={styles.topChip} onPress={cycleFlash} activeOpacity={0.7}>
              <Feather name={FLASH_ICONS[flash]} size={14} color={Colors.textOnDark} />
              <Text style={styles.topChipText}>{FLASH_LABELS[flash]}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.topChip} onPress={() => setTipsVisible(true)} activeOpacity={0.7}>
              <Feather name="info" size={14} color={Colors.textOnDark} />
              <Text style={styles.topChipText}>Tips</Text>
            </TouchableOpacity>
          </View>

            <BlurView intensity={80} tint="dark" style={styles.bottomPanel}>
            <Text style={styles.panelTitle}>Identify a Plant</Text>
            <Text style={styles.panelSubtitle}>Frame the plant clearly. Works best in natural light.</Text>

            <View style={styles.captureRow}>
              <TouchableOpacity
                style={[styles.galleryButton, remainingCount === 0 && styles.galleryButtonDisabled]}
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
              >
                <Feather name="image" size={24} color={remainingCount === 0 ? 'rgba(255,255,255,0.3)' : Colors.textOnDark} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.captureButton, remainingCount === 0 && styles.captureButtonDisabled]}
                onPress={handleTakePhoto}
                activeOpacity={0.8}
                disabled={remainingCount === 0}
              />
              <TouchableOpacity style={styles.galleryButton} onPress={cycleFlash} activeOpacity={0.8}>
                <Feather name={FLASH_ICONS[flash]} size={22} color={Colors.textOnDark} />
              </TouchableOpacity>
            </View>

            <View style={[styles.remainingChip, remainingCount === 0 && styles.remainingChipEmpty]}>
              <Feather name="activity" size={12} color={remainingCount === 0 ? Colors.error : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.remainingText, remainingCount === 0 && styles.remainingTextEmpty]}>
                {remainingCount}/{RATE_LIMIT} identifications remaining
              </Text>
            </View>
          </BlurView>
        </>
      )}

      {viewState === 'preview' && capturedUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} />
          {errorMessage ? (
            <View style={styles.previewErrorBox}>
              <Text style={styles.previewErrorText}>{errorMessage}</Text>
            </View>
          ) : null}
          <BlurView intensity={80} tint="dark" style={styles.previewBottomBar}>
            <Button title="Retake" onPress={handleRetake} variant="secondary" style={styles.previewBtn} />
            <Button title="Identify" onPress={handleIdentify} disabled={remainingCount === 0} style={styles.previewBtn} />
          </BlurView>
        </View>
      )}

      {viewState === 'identifying' && capturedUri && (
        <View style={styles.identifyingContainer}>
          <Image source={{ uri: capturedUri }} style={styles.identifyingImage} />
          <View style={styles.identifyingOverlay}>
            <ActivityIndicator size="large" color={Colors.textOnDark} />
            <Text style={styles.identifyingText}>Identifying your plant…</Text>
          </View>
        </View>
      )}

      <Modal visible={tipsVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Feather name="aperture" size={40} color={Colors.green600} />
            <Text style={styles.modalTitle}>Tips for Best Results</Text>
            <View style={styles.modalTipRow}>
              <Feather name="sun" size={18} color={Colors.terra} />
              <Text style={styles.modalTipText}>Make sure the plant is in <Text style={styles.modalTipBold}>good lighting</Text></Text>
            </View>
            <View style={styles.modalTipRow}>
              <Feather name="crosshair" size={18} color={Colors.terra} />
              <Text style={styles.modalTipText}>Keep the plant <Text style={styles.modalTipBold}>centered and in focus</Text></Text>
            </View>
            <View style={styles.modalTipRow}>
              <Feather name="camera" size={18} color={Colors.terra} />
              <Text style={styles.modalTipText}>Hold your phone <Text style={styles.modalTipBold}>steady</Text> while taking the photo</Text>
            </View>
            <View style={styles.modalTipRow}>
              <Feather name="grid" size={18} color={Colors.terra} />
              <Text style={styles.modalTipText}>Capture the <Text style={styles.modalTipBold}>leaf, flower, or stem</Text> clearly</Text>
            </View>
            <Button title="Got it!" onPress={() => setTipsVisible(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={limitModalVisible} transparent animationType="fade">
        <View style={styles.limitModalOverlay}>
          <View style={styles.limitModalContent}>
            <View style={styles.limitModalIcon}>
              <Feather name="clock" size={28} color={Colors.error} />
            </View>
            <Text style={styles.limitModalTitle}>Limit Reached</Text>
            <Text style={styles.limitModalBody}>
              You've used all your identifications for this hour. Come back in about an hour to identify more plants.
            </Text>
            <Button title="Got it" onPress={() => setLimitModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.soil,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  topChips: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: Theme.radius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  topChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.textOnDark,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Theme.radius.lg,
    borderTopRightRadius: Theme.radius.lg,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  panelTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: Colors.textOnDark,
  },
  panelSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginVertical: 6,
  },
  captureButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.textOnDark,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: Colors.soil,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  galleryButtonDisabled: {
    opacity: 0.4,
  },
  remainingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 100,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  remainingChipEmpty: {
    backgroundColor: 'rgba(184,84,80,0.2)',
  },
  remainingText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  remainingTextEmpty: {
    color: Colors.error,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: Colors.soil,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    paddingBottom: 40,
    borderTopLeftRadius: Theme.radius.lg,
    borderTopRightRadius: Theme.radius.lg,
  },
  previewBtn: {
    width: 140,
  },
  previewErrorBox: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(184,84,80,0.9)',
    borderRadius: 10,
    padding: 12,
  },
  previewErrorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textOnDark,
    textAlign: 'center',
  },
  identifyingContainer: {
    flex: 1,
    backgroundColor: Colors.soil,
  },
  identifyingImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  identifyingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  identifyingText: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 18,
    color: Colors.textOnDark,
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
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 16,
  },
  modalTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 20,
    color: Colors.soil,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    backgroundColor: Colors.parchment,
    borderRadius: 12,
    padding: 12,
  },
  modalTipText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.soil,
    flex: 1,
  },
  modalTipBold: {
    fontFamily: 'DMSans_600SemiBold',
  },
  limitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  limitModalContent: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 16,
  },
  limitModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitModalTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 20,
    color: Colors.soil,
    textAlign: 'center',
  },
  limitModalBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.bark,
    textAlign: 'center',
    lineHeight: 21,
  },
  permissionDeniedContainer: {
    flex: 1,
    backgroundColor: Colors.parchment,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  permissionDeniedTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: Colors.soil,
    textAlign: 'center',
  },
  permissionDeniedSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.bark,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
});
