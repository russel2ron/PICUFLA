import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Linking, Modal } from 'react-native';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Config } from '../constants/config';
import { permissionService, PermissionStatus } from '../services/permissionService';
import { identificationService } from '../services/identificationService';
import { getErrorMessage } from '../utils/errorHandler';
import type { ScanStackParamList } from '../types';

const SCAN_COUNT_KEY = '@picufla_scan_count';
const RATE_LIMIT = 5;

type ViewState = 'viewfinder' | 'preview' | 'identifying';

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
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => Linking.openSettings()}
        activeOpacity={0.8}
      >
        <Text style={styles.settingsButtonText}>Open Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ScanScreen({ navigation }: Props) {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const [viewState, setViewState] = useState<ViewState>('viewfinder');
  const [cameraPermission, setCameraPermission] = useState<PermissionStatus>('undetermined');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<'camera' | 'gallery' | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tipsVisible, setTipsVisible] = useState(true);
  const [remainingCount, setRemainingCount] = useState(RATE_LIMIT);
  const [limitModalVisible, setLimitModalVisible] = useState(false);
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
    })();

    (async () => {
      try {
        const locStatus = await permissionService.getLocationStatus();
        if (locStatus === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          const address = await Location.reverseGeocodeAsync(pos.coords);
          if (address.length > 0) {
            const a = address[0];
            const parts = [a.city, a.region, a.country].filter(Boolean);
            setLocationLabel(parts.join(', ') || 'Unknown location');
          }
        }
      } catch {}
    })();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.green700} />
      </View>
    );
  }

  if (cameraPermission === 'denied') {
    return <PermissionDeniedView />;
  }

  const handleTakePhoto = async () => {
    if (remainingCount === 0) { setLimitModalVisible(true); return; }
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      setCapturedUri(photo.uri);
      setImageSource('camera');
      setViewState('preview');
      setErrorMessage(null);
    } catch {}
  };

  const handleIdentify = async () => {
    if (!capturedUri) return;

    (async () => {
      try {
        const locStatus = await permissionService.getLocationStatus();
        if (locStatus === 'undetermined') {
          await permissionService.requestLocation();
        }
        const updatedStatus = await permissionService.getLocationStatus();
        if (updatedStatus === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          const address = await Location.reverseGeocodeAsync(pos.coords);
          if (address.length > 0) {
            const a = address[0];
            const parts = [a.city, a.region, a.country].filter(Boolean);
            setLocationLabel(parts.join(', ') || 'Unknown location');
          }
        }
      } catch {}
    })();

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

  return (
    <View style={styles.container}>
      {viewState === 'viewfinder' && (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" flash="off">
            <View style={styles.cornerOverlay}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
              <TouchableOpacity style={styles.tipsChip} onPress={() => setTipsVisible(true)} activeOpacity={0.8}>
                <Feather name="info" size={16} color={Colors.green700} />
                <Text style={styles.tipsChipText}>Tips</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
          <View style={styles.bottomPanel}>
            <Text style={styles.panelTitle}>Identify a Plant</Text>
            <Text style={styles.panelSubtitle}>Frame the plant clearly. Works best in natural light.</Text>

            <View style={styles.captureRow}>
              <TouchableOpacity
                style={[styles.galleryButton, remainingCount === 0 && styles.galleryButtonDisabled]}
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
              >
                <Feather name="image" size={24} color={remainingCount === 0 ? Colors.textDisabled : Colors.soil} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.captureButton, remainingCount === 0 && styles.captureButtonDisabled]}
                onPress={handleTakePhoto}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={28} color={remainingCount === 0 ? Colors.textDisabled : Colors.textOnDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color={Colors.green600} />
              <Text style={styles.locationText}>{locationLabel || 'Location off'}</Text>
            </View>

            <View style={[styles.remainingChip, remainingCount === 0 && styles.remainingChipEmpty]}>
              <Feather name="activity" size={13} color={remainingCount === 0 ? Colors.error : Colors.green600} />
              <Text style={[styles.remainingText, remainingCount === 0 && styles.remainingTextEmpty]}>
                {remainingCount}/{RATE_LIMIT} identifications remaining
              </Text>
            </View>
          </View>
        </>
      )}

      {viewState === 'preview' && capturedUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} />
          <View style={styles.previewButtons}>
            <TouchableOpacity style={styles.retakeButton} onPress={handleRetake} activeOpacity={0.8}>
              <Text style={styles.retakeButtonText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.identifyButton, remainingCount === 0 && styles.identifyButtonDisabled]}
              onPress={handleIdentify}
              disabled={remainingCount === 0}
              activeOpacity={0.8}
            >
              <Text style={styles.identifyButtonText}>Identify This Plant</Text>
            </TouchableOpacity>
          </View>
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
        </View>
      )}

      {viewState === 'identifying' && capturedUri && (
        <View style={styles.identifyingContainer}>
          <Image source={{ uri: capturedUri }} style={styles.identifyingImage} />
          <View style={styles.identifyingOverlay}>
            <ActivityIndicator size="large" color={Colors.green700} />
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
            <TouchableOpacity
              style={styles.modalGotItButton}
              onPress={() => setTipsVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalGotItText}>Got it!</Text>
            </TouchableOpacity>
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
            <TouchableOpacity
              style={styles.limitModalButton}
              onPress={() => setLimitModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.limitModalButtonText}>Got it</Text>
            </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: Colors.soil,
  },
  camera: {
    flex: 1,
  },
  cornerOverlay: {
    flex: 1,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 60,
    left: 24,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTopRight: {
    top: 60,
    right: 24,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBottomLeft: {
    bottom: 60,
    left: 24,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBottomRight: {
    bottom: 60,
    right: 24,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  bottomPanel: {
    backgroundColor: Colors.linen,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    alignItems: 'center',
  },
  panelTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 24,
    color: Colors.soil,
    marginBottom: 4,
  },
  panelSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.bark,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  captureButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.green700,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.green300,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  galleryButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.stone,
  },
  galleryButtonDisabled: {
    backgroundColor: Colors.linen,
    borderColor: Colors.stone,
    opacity: 0.6,
  },
  captureButtonDisabled: {
    backgroundColor: Colors.green400,
    opacity: 0.6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  locationText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.bark,
  },
  remainingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.green100,
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  remainingChipEmpty: {
    backgroundColor: Colors.errorBg,
  },
  remainingText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.green700,
  },
  remainingTextEmpty: {
    color: Colors.error,
  },
  identifyButtonDisabled: {
    opacity: 0.5,
  },
  tipsChip: {
    position: 'absolute',
    bottom: 15,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 10,
  },
  tipsChipText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: Colors.green700,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  previewImage: {
    width: '100%',
    height: 340,
  },
  previewButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.stone,
  },
  retakeButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.soil,
  },
  identifyButton: {
    flex: 2,
    backgroundColor: Colors.green700,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  identifyButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.textOnDark,
  },
  errorBox: {
    backgroundColor: Colors.errorBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    marginHorizontal: 20,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  identifyingContainer: {
    flex: 1,
    backgroundColor: Colors.soil,
  },
  identifyingImage: {
    width: '100%',
    height: 340,
  },
  identifyingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(237, 231, 218, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  identifyingText: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
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
  modalGotItButton: {
    backgroundColor: Colors.green700,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    alignSelf: 'stretch',
  },
  modalGotItText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.textOnDark,
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
  limitModalButton: {
    backgroundColor: Colors.green700,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  limitModalButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.textOnDark,
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
  settingsButton: {
    backgroundColor: Colors.green700,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.textOnDark,
  },
});
