import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert,
  Animated, PanResponder, Dimensions, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Input from '../components/Input';
import SectionLabel from '../components/SectionLabel';
import { useAuthStore } from '../store/authStore';
import { identificationService } from '../services/identificationService';
import { plantService } from '../services/plantService';
import { getErrorMessage } from '../utils/errorHandler';
import * as Location from 'expo-location';
import type { ScanStackParamList, IdentificationResult, PlantAlternative } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_IMAGE_HEIGHT = 80;
const MAX_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.55;

type Props = {
  navigation: StackNavigationProp<ScanStackParamList, 'IdentificationResult'>;
  route: { params: { result: IdentificationResult; capturedImageUri: string; imageSource?: 'camera' | 'gallery' } };
};

export default function IdentificationResultScreen({ navigation, route }: Props) {
  const { result, capturedImageUri, imageSource } = route.params;
  const user = useAuthStore((s) => s.user);
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [displayLocation, setDisplayLocation] = useState<string | null>(null);

  const imageHeight = useRef(new Animated.Value(220)).current;
  const lastImageHeight = useRef(220);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const newHeight = lastImageHeight.current + gesture.dy;
        const clamped = Math.max(MIN_IMAGE_HEIGHT, Math.min(MAX_IMAGE_HEIGHT, newHeight));
        imageHeight.setValue(clamped);
      },
      onPanResponderRelease: (_, gesture) => {
        const proposed = lastImageHeight.current + gesture.dy;
        let snap: number;
        if (proposed < 140) {
          snap = MIN_IMAGE_HEIGHT;
        } else if (proposed > 280) {
          snap = MAX_IMAGE_HEIGHT;
        } else {
          snap = 220;
        }
        Animated.spring(imageHeight, {
          toValue: snap,
          useNativeDriver: false,
          friction: 8,
        }).start();
        lastImageHeight.current = snap;
      },
    })
  ).current;

  const identified = (result as any).identified !== undefined
    ? (result as any).identified
    : result.scientific_name.length > 0;

  const activeResult = selectedAlternative
    ? {
        ...result,
        common_name: selectedAlternative,
        scientific_name: result.alternatives?.find((a) => a.common_name === selectedAlternative)?.scientific_name ?? result.scientific_name,
        confidence_score: result.alternatives?.find((a) => a.common_name === selectedAlternative)?.confidence_score ?? result.confidence_score,
      }
    : result;

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const isDuplicate = await identificationService.checkDuplicate(user.id, activeResult.scientific_name);
      if (isDuplicate) {
        Alert.alert(
          'Already in Collection',
          'This plant is already in your collection.',
          [
            { text: 'Add Again', onPress: () => proceedSave() },
            {
              text: 'View Existing',
              onPress: () => {
                const parentNav = navigation.getParent();
                if (parentNav) {
                  (parentNav as any).navigate('CollectionTab');
                }
              },
            },
          ]
        );
      } else {
        proceedSave();
      }
    } catch {
      proceedSave();
    } finally {
      setIsSaving(false);
    }
  };

  const proceedSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const capturedImageUrl = await plantService.uploadPlantImage(user.id, capturedImageUri);
      const plantId = await plantService.upsertPlantCatalog(activeResult);

      let locationLat: number | null = null;
      let locationLng: number | null = null;
      let locationLabel: string | null = null;
      if (imageSource !== 'gallery') {
        try {
          const locPermission = await Location.requestForegroundPermissionsAsync();
          if (locPermission.granted) {
            const pos = await Location.getCurrentPositionAsync({});
            locationLat = pos.coords.latitude;
            locationLng = pos.coords.longitude;
            locationLabel = await plantService.getLocationLabel(locationLat, locationLng);
            setDisplayLocation(locationLabel);
          }
        } catch {}
      }

      const newId = await plantService.saveUserPlant({
        userId: user.id,
        plantId,
        capturedImageUrl,
        confidenceScore: activeResult.confidence_score,
        locationLat,
        locationLng,
        locationLabel,
        notes: notes.trim() || null,
      });

      navigation.reset({ index: 0, routes: [{ name: 'Scan' }] });
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroWrapper}>
        <Animated.View style={[styles.heroSection, { height: imageHeight }]}>
          <Image source={{ uri: capturedImageUri }} style={styles.heroImage} />
          {!identified && (
            <View style={styles.notIdentifiedOverlay}>
              <Text style={styles.notIdentifiedText}>Could not identify plant</Text>
            </View>
          )}
          {identified && (
            <View style={styles.confidenceBadge}>
              <Badge variant="confidence" confidence={activeResult.confidence_score} />
            </View>
          )}
        </Animated.View>
      </View>
      {!identified && (
        <View style={styles.notIdentifiedPanel}>
          <Text style={styles.notIdentifiedPanelText}>
            We could not identify this plant. Try taking another photo with better lighting.
          </Text>
          <Button title="Retake Photo" onPress={() => navigation.navigate('Scan')} />
        </View>
      )}

      {identified && (
        <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsContent} bounces={false}>
          <View style={styles.dragHandle} {...panResponder.panHandlers}>
            <View style={styles.dragOval} />
          </View>
          <Text style={styles.commonName} numberOfLines={2}>{activeResult.common_name}</Text>
          <Text style={styles.scientificName} numberOfLines={1}>{activeResult.scientific_name}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagPillsScroll}>
            <View style={styles.tagPillsRow}>
              <View style={styles.tagPill}>
                <Text style={styles.tagPillText}>{activeResult.care_watering}</Text>
              </View>
              <View style={styles.tagPill}>
                <Text style={styles.tagPillText}>{activeResult.care_sunlight}</Text>
              </View>
            </View>
          </ScrollView>

          {activeResult.confidence_score < 0.6 && result.alternatives && result.alternatives.length > 0 && (
            <View style={styles.alternativesSection}>
              <Text style={styles.alternativesLabel}>Not confident? Pick the best match:</Text>
              <View style={styles.alternativesList}>
                <TouchableOpacity
                  style={[styles.alternativeRow, selectedAlternative === result.common_name && styles.alternativeRowSelected]}
                  onPress={() => setSelectedAlternative(result.common_name)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioCircle, selectedAlternative === result.common_name && styles.radioCircleSelected]} />
                  <View style={styles.alternativeInfo}>
                    <Text style={styles.alternativeCommonName}>{result.common_name}</Text>
                    <Text style={styles.alternativeScientificName}>{result.scientific_name}</Text>
                  </View>
                  <Text style={styles.alternativeConfidence}>{Math.round(result.confidence_score * 100)}%</Text>
                </TouchableOpacity>
                {result.alternatives.map((alt) => (
                  <TouchableOpacity
                    key={alt.scientific_name}
                    style={[styles.alternativeRow, selectedAlternative === alt.common_name && styles.alternativeRowSelected]}
                    onPress={() => setSelectedAlternative(alt.common_name)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radioCircle, selectedAlternative === alt.common_name && styles.radioCircleSelected]} />
                    <View style={styles.alternativeInfo}>
                      <Text style={styles.alternativeCommonName}>{alt.common_name}</Text>
                      <Text style={styles.alternativeScientificName}>{alt.scientific_name}</Text>
                    </View>
                    <Text style={styles.alternativeConfidence}>{Math.round(alt.confidence_score * 100)}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <SectionLabel label="Care Guide" />
          <View style={styles.careBook}>
            <View style={styles.careBookRow}>
              <View style={styles.careBookIcon}>
                <Feather name="droplet" size={16} color={Colors.green600} />
              </View>
              <View style={styles.careBookContent}>
                <Text style={styles.careBookLabel}>Watering</Text>
                <Text style={styles.careBookValue}>{activeResult.care_watering}</Text>
              </View>
            </View>
            <View style={styles.careBookDivider} />
            <View style={styles.careBookRow}>
              <View style={styles.careBookIcon}>
                <Feather name="sun" size={16} color={Colors.terra} />
              </View>
              <View style={styles.careBookContent}>
                <Text style={styles.careBookLabel}>Sunlight</Text>
                <Text style={styles.careBookValue}>{activeResult.care_sunlight}</Text>
              </View>
            </View>
            <View style={styles.careBookDivider} />
            <View style={styles.careBookRow}>
              <View style={styles.careBookIcon}>
                <Feather name="layers" size={16} color={Colors.bark} />
              </View>
              <View style={styles.careBookContent}>
                <Text style={styles.careBookLabel}>Soil</Text>
                <Text style={styles.careBookValue}>{activeResult.care_soil}</Text>
              </View>
            </View>
          </View>

          <SectionLabel label="Notes" />
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about this plant…"
            multiline
          />

          <View style={styles.locationRow}>
            <Feather name="map-pin" size={14} color={Colors.green600} />
            <Text style={styles.locationText}>{displayLocation || 'Location not recorded'}</Text>
          </View>
        </ScrollView>
      )}

      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={Colors.textOnDark} />
          <Text style={styles.savingText}>Saving to collection…</Text>
        </View>
      )}

      {identified && (
        <View style={styles.bottomButtons}>
          <Button
            title="Retake"
            variant="secondary"
            onPress={() => navigation.navigate('Scan')}
            style={styles.bottomBtnHalf}
          />
          <Button
            title="Save to Collection"
            onPress={handleSave}
            loading={isSaving}
            disabled={!!(activeResult.confidence_score < 0.6 && result.alternatives && result.alternatives.length > 0 && !selectedAlternative)}
            style={styles.bottomBtnHalf}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.soil,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    gap: 16,
  },
  savingText: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 18,
    color: Colors.textOnDark,
  },
  heroWrapper: {
    position: 'relative',
    zIndex: 5,
    overflow: 'visible',
  },
  heroSection: {
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  dragOval: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.stone,
  },
  detailsScroll: {
    flex: 1,
    backgroundColor: Colors.linen,
  },
  detailsContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  notIdentifiedOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(74, 63, 53, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notIdentifiedText: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 20,
    color: Colors.textOnDark,
    textAlign: 'center',
  },
  notIdentifiedPanel: {
    flex: 1,
    backgroundColor: Colors.linen,
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
    gap: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    zIndex: 2,
  },
  notIdentifiedPanelText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.bark,
    textAlign: 'center',
    lineHeight: 24,
  },
  confidenceBadge: {
    position: 'absolute',
    top: 48,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: Colors.soil,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  commonName: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 30,
    color: Colors.soil,
    marginBottom: 4,
  },
  scientificName: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 18,
    fontStyle: 'italic',
    color: Colors.bark,
    marginBottom: 16,
  },
  tagPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tagPill: {
    backgroundColor: Colors.lavenderLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  tagPillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.lavender,
  },
  alternativesSection: {
    marginBottom: 20,
  },
  alternativesLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.bark,
    marginBottom: 10,
  },
  alternativesList: {
    gap: 8,
  },
  alternativeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.stone,
    padding: 12,
    gap: 10,
  },
  alternativeRowSelected: {
    borderColor: Colors.green600,
    borderWidth: 1.5,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.stone,
  },
  radioCircleSelected: {
    borderColor: Colors.green600,
    backgroundColor: Colors.green600,
  },
  alternativeInfo: {
    flex: 1,
  },
  alternativeCommonName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: Colors.soil,
  },
  alternativeScientificName: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.bark,
  },
  alternativeConfidence: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: Colors.green700,
  },
  careBook: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.stone,
    marginBottom: 24,
    overflow: 'hidden',
  },
  careBookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  careBookIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.parchment,
    justifyContent: 'center',
    alignItems: 'center',
  },
  careBookContent: {
    flex: 1,
  },
  careBookLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.bark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  careBookValue: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.soil,
    lineHeight: 20,
  },
  careBookDivider: {
    height: 1,
    backgroundColor: Colors.stone,
    marginHorizontal: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.bark,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    paddingBottom: 36,
    gap: 12,
    backgroundColor: Colors.parchment,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: Colors.soil,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomBtnHalf: {
    width: 140,
  },
  tagPillsScroll: {
    marginBottom: 20,
  },
});
