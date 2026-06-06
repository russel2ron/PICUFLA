import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Linking } from 'react-native';
import { CameraView } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { permissionService, PermissionStatus } from '../services/permissionService';
import { identificationService } from '../services/identificationService';
import { getErrorMessage } from '../utils/errorHandler';
import type { ScanStackParamList } from '../types';

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
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

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
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      setCapturedUri(photo.uri);
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
      navigation.navigate('IdentificationResult', { result, capturedImageUri: capturedUri });
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
            </View>
          </CameraView>
          <View style={styles.bottomPanel}>
            <Text style={styles.panelTitle}>Identify a Plant</Text>
            <Text style={styles.panelSubtitle}>Frame the plant clearly. Works best in natural light.</Text>

            <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto} activeOpacity={0.8}>
              <Feather name="camera" size={28} color={Colors.textOnDark} />
            </TouchableOpacity>

            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color={Colors.green600} />
              <Text style={styles.locationText}>{locationLabel || 'Location off'}</Text>
            </View>

            <View style={styles.tipsRow}>
              <View style={styles.tipChip}>
                <Feather name="sun" size={12} color={Colors.bark} />
                <Text style={styles.tipText}>Good lighting</Text>
              </View>
              <View style={styles.tipChip}>
                <Feather name="crosshair" size={12} color={Colors.bark} />
                <Text style={styles.tipText}>Clear focus</Text>
              </View>
              <View style={styles.tipChip}>
                <Feather name="camera" size={12} color={Colors.bark} />
                <Text style={styles.tipText}>Hold steady</Text>
              </View>
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
            <TouchableOpacity style={styles.identifyButton} onPress={handleIdentify} activeOpacity={0.8}>
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
    fontSize: 22,
    color: Colors.soil,
    marginBottom: 4,
  },
  panelSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.bark,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  captureButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.green700,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.parchment,
    shadowColor: Colors.green300,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 16,
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
  tipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.stone,
    backgroundColor: Colors.parchment,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tipText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.bark,
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
