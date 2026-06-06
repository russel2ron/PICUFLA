import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../store/authStore';
import { identificationService } from '../services/identificationService';
import type { ScanStackParamList, IdentificationResult, PlantAlternative } from '../types';

type Props = {
  navigation: StackNavigationProp<ScanStackParamList, 'IdentificationResult'>;
  route: { params: { result: IdentificationResult; capturedImageUri: string } };
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const high = confidence >= 0.8;
  const medium = confidence >= 0.6 && confidence < 0.8;
  const low = confidence < 0.6;

  const bgColor = high ? Colors.green100 : medium ? Colors.warningBg : Colors.terraLight;
  const textColor = high ? Colors.green700 : medium ? Colors.warning : Colors.terra;
  const iconName = high ? 'check' : medium ? 'alert-triangle' : 'help-circle';
  const percent = Math.round(confidence * 100);

  return (
    <View style={[styles.confidenceBadge, { backgroundColor: bgColor }]}>
      <Feather name={iconName} size={14} color={textColor} />
      <Text style={[styles.confidenceText, { color: textColor }]}>{percent}% match</Text>
    </View>
  );
}

export default function IdentificationResultScreen({ navigation, route }: Props) {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const { result, capturedImageUri } = route.params;
  const user = useAuthStore((s) => s.user);
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const proceedSave = () => {
    console.log('Save triggered');
    setIsSaving(false);
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.green700} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={styles.heroSection}>
          <Image source={{ uri: capturedImageUri }} style={styles.heroImage} />
          {!identified && (
            <View style={styles.notIdentifiedOverlay}>
              <Text style={styles.notIdentifiedText}>Could not identify plant</Text>
            </View>
          )}
          {identified && <ConfidenceBadge confidence={activeResult.confidence_score} />}
          {!identified && (
            <View style={styles.notIdentifiedPanel}>
              <Text style={styles.notIdentifiedPanelText}>
                We could not identify this plant. Try taking another photo with better lighting.
              </Text>
            </View>
          )}
        </View>

        {identified && (
          <View style={styles.resultBody}>
            <Text style={styles.commonName}>{activeResult.common_name}</Text>
            <Text style={styles.scientificName}>{activeResult.scientific_name}</Text>

            <View style={styles.tagPillsRow}>
              <View style={styles.tagPill}>
                <Text style={styles.tagPillText}>{activeResult.care_watering}</Text>
              </View>
              <View style={styles.tagPill}>
                <Text style={styles.tagPillText}>{activeResult.care_sunlight}</Text>
              </View>
            </View>

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

            <Text style={styles.sectionLabel}>Care Guide</Text>
            <View style={styles.careCardsGrid}>
              <View style={styles.careCard}>
                <Feather name="droplet" size={20} color={Colors.green600} />
                <Text style={styles.careCardLabel}>WATERING</Text>
                <Text style={styles.careCardValue}>{activeResult.care_watering}</Text>
              </View>
              <View style={styles.careCard}>
                <Feather name="sun" size={20} color={Colors.terra} />
                <Text style={styles.careCardLabel}>SUNLIGHT</Text>
                <Text style={styles.careCardValue}>{activeResult.care_sunlight}</Text>
              </View>
              <View style={styles.careCard}>
                <Feather name="layers" size={20} color={Colors.bark} />
                <Text style={styles.careCardLabel}>SOIL</Text>
                <Text style={styles.careCardValue}>{activeResult.care_soil}</Text>
              </View>
            </View>

            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color={Colors.green600} />
              <Text style={styles.locationText}>Location not recorded</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {identified && (
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.bottomRetakeButton}
            onPress={() => navigation.navigate('Scan')}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomRetakeText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.bottomSaveButton,
              (activeResult.confidence_score < 0.6 && result.alternatives && result.alternatives.length > 0 && !selectedAlternative) ? styles.bottomSaveButtonDisabled : null,
            ]}
            onPress={handleSave}
            disabled={
              (activeResult.confidence_score < 0.6 && result.alternatives && result.alternatives.length > 0 && !selectedAlternative) || isSaving
            }
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.textOnDark} />
            ) : (
              <Text style={styles.bottomSaveText}>Save to Collection</Text>
            )}
          </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  heroSection: {
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 220,
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
    backgroundColor: Colors.linen,
    padding: 16,
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
  },
  notIdentifiedPanelText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.bark,
    textAlign: 'center',
  },
  confidenceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  confidenceText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
  },
  resultBody: {
    backgroundColor: Colors.linen,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  commonName: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.soil,
    marginBottom: 4,
  },
  scientificName: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 16,
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
    fontSize: 11,
    color: Colors.lavender,
  },
  alternativesSection: {
    marginBottom: 20,
  },
  alternativesLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
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
    fontSize: 13,
    color: Colors.soil,
  },
  alternativeScientificName: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    fontStyle: 'italic',
    color: Colors.bark,
  },
  alternativeConfidence: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: Colors.green700,
  },
  sectionLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.bark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  careCardsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  careCard: {
    flex: 1,
    backgroundColor: Colors.linen,
    borderWidth: 1,
    borderColor: Colors.stone,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  careCardLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 9.5,
    color: Colors.bark,
    textTransform: 'uppercase',
  },
  careCardValue: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: Colors.soil,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.bark,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 36,
    gap: 12,
    backgroundColor: Colors.parchment,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomRetakeButton: {
    width: '42%',
    backgroundColor: Colors.card,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.stone,
  },
  bottomRetakeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.soil,
  },
  bottomSaveButton: {
    width: '54%',
    backgroundColor: Colors.green700,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSaveButtonDisabled: {
    opacity: 0.5,
  },
  bottomSaveText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.textOnDark,
  },
});
