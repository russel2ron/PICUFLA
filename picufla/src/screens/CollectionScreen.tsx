import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Image, TextInput,
  AppState, Modal, ScrollView, RefreshControl, Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import NetInfo from '@react-native-community/netinfo';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import OfflineBanner from '../components/OfflineBanner';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { useCollectionStore, getFilteredPlants } from '../store/collectionStore';
import { plantService } from '../services/plantService';
import { cacheService } from '../services/cacheService';
import { supabase } from '../services/supabase';
import type { CollectionStackParamList, UserPlant } from '../types';
type SortKey = 'newest' | 'oldest' | 'a-z' | 'z-a';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'a-z', label: 'A\u2013Z' },
  { key: 'z-a', label: 'Z\u2013A' },
];

type Props = {
  navigation: StackNavigationProp<CollectionStackParamList, 'Collection'>;
};

export default function CollectionScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const {
    plants, isLoading, searchQuery, sortOrder, filterTag,
    setPlants, setLoading, setSearchQuery, setSortOrder, setFilterTag,
  } = useCollectionStore();

  const [offline, setOffline] = useState(false);
  const [lastSync, setLastSync] = React.useState<Date | null>(null);
  const [appState, setAppState] = React.useState(AppState.currentState);
  const [refreshing, setRefreshing] = useState(false);

  const filteredPlants = useMemo(
    () => getFilteredPlants({ plants, searchQuery, sortOrder, filterTag }),
    [plants, searchQuery, sortOrder, filterTag],
  );

  const fetchPlants = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        setOffline(true);
        const cached = await cacheService.getPlants(user.id);
        setPlants(cached);
        const syncDate = await cacheService.getLastSyncDate(user.id);
        setLastSync(syncDate);
        return;
      }
      setOffline(false);
      const data = await plantService.getUserPlants(user.id);
      setPlants(data);
      await cacheService.savePlants(user.id, data);
      setLastSync(new Date());
    } catch {
      const cached = await cacheService.getPlants(user.id);
      if (cached.length > 0) {
        setPlants(cached);
        const syncDate = await cacheService.getLastSyncDate(user.id);
        setLastSync(syncDate);
      }
    } finally {
      setLoading(false);
    }
  }, [user, setPlants, setLoading]);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef<Animated.Value[]>([]).current;
  const getCardAnim = (index: number) => {
    if (!cardAnims[index]) {
      cardAnims[index] = new Animated.Value(0);
    }
    return cardAnims[index];
  };

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ]),
    );
    float.start();
    return () => float.stop();
  }, []);

  useEffect(() => {
    statsAnim.setValue(0);
    Animated.timing(statsAnim, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }).start();
    const anims = filteredPlants.map((_, i) => {
      return Animated.timing(getCardAnim(i), {
        toValue: 1,
        duration: 400,
        delay: i * 80,
        useNativeDriver: true,
      });
    });
    Animated.stagger(80, anims).start();
  }, [filteredPlants.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlants();
    setRefreshing(false);
  }, [fetchPlants]);

  useEffect(() => {
    if (!user) return;
    fetchPlants();

    const channel = supabase
      .channel('collection')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_plants',
          filter: `user_id=eq.${user.id}`,
        },
        () => { plantService.getUserPlants(user.id).then(setPlants).catch(() => {}); },
      )
      .subscribe();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.match(/inactive|background/) && nextState === 'active') {
        fetchPlants();
      }
      setAppState(nextState);
    });

    return () => {
      channel.unsubscribe();
      sub.remove();
    };
  }, [user]);

  const stats = useMemo(() => {
    const favorites = plants.filter((p) => p.is_favorite).length;
    const tagSet = new Set<string>();
    plants.forEach((p) => p.tags?.forEach((t) => tagSet.add(t)));
    const spotSet = new Set<string>();
    plants.forEach((p) => {
      if (p.location_label) spotSet.add(p.location_label);
    });
    return { favorites, tags: tagSet.size, spots: spotSet.size };
  }, [plants]);

  const [filterVisible, setFilterVisible] = useState(false);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    plants.forEach((p) => p.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [plants]);

  const renderPlant = useCallback(
    ({ item, index }: { item: UserPlant; index: number }) => {
      const tags = item.tags ?? [];
      const visibleTags = tags.slice(0, 3);
      const extraCount = tags.length - 3;

      const dateStr = new Date(item.discovered_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const anim = getCardAnim(index);
      const cardStyle = {
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
        transform: [{
          translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
        }],
      };

      return (
        <Animated.View style={cardStyle}>
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
            {item.is_favorite && (
              <View style={styles.favoriteBadge}>
                <Feather name="heart" size={12} color={Colors.blushDark} />
              </View>
            )}
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
        </Animated.View>
        );
      },
      [navigation],
  );

  const keyExtractor = useCallback((item: UserPlant) => item.id, []);

  return (
    <View style={styles.container}>
      <OfflineBanner visible={offline} lastSynced={lastSync} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>My Plants</Text>
            <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
              <Feather name="feather" size={18} color={Colors.green400} />
            </Animated.View>
          </View>
          <Text style={styles.headerSubtitle}>
            {plants.length} {plants.length === 1 ? 'discovery' : 'discoveries'}
          </Text>
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterVisible(true)} activeOpacity={0.7}>
          <Feather name="sliders" size={18} color={Colors.bark} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={Colors.bark} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search plants..."
          placeholderTextColor={Colors.bark}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Feather name="arrow-up" size={16} color={Colors.bark} />
        <Feather name="arrow-down" size={16} color={Colors.bark} />
      </View>

      <Animated.View style={[styles.statsRow, {
        opacity: statsAnim,
        transform: [{ translateX: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
      }]}>
        <View style={[styles.statChip, { backgroundColor: Colors.green100 }]}>
          <Feather name="heart" size={12} color={Colors.green700} />
          <Text style={[styles.statText, { color: Colors.green700 }]}>{stats.favorites} favorites</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: Colors.lavenderLight }]}>
          <Feather name="tag" size={12} color={Colors.lavender} />
          <Text style={[styles.statText, { color: Colors.lavender }]}>{stats.tags} tags</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: Colors.blushLight }]}>
          <Feather name="map-pin" size={12} color={Colors.blushDark} />
          <Text style={[styles.statText, { color: Colors.blushDark }]}>{stats.spots} spots</Text>
        </View>
      </Animated.View>

      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => setSortOrder(opt.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.sortOption,
                sortOrder === opt.key && styles.sortOptionActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && plants.length === 0 ? (
        <LoadingScreen />
      ) : filteredPlants.length === 0 ? (
        <EmptyState
          icon="feather"
          title="No Plants Yet"
          subtitle={searchQuery || filterTag ? 'Try adjusting your search or filters.' : 'Start identifying plants to build your collection.'}
          actionLabel={!searchQuery && !filterTag ? 'Scan Your First Plant' : undefined}
          onAction={!searchQuery && !filterTag ? () => (navigation.getParent() as any)?.navigate('ScanTab') : undefined}
        />
      ) : (
        <FlatList
          data={filteredPlants}
          renderItem={renderPlant}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.plantGridRow}
          contentContainerStyle={styles.plantGrid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.green700]}
              tintColor={Colors.green700}
            />
          }
        />
      )}

      <Modal visible={filterVisible} transparent animationType="fade" onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Tag</Text>
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={[styles.filterOption, !filterTag && styles.filterOptionActive]}
                onPress={() => { setFilterTag(''); setFilterVisible(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterOptionText, !filterTag && styles.filterOptionTextActive]}>All Plants</Text>
              </TouchableOpacity>
              {allTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.filterOption, filterTag === tag && styles.filterOptionActive]}
                  onPress={() => { setFilterTag(tag); setFilterVisible(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterOptionText, filterTag === tag && styles.filterOptionTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setFilterVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerLeft: {
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.soil,
  },
  headerSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.bark,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.stone,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.stone,
    borderRadius: 10,
    height: 38,
    marginHorizontal: 20,
    paddingHorizontal: 10,
    gap: 6,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13.5,
    color: Colors.soil,
    height: '100%',
    padding: 0,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sortOption: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: Colors.bark,
  },
  sortOptionActive: {
    color: Colors.green700,
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
    maxHeight: '80%',
    gap: 12,
  },
  modalTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 20,
    color: Colors.soil,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: 300,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  filterOptionActive: {
    backgroundColor: Colors.green100,
  },
  filterOptionText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.soil,
  },
  filterOptionTextActive: {
    color: Colors.green700,
    fontFamily: 'DMSans_600SemiBold',
  },
  modalCloseButton: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.linen,
    borderRadius: 10,
  },
  modalCloseText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: Colors.bark,
  },
});
