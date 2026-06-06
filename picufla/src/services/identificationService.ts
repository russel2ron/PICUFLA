import { supabase } from './supabase';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Config } from '../constants/config';
import type { IdentificationResult } from '../types';

export const identificationService = {
  async compressImage(uri: string): Promise<{ base64: string; mimeType: 'image/jpeg' }> {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: SaveFormat.JPEG, base64: true }
    );
    const size = (result.base64!.length * 3) / 4;
    if (size > Config.MAX_IMAGE_SIZE_BYTES) {
      const result2 = await manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.6, format: SaveFormat.JPEG, base64: true }
      );
      const size2 = (result2.base64!.length * 3) / 4;
      if (size2 > Config.MAX_IMAGE_SIZE_BYTES) {
        throw new Error('Image too large to process.');
      }
      return { base64: result2.base64!, mimeType: 'image/jpeg' };
    }
    return { base64: result.base64!, mimeType: 'image/jpeg' };
  },

  async identifyPlant(imageUri: string): Promise<IdentificationResult> {
    const { base64, mimeType } = await this.compressImage(imageUri);
    const response = await supabase.functions.invoke('identify-plant', {
      body: { imageBase64: base64, mimeType },
    });
    if (response.error) {
      throw new Error(response.error.message ?? 'Identification failed.');
    }
    return response.data as IdentificationResult;
  },

  async checkDuplicate(userId: string, scientificName: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_plants')
      .select('id, plant:plants!inner(scientific_name)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .ilike('plants.scientific_name', scientificName.trim().toLowerCase())
      .limit(1);
    return (data?.length ?? 0) > 0;
  },
};
