import { supabase } from './supabase';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import * as Location from 'expo-location';
import { v4 as uuidv4 } from 'uuid';
import { Config } from '../constants/config';
import type { IdentificationResult, UserPlant } from '../types';

export const plantService = {
  async uploadPlantImage(userId: string, imageUri: string): Promise<string> {
    const path = `${userId}/${uuidv4()}.jpg`;
    const file = new File(imageUri);
    if (file.size > 15 * 1024 * 1024) {
      throw new Error('Image must be under 15MB.');
    }
    const base64 = await file.base64();
    const { error } = await supabase.storage
      .from('plant-images')
      .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: false });
    if (error) {
      throw new Error('Failed to upload image: ' + error.message);
    }
    const { data: signedData, error: signedError } = await supabase.storage
      .from('plant-images')
      .createSignedUrl(path, 604800);
    if (signedError || !signedData) {
      throw new Error('Failed to create signed URL: ' + (signedError?.message ?? 'unknown'));
    }
    return signedData.signedUrl;
  },

  async upsertPlantCatalog(result: IdentificationResult): Promise<string> {
    const scientificName = result.scientific_name.trim().toLowerCase();
    const { data: existing } = await supabase
      .from('plants')
      .select('id')
      .ilike('scientific_name', scientificName)
      .maybeSingle();
    if (existing) return existing.id;

    const { data: inserted, error } = await supabase
      .from('plants')
      .insert({
        common_name: result.common_name,
        scientific_name: scientificName,
        description: result.description,
        origin: result.origin,
        care_watering: result.care_watering,
        care_sunlight: result.care_sunlight,
        care_soil: result.care_soil,
        uses: result.uses,
        image_url: '',
      })
      .select('id')
      .single();
    if (error || !inserted) {
      throw new Error('Failed to save plant: ' + (error?.message ?? 'unknown'));
    }
    return inserted.id;
  },

  async saveUserPlant(params: {
    userId: string;
    plantId: string;
    capturedImageUrl: string;
    confidenceScore: number;
    locationLat: number | null;
    locationLng: number | null;
    locationLabel: string | null;
    notes?: string | null;
  }): Promise<string> {
    const { data, error } = await supabase
      .from('user_plants')
      .insert({
        user_id: params.userId,
        plant_id: params.plantId,
        captured_image_url: params.capturedImageUrl,
        confidence_score: params.confidenceScore,
        location_lat: params.locationLat,
        location_lng: params.locationLng,
        location_label: params.locationLabel,
        notes: params.notes || null,
        discovered_at: new Date().toISOString(),
        is_favorite: false,
        tags: [],
        is_deleted: false,
      })
      .select('id')
      .single();
    if (error || !data) {
      throw new Error('Failed to save to collection: ' + (error?.message ?? 'unknown'));
    }
    return data.id;
  },

  async getLocationLabel(lat: number, lng: number): Promise<string | null> {
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (addresses.length === 0) return null;
      const a = addresses[0];
      const parts = [a.street, a.district, a.city].filter(Boolean);
      return parts.join(', ') || null;
    } catch {
      return null;
    }
  },

  async getUserPlants(userId: string): Promise<UserPlant[]> {
    const { data, error } = await supabase
      .from('user_plants')
      .select('*, plant:plants(*)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('discovered_at', { ascending: false });
    if (error) {
      throw new Error('Failed to fetch collection: ' + error.message);
    }
    return (data as UserPlant[]) ?? [];
  },

  async toggleFavorite(userPlantId: string, isFavorite: boolean): Promise<void> {
    const { error } = await supabase
      .from('user_plants')
      .update({ is_favorite: isFavorite })
      .eq('id', userPlantId);
    if (error) throw new Error('Failed to update favorite: ' + error.message);
  },

  async updateNotes(userPlantId: string, notes: string): Promise<void> {
    if (notes.length > Config.MAX_NOTES_LENGTH) {
      throw new Error('Notes cannot exceed ' + Config.MAX_NOTES_LENGTH + ' characters.');
    }
    const trimmed = notes.trim() || null;
    const { error } = await supabase
      .from('user_plants')
      .update({ notes: trimmed, notes_updated_at: new Date().toISOString() })
      .eq('id', userPlantId);
    if (error) throw new Error('Failed to update notes: ' + error.message);
  },

  async updateTags(userPlantId: string, tags: string[]): Promise<void> {
    const normalized = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    if (normalized.length > Config.MAX_TAGS_PER_PLANT) {
      throw new Error('Maximum ' + Config.MAX_TAGS_PER_PLANT + ' tags allowed.');
    }
    const { error } = await supabase
      .from('user_plants')
      .update({ tags: normalized })
      .eq('id', userPlantId);
    if (error) throw new Error('Failed to update tags: ' + error.message);
  },

  async softDeleteUserPlant(userPlantId: string): Promise<void> {
    const { error } = await supabase
      .from('user_plants')
      .update({ is_deleted: true })
      .eq('id', userPlantId);
    if (error) throw new Error('Failed to delete plant: ' + error.message);
  },
};
