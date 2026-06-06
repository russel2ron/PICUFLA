import React, { useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Image, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';
import { useCollectionStore } from '../store/collectionStore';
import type { CollectionStackParamList, UserPlant } from '../types';

type Props = {
  navigation: StackNavigationProp<CollectionStackParamList, 'Collection'>;
};

export default function FavoritesScreen({ navigation }: Props) {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const plants = useCollectionStore((s) => s.plants);

  const favorites = useMemo(
    () => plants.filter((p) => p.is_favorite && !p.is_deleted),
    [plants],
  );

  const renderPlant = useCallback(
    ({ item }: { item: UserPlant }) => {
      const tags = item.tags ?? [];
      const visibleTags = tags.slice(0, 3);
      const extraCount = tags.length - 3;

      const dateStr = new Date(item.discovered_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      return (
        <TouchableOpacity
          style={styles.plantCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PlantDetail', { userPlantId: item.id })}
        >
          <View style={styles.plantImageArea}>
            {item.captured_image_url ? (
              <Image source={{ uri: item.captured_image_url }} style={styles.plantImage} />
            ) : (
              <View style={styles.plantImagePlaceholder} />
            )}
            <View style={styles.favoriteBadge}>
              <Feather name="heart" size={12} color={Colors.blushDark} />
            </View>
          </View>
          <View style={styles.plantInfo}>
            <Text style={styles.plantCommonName} numberOfLines={1}>
              {item.plant?.common_name ?? 'Unknown Plant'}
            </Text>
            <Text style={styles.plantScientificName} numberOfLines={1}>
              {item.plant?.scientific_name ?? ''}
            </Text>
            <View style={styles.plantDateRow}>
              <Feather name="clock" size={11} color={Colors.green500} />
              <Text style={styles.plantDateText}>{dateStr}</Text>
            </View>
            {tags.length > 0 && (
              <View style={styles.plantTagsRow}>
                {visibleTags.map((tag) => (
                  <View key={tag} style={styles.plantTagChip}>
                    <Text style={styles.plantTagText}>{tag}</Text>
                  </View>
                ))}
                {extraCount > 0 && (
                  <Text style={styles.plantTagExtra}>+{extraCount}</Text>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [navigation],
  );

  const keyExtractor = useCallback((item: UserPlant) => item.id, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.green700} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="heart" size={64} color={Colors.blush} />
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptySubtitle}>Heart a plant to save it here.</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderPlant}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.plantGridRow}
          contentContainerStyle={styles.plantGrid}
          showsVerticalScrollIndicator={false}
        />
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
    backgroundColor: Colors.parchment,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.soil,
  },
  plantGrid: {
    padding: 14,
    paddingTop: 0,
  },
  plantGridRow: {
    gap: 9,
    marginBottom: 9,
  },
  plantCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    ...Theme.shadow.sm,
  },
  plantImageArea: {
    height: 100,
    backgroundColor: Colors.linen,
    position: 'relative',
  },
  plantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  plantImagePlaceholder: {
    flex: 1,
    backgroundColor: Colors.linen,
  },
  favoriteBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantInfo: {
    padding: 9,
    gap: 3,
  },
  plantCommonName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12.5,
    color: Colors.soil,
  },
  plantScientificName: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 10,
    fontStyle: 'italic',
    color: Colors.bark,
  },
  plantDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  plantDateText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: Colors.bark,
  },
  plantTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  plantTagChip: {
    backgroundColor: Colors.lavenderLight,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  plantTagText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 9,
    color: Colors.lavender,
  },
  plantTagExtra: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 9,
    color: Colors.lavender,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: Colors.soil,
  },
  emptySubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.bark,
    textAlign: 'center',
  },
});
