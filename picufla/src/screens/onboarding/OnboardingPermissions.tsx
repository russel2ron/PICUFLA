import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { Colors } from '../../constants/colors';
import Button from '../../components/Button';
import type { OnboardingStackParamList } from '../../types';

type Props = {
  navigation: StackNavigationProp<OnboardingStackParamList, 'OnboardingPermissions'>;
};

export default function OnboardingPermissions({ navigation }: Props) {
  const [requesting, setRequesting] = useState(false);

  const handleAllow = async () => {
    setRequesting(true);
    try {
      const [cameraResult, mediaResult] = await Promise.all([
        Camera.requestCameraPermissionsAsync(),
        ImagePicker.requestMediaLibraryPermissionsAsync(),
      ]);

      if (!cameraResult.granted) {
        Alert.alert(
          'Camera Access',
          'You can enable camera access later in Settings to identify plants.',
        );
      }
      if (!mediaResult.granted) {
        Alert.alert(
          'Photo Library Access',
          'You can enable photo library access later in Settings to upload plant photos.',
        );
      }
    } catch {
      Alert.alert('Permission Error', 'Something went wrong. You can manage permissions in Settings.');
    } finally {
      setRequesting(false);
      navigation.navigate('OnboardingTerms');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.dots}>
          <View style={styles.dotInactive} />
          <View style={styles.dotInactive} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dotInactive} />
        </View>

        <Text style={styles.heading}>Almost there!</Text>
        <Text style={styles.subtitle}>
          PICUFLA needs a couple of permissions to help you identify and collect plants.
        </Text>

        <View style={styles.permissionsList}>
          <View style={styles.permissionRow}>
            <View style={styles.permissionIcon}>
              <Feather name="camera" size={20} color={Colors.green700} />
            </View>
            <View style={styles.permissionText}>
              <Text style={styles.permissionTitle}>Camera</Text>
              <Text style={styles.permissionDesc}>Snap photos of plants to identify them</Text>
            </View>
          </View>

          <View style={styles.permissionRow}>
            <View style={styles.permissionIcon}>
              <Feather name="image" size={20} color={Colors.green700} />
            </View>
            <View style={styles.permissionText}>
              <Text style={styles.permissionTitle}>Photo Library</Text>
              <Text style={styles.permissionDesc}>Upload existing plant photos from your gallery</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomArea}>
          <Button
            title="Allow Access"
            onPress={handleAllow}
            loading={requesting}
          />

          <Text
            style={styles.skipLink}
            onPress={() => navigation.navigate('OnboardingTerms')}
          >
            Skip for now
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.green700,
    width: 24,
  },
  dotInactive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.stone,
  },
  heading: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 26,
    color: Colors.soil,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.bark,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  permissionsList: {
    gap: 16,
  },
  permissionRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 14,
  },
  permissionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.green50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.soil,
  },
  permissionDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.bark,
    marginTop: 2,
    lineHeight: 18,
  },
  bottomArea: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  skipLink: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.bark,
    marginTop: 20,
  },
});
