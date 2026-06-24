import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator,
  Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';
import { Config } from '../constants/config';
import Badge from '../components/Badge';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingScreen from '../components/LoadingScreen';
import SectionLabel from '../components/SectionLabel';
import { supabase } from '../services/supabase';
import { plantService } from '../services/plantService';
import type { CollectionStackParamList, UserPlant } from '../types';

type Props = {
  navigation: StackNavigationProp<CollectionStackParamList, 'PlantDetail'>;
  route: { params: { userPlantId: string } };
};

export default function PlantDetailScreen({ navigation, route }: Props) {
  const { userPlantId } = route.params;
  const [plant, setPlant] = useState<UserPlant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [savingTag, setSavingTag] = useState(false);

  const tagInputRef = useRef<TextInput>(null);

  const fetchPlant = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_plants')
        .select('*, plant:plants(*)')
        .eq('id', userPlantId)
        .single();
      if (error) throw error;
      if (data) {
        setPlant(data as UserPlant);
        setIsFavorite((data as UserPlant).is_favorite);
        setNotes((data as UserPlant).notes ?? '');
        setTags((data as UserPlant).tags ?? []);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load plant details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [userPlantId, navigation]);

  useEffect(() => {
    fetchPlant();
  }, [fetchPlant]);

  const handleToggleFavorite = async () => {
    if (!plant) return;
    const prev = isFavorite;
    setIsFavorite(!prev);
    try {
      await plantService.toggleFavorite(plant.id, !prev);
    } catch {
      setIsFavorite(prev);
    }
  };

  const handleSaveNotes = async () => {
    if (!plant) return;
    setSavingNotes(true);
    try {
      await plantService.updateNotes(plant.id, notes);
      setNotesEditing(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (!plant) return;
    Alert.alert('Remove Tag', `Remove "${tag}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = tags.filter((t) => t !== tag);
          setTags(updated);
          try {
            await plantService.updateTags(plant.id, updated);
          } catch {
            setTags(tags);
          }
        },
      },
    ]);
  };

  const handleAddTag = async () => {
    if (!plant || !newTag.trim()) return;
    const normalized = newTag.trim().toLowerCase();
    if (tags.includes(normalized)) {
      setNewTag('');
      setAddingTag(false);
      return;
    }
    if (tags.length >= Config.MAX_TAGS_PER_PLANT) {
      Alert.alert('Limit Reached', `Maximum ${Config.MAX_TAGS_PER_PLANT} tags allowed.`);
      return;
    }
    setSavingTag(true);
    const updated = [...tags, normalized];
    setTags(updated);
    try {
      await plantService.updateTags(plant.id, updated);
      setNewTag('');
      setAddingTag(false);
    } catch {
      setTags(tags);
    } finally {
      setSavingTag(false);
    }
  };

  const handleDelete = () => {
    if (!plant) return;
    Alert.alert(
      'Delete Plant',
      'Are you sure you want to remove this plant from your collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await plantService.softDeleteUserPlant(plant.id);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete plant.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <LoadingScreen message="Loading plant details..." />;
  }

  if (!plant) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorMessage}>Plant not found.</Text>
      </View>
    );
  }

  const p = plant.plant;
  if (!p) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorMessage}>Plant data not found.</Text>
      </View>
    );
  }
  const notesUpdated = plant.notes_updated_at
    ? (() => {
        const d = new Date(plant.notes_updated_at);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return d.toLocaleDateString();
      })()
    : null;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroSection}>
          {plant.captured_image_url ? (
            <Image source={{ uri: plant.captured_image_url }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Feather name="feather" size={48} color={Colors.green300} />
            </View>
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Feather name="arrow-left" size={18} color={Colors.textOnDark} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.favoriteButton} onPress={handleToggleFavorite} activeOpacity={0.7}>
            <Feather
              name="heart"
              size={18}
              color={isFavorite ? Colors.blushDark : Colors.textOnDark}
              style={isFavorite ? undefined : { opacity: 0.8 }}
            />
          </TouchableOpacity>

          {plant.location_label && (
            <View style={styles.locationPill}>
              <Feather name="map-pin" size={12} color={Colors.textOnDark} />
              <Text style={styles.locationPillText} numberOfLines={1}>{plant.location_label}</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.nameSection}>
            <Text style={styles.commonName} numberOfLines={2}>{p.common_name}</Text>
            <View style={styles.scientificRow}>
              <Text style={styles.scientificName} numberOfLines={1}>{p.scientific_name}</Text>
              <Badge variant="confidence" confidence={plant.confidence_score} />
            </View>
          </View>

          <Text style={styles.description} numberOfLines={4}>{p.description}</Text>

          <SectionLabel label="Care Guide" />
          <View style={styles.careList}>
            {[
              { icon: 'droplet' as const, label: 'WATERING', value: p.care_watering },
              { icon: 'sun' as const, label: 'SUNLIGHT', value: p.care_sunlight },
              { icon: 'layers' as const, label: 'SOIL', value: p.care_soil },
              { icon: 'box' as const, label: 'USES', value: p.uses },
            ].map((item) => (
              <View key={item.label} style={styles.careRow}>
                <View style={styles.careIcon}>
                  <Feather name={item.icon} size={16} color={Colors.green700} />
                </View>
                <View style={styles.careContent}>
                  <Text style={styles.careLabel}>{item.label}</Text>
                  <Text style={styles.careValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <SectionLabel label="My Notes" />
          <View style={styles.notesCard}>
            {notesEditing ? (
              <>
                <Input
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  maxLength={Config.MAX_NOTES_LENGTH}
                  autoFocus
                />
                <View style={styles.notesFooter}>
                  <Text style={styles.notesCounter}>{notes.length} / {Config.MAX_NOTES_LENGTH}</Text>
                  <Button
                    title="Save"
                    onPress={handleSaveNotes}
                    loading={savingNotes}
                    style={styles.notesSaveBtn}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.notesViewHeader}>
                  <Text style={styles.notesText}>
                    {plant.notes || 'Tap to add your observations\u2026'}
                  </Text>
                  <TouchableOpacity onPress={() => setNotesEditing(true)} activeOpacity={0.7}>
                    <Text style={styles.notesEditButton}>Edit</Text>
                  </TouchableOpacity>
                </View>
                {notesUpdated && (
                  <View style={styles.notesMeta}>
                    <Feather name="edit-3" size={12} color={Colors.bark} />
                    <Text style={styles.notesMetaText}>Last edited {notesUpdated}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          <SectionLabel label="Tags" />
          <View style={styles.tagsWrap}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
                <TouchableOpacity onPress={() => handleRemoveTag(tag)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={12} color={Colors.lavender} />
                </TouchableOpacity>
              </View>
            ))}
            {addingTag ? (
              <View style={styles.tagInputRow}>
                <TextInput
                  ref={tagInputRef}
                  style={styles.tagInput}
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder="Type tag..."
                  placeholderTextColor={Colors.bark}
                  autoFocus
                  onBlur={() => {
                    if (!newTag.trim()) setAddingTag(false);
                  }}
                  onSubmitEditing={handleAddTag}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={handleAddTag} disabled={savingTag || !newTag.trim()} activeOpacity={0.7}>
                  <Feather name="check" size={16} color={Colors.green700} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addTagChip}
                onPress={() => {
                  setAddingTag(true);
                  setTimeout(() => tagInputRef.current?.focus(), 100);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.addTagText}>+ Add tag</Text>
              </TouchableOpacity>
            )}
          </View>

          <SectionLabel label="Reminders" />
          <TouchableOpacity
            style={styles.reminderCard}
            onPress={() => navigation.navigate('Reminders', { userPlantId: plant.id, commonName: p.common_name })}
            activeOpacity={0.7}
          >
            <Feather name="bell" size={18} color={Colors.green700} />
            <View style={styles.reminderContent}>
              <Text style={styles.reminderText}>No reminders set</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.bark} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.7}>
            <Text style={styles.deleteButtonText}>Delete Plant</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
  errorMessage: {
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
  heroSection: {
    height: 220,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.linen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 32,
    height: 32,
    borderRadius: Theme.radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: Theme.radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationPill: {
    position: 'absolute',
    bottom: 15,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Theme.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  locationPillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.textOnDark,
  },
  body: {
    padding: 16,
    gap: 16,
  },
  nameSection: {
    gap: 2,
  },
  commonName: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.soil,
  },
  scientificRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  scientificName: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 16,
    fontStyle: 'italic',
    color: Colors.bark,
  },
  description: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.bark,
    lineHeight: 21,
    marginBottom: 2,
  },
  careList: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.stone,
    borderRadius: 16,
    overflow: 'hidden',
  },
  careRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.stone,
    gap: 12,
  },
  careIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.green100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  careContent: {
    flex: 1,
  },
  careLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: Colors.bark,
    textTransform: 'uppercase',
  },
  careValue: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12.5,
    color: Colors.soil,
  },
  notesCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.stone,
    borderRadius: 16,
    padding: 12,
  },
  notesViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notesText: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.bark,
    lineHeight: 20,
  },
  notesEditButton: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: Colors.green700,
    marginLeft: 8,
  },
  notesMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  notesMetaText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10.5,
    color: Colors.bark,
  },
  notesFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  notesCounter: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10.5,
    color: Colors.bark,
  },
  notesSaveBtn: {
    height: 30,
    paddingHorizontal: 14,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.lavenderLight,
    borderWidth: 1,
    borderColor: Colors.lavender,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.lavender,
  },
  addTagChip: {
    borderWidth: 1,
    borderColor: Colors.stone,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addTagText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.bark,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.green600,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  tagInput: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.soil,
    padding: 0,
    height: 24,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.terraLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.green400,
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  reminderContent: {
    flex: 1,
  },
  reminderText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.soil,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  deleteButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.bark,
  },
});
