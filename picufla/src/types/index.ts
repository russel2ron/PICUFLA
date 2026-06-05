export interface AppUser {
  id: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  auth_provider: 'google' | 'email';
  created_at: string;
  last_login_at: string;
  notifications_enabled: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
}

export interface Plant {
  id: string;
  common_name: string;
  scientific_name: string;
  description: string;
  origin: string;
  care_watering: string;
  care_sunlight: string;
  care_soil: string;
  uses: string;
  image_url: string;
  created_at: string;
}

export interface UserPlant {
  id: string;
  plant_id: string;
  user_id: string;
  discovered_at: string;
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  confidence_score: number;
  captured_image_url: string;
  notes: string | null;
  notes_updated_at: string | null;
  is_favorite: boolean;
  tags: string[];
  is_deleted: boolean;
  plant?: Plant;
}

export interface Reminder {
  id: string;
  user_plant_id: string;
  user_id: string;
  care_type: 'water' | 'fertilize' | 'repot' | 'custom';
  custom_label: string | null;
  scheduled_at: string;
  is_recurring: boolean;
  recurring_interval: 'daily' | 'weekly' | 'monthly' | null;
  expo_push_token: string;
  is_active: boolean;
  created_at: string;
}

export interface IdentificationLog {
  id: string;
  user_id: string;
  image_storage_path: string;
  identified_plant_scientific_name: string | null;
  confidence_score: number | null;
  alternatives: PlantAlternative[] | null;
  was_accepted: boolean;
  created_at: string;
}

export interface PlantAlternative {
  common_name: string;
  scientific_name: string;
  confidence_score: number;
}

export interface IdentificationResult {
  common_name: string;
  scientific_name: string;
  confidence_score: number;
  description: string;
  origin: string;
  care_watering: string;
  care_sunlight: string;
  care_soil: string;
  uses: string;
  alternatives: PlantAlternative[] | null;
}

export type RootStackParamList = {
  Login: undefined;
  EmailRegister: undefined;
  EmailLogin: undefined;
  VerifyEmail: { email: string };
};

export type AppTabParamList = {
  CollectionTab: undefined;
  ScanTab: undefined;
  ProfileTab: undefined;
};

export type CollectionStackParamList = {
  Collection: undefined;
  PlantDetail: { userPlantId: string };
  Reminders: { userPlantId: string; commonName: string };
};

export type ScanStackParamList = {
  Scan: undefined;
  IdentificationResult: { result: IdentificationResult; capturedImageUri: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  PrivacyPolicy: undefined;
};
