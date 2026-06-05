# PICUFLA — Build Prompts (Supabase Edition)
# IDE: Visual Studio Code + Claude Code Extension
# Run each PART in order. Never skip. Commit to Git after each part passes.

---

## FINALIZED TECH STACK (do not change after this point)

| Layer            | Technology                                      |
|------------------|-------------------------------------------------|
| Mobile framework | React Native + Expo SDK 52 (managed workflow)   |
| Language         | TypeScript 5 (strict mode)                      |
| Auth             | Supabase Auth (email + Google OAuth)            |
| Database         | Supabase PostgreSQL + Row Level Security (RLS)  |
| File storage     | Supabase Storage                                |
| Backend logic    | Supabase Edge Functions (Deno runtime)          |
| State management | Zustand                                         |
| Input validation | Zod                                             |
| Navigation       | React Navigation v6                             |
| Local cache      | @react-native-async-storage/async-storage       |
| Secure storage   | expo-secure-store                               |
| Session crypto   | aes-js + react-native-get-random-values         |
| Notifications    | expo-notifications                              |
| Image tools      | expo-camera, expo-image-manipulator             |
| Location         | expo-location                                   |
| Network status   | @react-native-community/netinfo                 |

---

## HOW TO USE THESE PROMPTS

1. Open your project folder in VS Code
2. Open Claude Code (Ctrl+Shift+P → "Open Claude")
3. Paste ONE part at a time — wait for it to finish completely
4. Read the output, fix any errors Claude flags before moving on
5. `git add . && git commit -m "Part X complete"` after each part
6. Never paste Part N+1 if Part N has unresolved TypeScript errors

---

## ══════════════════════════════════════════════
## PART 1 OF 7 — Project Scaffold & Security Foundation
## ══════════════════════════════════════════════

```
You are building PICUFLA — a React Native mobile app where users scan plants
with their camera, get AI-powered identification via OpenAI Vision (GPT-4o),
and build a personal plant collection.

FINALIZED STACK (do not suggest alternatives):
- React Native + Expo SDK 52, TypeScript strict mode
- Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- React Navigation v6, Zustand, Zod
- expo-secure-store + aes-js for encrypted session storage

═══ STEP 1: Initialize the project ═══

Run this command to create the project:
  npx create-expo-app@latest picufla --template blank-typescript

Then create EXACTLY this folder structure inside the project root:

src/
  screens/          ← all screen components (.tsx)
  components/       ← reusable UI components (.tsx)
  hooks/            ← custom React hooks
  services/         ← Supabase and API modules
  utils/            ← helper functions
  types/            ← TypeScript interfaces and types
  constants/        ← colors, config, enums
  navigation/       ← stack and tab navigator definitions
  store/            ← Zustand stores
supabase/
  functions/        ← Edge Functions (Deno, one folder per function)
  migrations/       ← SQL migration files
assets/             ← fonts, images, icons

═══ STEP 2: Install all dependencies ═══

Run these exact commands (do not change package names or versions):

npx expo install \
  @supabase/supabase-js \
  @react-native-async-storage/async-storage \
  expo-secure-store \
  aes-js \
  react-native-get-random-values \
  react-native-url-polyfill \
  expo-camera \
  expo-image-manipulator \
  expo-location \
  expo-notifications \
  @react-native-community/netinfo \
  react-native-safe-area-context \
  react-native-screens \
  react-native-gesture-handler \
  @react-navigation/native \
  @react-navigation/stack \
  @react-navigation/bottom-tabs \
  @expo/vector-icons \
  zustand \
  zod \
  uuid

npm install --save-dev @types/aes-js @types/uuid

═══ STEP 3: Create /src/types/index.ts ═══

Create this file with EXACTLY these interfaces — do not add, remove,
or rename any field:

```typescript
export interface AppUser {
  id: string;                        // matches auth.users.id in Supabase
  email: string;
  display_name: string;
  photo_url: string | null;
  auth_provider: 'google' | 'email';
  created_at: string;                // ISO 8601 string from Postgres
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
  plant?: Plant;                     // optional joined plant data
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
```

═══ STEP 4: Create /src/constants/colors.ts ═══

DESIGN PHILOSOPHY:
PICUFLA targets adults who are passionate about plants — think botanical journals,
pressed flower aesthetics, linen textures, and quiet Sunday mornings with a watering
can. The palette is soft, warm, and grown-up: dusty sage greens, warm creams, blush
pinks, and terracotta accents. Nothing harsh, nothing neon. Every color should feel
like it belongs in a botanical garden gift shop or a well-curated plant shelf.

```typescript
export const Colors = {
  // ── Primary: Dusty Sage Green (muted, botanical, not neon) ──
  green900: '#2C3B2D',   // deep forest — for headers on dark backgrounds
  green800: '#3D5140',   // dark sage
  green700: '#4E6B52',   // primary action (buttons, active states)
  green600: '#6B8F6E',   // secondary action
  green500: '#8AAF8C',   // icons, accents
  green400: '#A8C9AA',   // borders with color
  green300: '#C2D9C3',   // subtle fills
  green200: '#DAE9DA',   // light fills, chips
  green100: '#ECF4EC',   // very light backgrounds
  green50:  '#F5F9F5',   // near-white tinted green

  // ── Warm Neutrals (linen and parchment — warm, not cold white) ──
  parchment:  '#F7F3EC',   // main app background
  linen:      '#EDE7DA',   // card background
  stone:      '#D6CEC0',   // dividers, borders
  bark:       '#8C7B6B',   // muted text
  soil:       '#4A3F35',   // primary text (warm dark brown, not pure black)

  // ── Accent: Dusty Rose / Blush (for favorites, highlights) ──
  blush:      '#E8C5B8',   // soft rose accent
  blushDark:  '#C4876E',   // terracotta — for warnings, care alerts
  blushLight: '#F5EAE4',   // blush background

  // ── Accent: Soft Terracotta (pot color — earthy warmth) ──
  terra:      '#C8795A',   // terracotta — discovery badges, reminders
  terraLight: '#F2E0D6',   // terracotta tint background

  // ── Accent: Dusty Lavender (for tags, secondary info) ──
  lavender:     '#C4BADE',
  lavenderLight:'#F0EDF8',

  // ── Semantic ──
  error:      '#B85450',   // muted red (not harsh)
  errorBg:    '#F5E8E8',
  warning:    '#C4895A',   // warm amber/terracotta
  warningBg:  '#F5EDE3',
  success:    '#6B8F6E',   // same as green600
  successBg:  '#ECF4EC',
  info:       '#7A9BB5',   // dusty blue
  infoBg:     '#EAF1F7',

  // ── Cards and surfaces ──
  card:       '#FDFAF6',   // warm white card
  cardBorder: 'rgba(140,123,107,0.15)',  // warm stone border

  // ── Typography ──
  textPrimary:   '#4A3F35',  // warm dark brown
  textSecondary: '#8C7B6B',  // bark
  textDisabled:  '#B5A898',  // light bark
  textOnDark:    '#F7F3EC',  // parchment on dark backgrounds

  // ── Tab bar & navigation ──
  tabActive:   '#4E6B52',
  tabInactive: '#B5A898',
  tabBg:       '#F7F3EC',
} as const;

// ── Typography scale ──
// Use DM Serif Display for headings (elegant, botanical-journal feel)
// Use DM Sans for body text (clean, readable for adults)
// Add to app.json fonts or use @expo-google-fonts/dm-serif-display
//
// Font usage guide:
//   Screen titles:    DM Serif Display, 28–32px, color: textPrimary
//   Section headers:  DM Serif Display, 20–22px, color: textPrimary
//   Plant names:      DM Serif Display, italic, 18–24px, color: textPrimary
//   Scientific names: DM Serif Display, italic, 14–16px, color: textSecondary
//   Body text:        DM Sans Regular, 14px, color: textPrimary
//   Labels/meta:      DM Sans Medium, 11–12px, uppercase, letter-spacing 0.08em, color: textSecondary
//   Buttons:          DM Sans SemiBold, 15px
//   Captions:         DM Sans Regular, 12px, color: textSecondary
```

═══ STEP 4b: Create /src/constants/theme.ts ═══

This file contains all shared spacing, radius, and shadow values.
Import this alongside Colors for consistent UI across all screens.

```typescript
import { Colors } from './colors';

export const Theme = {
  // ── Spacing ──
  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  },

  // ── Border radius ──
  radius: {
    sm:   10,
    md:   16,
    lg:   24,
    xl:   32,
    full: 999,
  },

  // ── Shadows (warm toned, not cold grey) ──
  shadow: {
    sm: {
      shadowColor: '#4A3F35',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#4A3F35',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.09,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#4A3F35',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  // ── Reusable component styles ──
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },

  // ── Button styles ──
  buttonPrimary: {
    backgroundColor: Colors.green700,
    borderRadius: 14,
    height: 50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonSecondary: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.stone,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonDanger: {
    backgroundColor: Colors.errorBg,
    borderRadius: 14,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  // ── Input styles ──
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.stone,
    height: 50,
    paddingHorizontal: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
} as const;
```

═══ STEP 4c: Design rules for ALL screens (apply everywhere) ═══

Enforce these visual rules across every screen and component:

BACKGROUNDS:
- Main screen background: Colors.parchment (#F7F3EC) — never pure white
- Card backgrounds: Colors.card (#FDFAF6) — slightly warmer than white
- Bottom sheet / modal backgrounds: Colors.linen (#EDE7DA)
- Section dividers: Colors.stone at 40% opacity

TYPOGRAPHY:
- Always install and use DM Serif Display + DM Sans via expo-google-fonts:
    npx expo install @expo-google-fonts/dm-serif-display @expo-google-fonts/dm-sans expo-font
- Plant names and screen titles always use DM Serif Display
- All other text uses DM Sans
- Never use bold on scientific names — use italic DM Serif Display instead

BUTTONS:
- Primary CTA: green700 background, white text, border-radius 14, height 50
- Secondary: white/card background, stone border, soil text
- Destructive: errorBg background, error border, error text
- Buttons have 16px horizontal padding minimum on sides
- No full-width buttons on detail screens — 80% max-width centered

ICONS:
- Use @expo/vector-icons Feather set (clean, thin-line, not chunky)
- Icon size: 20px in nav bars, 18px in list rows, 24px in featured positions
- Icons always use the same color as their associated label

CARDS:
- Always use Theme.shadow.sm on plant cards
- Card border: Colors.cardBorder (warm stone, subtle)
- Card border-radius: 16px
- No hard drop shadows — only soft warm shadows from Theme.shadow

TAGS / CHIPS:
- Default tag: lavenderLight background, lavender border, textPrimary text
- Active/selected tag: green200 background, green400 border, green800 text
- Danger chip: errorBg background, error text
- Chip border-radius: 999 (fully rounded pill shape)
- Chip padding: 4px vertical, 12px horizontal

CONFIDENCE INDICATOR:
- ≥80%: successBg background, green700 text + leaf icon
- 60–79%: warningBg background, warning text + info icon
- <60%: terraLight background, terra text + question icon

EMPTY STATES:
- Center-aligned illustration (use a large emoji or SVG placeholder)
- Subtitle in textSecondary, DM Sans, 14px
- CTA button below — not full width

OFFLINE BANNER:
- terraLight background (#F2E0D6), terracotta left border (4px)
- Small terra-colored dot + "Offline" text in DM Sans Medium

BOTTOM NAVIGATION TAB BAR:
- Background: Colors.tabBg (#F7F3EC)
- Top border: Colors.stone at 50% opacity
- Active: green700 icon + label, green100 rounded pill background behind icon
- Inactive: tabInactive color

═══ STEP 5: Create /src/constants/config.ts ═══

Install the fonts before running the app:
  npx expo install @expo-google-fonts/dm-serif-display @expo-google-fonts/dm-sans expo-font

Also install react-native-safe-area-context and react-native-linear-gradient if not already installed:
  npx expo install react-native-safe-area-context react-native-linear-gradient

```typescript
export const Config = {
  MAX_NOTES_LENGTH: 500,
  MAX_TAGS_PER_PLANT: 10,
  MAX_IMAGE_SIZE_BYTES: 2 * 1024 * 1024,   // 2MB
  MAX_STORAGE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  AI_CONFIDENCE_THRESHOLD: 0.6,
  AI_MIN_CONFIDENCE: 0.3,
  RATE_LIMIT_CALLS_PER_HOUR: 10,
  OTP_RESEND_COOLDOWN_SECONDS: 60,
  MAX_OTP_ATTEMPTS: 5,
  DATA_DELETION_DAYS: 30,
} as const;
```

═══ STEP 6: Create .env.example ═══

Create this file at the project root with NO real values:

```
# Supabase — get these from your Supabase project dashboard → Settings → API
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# OpenAI — NEVER prefix with EXPO_PUBLIC_. Server-side Edge Function only.
# Set this in Supabase Dashboard → Edge Functions → Secrets, NOT in .env
OPENAI_API_KEY=
```

═══ STEP 7: Create .gitignore ═══

```
node_modules/
.expo/
dist/
build/
.env
.env.local
.env.production
android/
ios/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
```

═══ STEP 8: Create /src/services/supabase.ts ═══

This is the ONLY place the Supabase client is initialized.
Use the encrypted session storage pattern from official Supabase docs:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';
import 'react-native-get-random-values';

// Encrypt session data before storing on device
class LargeSecureStore {
  private async _encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(
      encryptionKey,
      new aesjs.Counter(1)
    );
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(
      key,
      aesjs.utils.hex.fromBytes(encryptionKey)
    );
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async _decrypt(key: string, value: string): Promise<string> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) throw new Error('Encryption key not found');
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1)
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    return this._decrypt(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this._encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in the values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

═══ STEP 9: Create Supabase migration — /supabase/migrations/001_initial_schema.sql ═══

This migration creates ALL tables, enables RLS, and sets all policies.
Write it as a single SQL file:

```sql
-- ─────────────────────────────────────────────────────────
-- Enable required extensions
-- ─────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────
-- TABLE: profiles (extends auth.users)
-- ─────────────────────────────────────────────────────────
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  display_name          text not null default '',
  photo_url             text,
  auth_provider         text not null check (auth_provider in ('google', 'email')),
  created_at            timestamptz not null default now(),
  last_login_at         timestamptz not null default now(),
  notifications_enabled boolean not null default true,
  is_deleted            boolean not null default false,
  deleted_at            timestamptz
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Profile is created automatically on signup via trigger (see below)

-- ─────────────────────────────────────────────────────────
-- TABLE: plants (master catalog — shared, read-only for users)
-- ─────────────────────────────────────────────────────────
create table public.plants (
  id              uuid primary key default uuid_generate_v4(),
  common_name     text not null,
  scientific_name text not null unique,
  description     text not null default '',
  origin          text not null default '',
  care_watering   text not null default '',
  care_sunlight   text not null default '',
  care_soil       text not null default '',
  uses            text not null default '',
  image_url       text not null default '',
  created_at      timestamptz not null default now()
);

alter table public.plants enable row level security;

-- Authenticated users can read the master catalog
create policy "Authenticated users can read plants catalog"
  on public.plants for select
  to authenticated
  using (true);

-- Only service role (Edge Functions) can insert/update plants
-- No insert/update/delete policy for authenticated role = denied

-- ─────────────────────────────────────────────────────────
-- TABLE: user_plants
-- ─────────────────────────────────────────────────────────
create table public.user_plants (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  plant_id            uuid not null references public.plants(id),
  discovered_at       timestamptz not null default now(),
  location_lat        double precision,
  location_lng        double precision,
  location_label      text,
  confidence_score    double precision not null check (confidence_score between 0 and 1),
  captured_image_url  text not null,
  notes               text check (char_length(notes) <= 500),
  notes_updated_at    timestamptz,
  is_favorite         boolean not null default false,
  tags                text[] not null default '{}',
  is_deleted          boolean not null default false
);

create index idx_user_plants_user_id on public.user_plants(user_id);
create index idx_user_plants_scientific on public.plants(scientific_name);

alter table public.user_plants enable row level security;

create policy "Users can view own user_plants"
  on public.user_plants for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own user_plants"
  on public.user_plants for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own user_plants"
  on public.user_plants for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No hard delete policy — deletions are soft (is_deleted = true)

-- ─────────────────────────────────────────────────────────
-- TABLE: reminders
-- ─────────────────────────────────────────────────────────
create table public.reminders (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  user_plant_id       uuid not null references public.user_plants(id) on delete cascade,
  care_type           text not null check (care_type in ('water', 'fertilize', 'repot', 'custom')),
  custom_label        text,
  scheduled_at        timestamptz not null,
  is_recurring        boolean not null default false,
  recurring_interval  text check (recurring_interval in ('daily', 'weekly', 'monthly')),
  expo_push_token     text not null,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

create index idx_reminders_user_id on public.reminders(user_id);

alter table public.reminders enable row level security;

create policy "Users can view own reminders"
  on public.reminders for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own reminders"
  on public.reminders for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own reminders"
  on public.reminders for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own reminders"
  on public.reminders for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────
-- TABLE: identification_logs (written by Edge Function only)
-- ─────────────────────────────────────────────────────────
create table public.identification_logs (
  id                                  uuid primary key default uuid_generate_v4(),
  user_id                             uuid not null references auth.users(id) on delete cascade,
  image_storage_path                  text not null,
  identified_plant_scientific_name    text,
  confidence_score                    double precision check (confidence_score between 0 and 1),
  alternatives                        jsonb,
  was_accepted                        boolean not null default false,
  created_at                          timestamptz not null default now()
);

create index idx_id_logs_user_id on public.identification_logs(user_id);

alter table public.identification_logs enable row level security;

-- Users can read their own logs
create policy "Users can view own identification_logs"
  on public.identification_logs for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Users CANNOT insert directly — only the Edge Function (service role) inserts
-- No insert policy for authenticated role

-- ─────────────────────────────────────────────────────────
-- TABLE: rate_limits (managed by Edge Function)
-- ─────────────────────────────────────────────────────────
create table public.rate_limits (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  call_count  integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- No user-accessible policies — only service role via Edge Function

-- ─────────────────────────────────────────────────────────
-- TABLE: deletion_audit_log (admin-only, no user policies)
-- ─────────────────────────────────────────────────────────
create table public.deletion_audit_log (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null,
  deletion_type text not null check (deletion_type in ('account', 'plant_data')),
  requested_at  timestamptz not null default now(),
  purge_after   timestamptz not null
);

alter table public.deletion_audit_log enable row level security;
-- No user-accessible policies — only service role

-- ─────────────────────────────────────────────────────────
-- TRIGGER: auto-create profile on auth.users signup
-- ─────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, photo_url, auth_provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'provider', 'email')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

═══ STEP 10: Create Supabase Storage bucket policy ═══

Create /supabase/migrations/002_storage.sql:

```sql
-- Create the plant-images storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plant-images',
  'plant-images',
  false,
  5242880,   -- 5MB max
  array['image/jpeg', 'image/png', 'image/webp']
);

-- Users can upload to their own folder only
create policy "Users can upload own plant images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'plant-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Users can view their own images only
create policy "Users can view own plant images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'plant-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Users can delete their own images
create policy "Users can delete own plant images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'plant-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
```

═══ STEP 11: Create /supabase/functions/.env.example ═══

```
# Set these via: supabase secrets set OPENAI_API_KEY=sk-...
# NEVER put real values here or commit this file with real values
OPENAI_API_KEY=
```

═══ STEP 12: Create /src/utils/errorHandler.ts ═══

```typescript
export const AUTH_ERRORS: Record<string, string> = {
  'invalid_credentials':        'Incorrect email or password.',
  'email_not_confirmed':        'Please verify your email before logging in.',
  'user_already_exists':        'An account with this email already exists.',
  'weak_password':              'Password must be at least 8 characters with 1 number.',
  'over_email_send_rate_limit': 'Too many attempts. Please wait a few minutes.',
  'network_error':              'No internet connection. Please try again.',
  'PGRST301':                   'Session expired. Please log in again.',
  'permission_denied':          'You do not have permission to do that.',
  'service_unavailable':        'Service temporarily unavailable. Try again shortly.',
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as any)?.code ?? (error as any)?.status ?? '';
    return AUTH_ERRORS[code] ?? AUTH_ERRORS[error.message] ?? 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
```

═══ STEP 13: Verify the scaffold ═══

After creating all files, run:
  npx tsc --noEmit

Fix every TypeScript error before moving to Part 2.
There should be zero errors if all files were created correctly.

Do NOT create any screen UI in this part.
Do NOT initialize a Supabase project yet — that is done manually by the developer.
```

---

## ══════════════════════════════════════════════
## PART 2 OF 7 — Authentication Screens & Auth Service
## (PUF001, PUF002, PUF002b, PUF003)
## ══════════════════════════════════════════════

```
Continue building PICUFLA. Part 1 is complete:
- Expo + TypeScript project exists
- All types defined in /src/types/index.ts
- Supabase client in /src/services/supabase.ts (encrypted session storage)
- DB migration SQL files exist
- Error handler in /src/utils/errorHandler.ts
- Colors and Config constants exist

Now build the complete authentication system.

═══ STEP 1: Create /src/services/authService.ts ═══

This service wraps ALL Supabase Auth calls. No screen should call
supabase.auth directly — always go through this service.

```typescript
import { supabase } from './supabase';
import { getErrorMessage } from '../utils/errorHandler';
import type { AppUser } from '../types';

export const authService = {

  // ── Email Registration ──
  async registerWithEmail(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: undefined, // mobile — no redirect needed
      },
    });
    if (error) throw new Error(getErrorMessage(error));
  },

  // ── Email Login ──
  async loginWithEmail(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(getErrorMessage(error));
    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut();
      throw new Error('Please verify your email before logging in.');
    }
    await authService.updateLastLogin(data.user.id);
  },

  // ── Google OAuth ──
  // NOTE: Google OAuth with Expo requires a development build (not Expo Go).
  // Use expo-auth-session with Supabase OAuth flow.
  async loginWithGoogle(): Promise<void> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'picufla://auth/callback',
      },
    });
    if (error) throw new Error(getErrorMessage(error));
  },

  // ── Resend verification email ──
  async resendVerificationEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    if (error) throw new Error(getErrorMessage(error));
  },

  // ── Logout ──
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(getErrorMessage(error));
  },

  // ── Get current session ──
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // ── Get current user profile from profiles table ──
  async getUserProfile(userId: string): Promise<AppUser | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data as AppUser;
  },

  // ── Update last login timestamp ──
  async updateLastLogin(userId: string): Promise<void> {
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
  },

  // ── Re-authenticate before sensitive actions (account deletion) ──
  async reauthenticateWithPassword(password: string): Promise<void> {
    const session = await authService.getSession();
    if (!session?.user?.email) throw new Error('No active session.');
    const { error } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password,
    });
    if (error) throw new Error('Re-authentication failed. Incorrect password.');
  },
};
```

═══ STEP 2: Create /src/services/permissionService.ts ═══

```typescript
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export const permissionService = {

  async requestCamera(): Promise<PermissionStatus> {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status as PermissionStatus;
  },

  async requestLocation(): Promise<PermissionStatus> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status as PermissionStatus;
  },

  async requestNotifications(): Promise<PermissionStatus> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status as PermissionStatus;
  },

  async getCameraStatus(): Promise<PermissionStatus> {
    const { status } = await Camera.getCameraPermissionsAsync();
    return status as PermissionStatus;
  },

  async getLocationStatus(): Promise<PermissionStatus> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status as PermissionStatus;
  },

  async getNotificationStatus(): Promise<PermissionStatus> {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PermissionStatus;
  },
};
```

═══ STEP 3: Create /src/store/authStore.ts ═══

```typescript
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { AppUser } from '../types';

interface AuthState {
  session: Session | null;
  user: AppUser | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  clearAuth: () => set({ session: null, user: null }),
}));
```

═══ STEP 4: Build these 4 screens ═══

Build each screen using Colors and Theme from /src/constants/.
Apply the full pastel botanical design system defined in Part 1.
Use DM Serif Display for titles and plant names, DM Sans for all other text.
Background is always Colors.parchment. Cards use Colors.card + Theme.shadow.sm.

--- /src/screens/LoginScreen.tsx ---

Layout:
- Full parchment background (#F7F3EC)
- Top half: a soft botanical illustration area — large rounded rect with
  linen background (#EDE7DA), containing a centered 🌿 leaf emoji at 72px
  and the app name "PICUFLA" in DM Serif Display 36px, color soil (#4A3F35)
- Tagline below app name: "Discover & collect every plant around you."
  DM Sans Regular, 15px, bark color (#8C7B6B), centered
- Bottom half: form card with linen background, 24px top radius, subtle shadow
  - "Continue with Google" button (white background, warm stone border, Google logo, soil text)
  - Thin divider with "or" in bark color
  - "Continue with Email" button (green700 background #4E6B52, white text)
  - Small text link: "Already have an account? Sign in" in green700
- Footer: tiny 11px DM Sans bark text about Privacy Policy and DPA

Color rules:
- Primary button: green700 (#4E6B52), white text
- Secondary button: card white with stone border
- All text: soil or bark — NO pure black

--- /src/screens/EmailRegisterScreen.tsx ---

Zod schema:
```typescript
const registerSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must include at least one number'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

Layout:
- Parchment background, back arrow (Feather icon, soil color)
- DM Serif Display title "Create Account", 28px
- Subtitle in bark color
- Input fields use Theme.input styles (warm border, rounded, DM Sans)
- Password fields have show/hide toggle (Feather eye/eye-off, bark color)
- Error messages in error color, DM Sans 12px, appear below each field
- Submit button: full-width green700, "Create Account"

--- /src/screens/VerifyEmailScreen.tsx ---

Layout:
- Centered parchment screen
- Large ✉️ emoji or illustrated envelope at top
- DM Serif Display title "Check Your Email", 26px
- Body text showing the email address in a linen pill badge
- Resend button (secondary style, stone border) with 60-second countdown shown as "Resend in 54s"
- "I've Verified My Email" primary button (green700)

--- /src/screens/EmailLoginScreen.tsx ---

Zod schema:
```typescript
const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
```

Same visual treatment as EmailRegisterScreen.
On error: single combined message "Incorrect email or password" — never distinguish which is wrong.

═══ STEP 5: Create /src/hooks/useAuth.ts ═══

```typescript
import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { session, user, isLoading, setSession, setUser, setLoading, clearAuth } = useAuthStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const profile = await authService.getUserProfile(session.user.id);
        setUser(profile);
      }
      setLoading(false);
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          const profile = await authService.getUserProfile(session.user.id);
          setUser(profile);
        } else {
          clearAuth();
        }
        if (event === 'SIGNED_OUT') {
          clearAuth();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, isLoading };
}
```

═══ STEP 6: Verify ═══

Run: npx tsc --noEmit
Zero TypeScript errors required before proceeding to Part 3.
```

---

## ══════════════════════════════════════════════
## PART 3 OF 7 — OpenAI Plant Identification via Edge Function
## (PUF004, PUF005, PUF006, PUF007)
## ══════════════════════════════════════════════

```
Continue building PICUFLA. Parts 1–2 are complete.
Now build plant identification. The OpenAI API key MUST NEVER reach the
React Native app. It lives only in the Supabase Edge Function.

═══ STEP 1: Create /supabase/functions/identify-plant/index.ts ═══

This is a Deno Edge Function. Use Deno syntax (no CommonJS require).

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RATE_LIMIT_PER_HOUR = 10;
const MAX_IMAGE_BYTES_DECODED = 4 * 1024 * 1024; // 4MB base64 decoded

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Auth check ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT and get user
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Rate limiting ──
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    const { data: rateData } = await supabase
      .from('rate_limits')
      .select('call_count, window_start')
      .eq('user_id', user.id)
      .single();

    if (rateData) {
      const windowStartTime = new Date(rateData.window_start);
      if (windowStartTime > windowStart && rateData.call_count >= RATE_LIMIT_PER_HOUR) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. You can identify up to 10 plants per hour.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Reset or increment counter
      if (windowStartTime <= windowStart) {
        await supabase.from('rate_limits').upsert({ user_id: user.id, call_count: 1, window_start: now.toISOString() });
      } else {
        await supabase.from('rate_limits').update({ call_count: rateData.call_count + 1 }).eq('user_id', user.id);
      }
    } else {
      await supabase.from('rate_limits').insert({ user_id: user.id, call_count: 1, window_start: now.toISOString() });
    }

    // ── 3. Validate request body ──
    const body = await req.json();
    const { imageBase64, mimeType, imageStoragePath } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'imageBase64 is required.' }), { status: 400, headers: corsHeaders });
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      return new Response(JSON.stringify({ error: 'Invalid image type. Use JPEG, PNG, or WebP.' }), { status: 400, headers: corsHeaders });
    }
    const decodedSize = (imageBase64.length * 3) / 4;
    if (decodedSize > MAX_IMAGE_BYTES_DECODED) {
      return new Response(JSON.stringify({ error: 'Image too large. Maximum 4MB.' }), { status: 400, headers: corsHeaders });
    }

    // ── 4. Call OpenAI Vision API ──
    if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured on server.');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content: `You are a professional botanist and plant identification expert.
Analyze the provided plant image and return ONLY a valid JSON object with no extra text, markdown, or explanation.

If you can identify the plant with confidence >= 0.6, return:
{"identified":true,"common_name":"string","scientific_name":"string","confidence_score":number,"description":"2-3 sentence description","origin":"string","care_watering":"string","care_sunlight":"string","care_soil":"string","uses":"string","alternatives":null}

If confidence is between 0.3 and 0.59, return the top match plus up to 2 alternatives:
{"identified":true,"common_name":"string","scientific_name":"string","confidence_score":number,"description":"string","origin":"string","care_watering":"string","care_sunlight":"string","care_soil":"string","uses":"string","alternatives":[{"common_name":"string","scientific_name":"string","confidence_score":number}]}

If the image does not clearly show a plant, or confidence is below 0.3, return:
{"identified":false,"error":"Could not identify the plant. Try better lighting or a closer shot."}

All confidence_score values must be between 0.0 and 1.0. Return ONLY the JSON object.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              { type: 'text', text: 'Identify this plant.' },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(20000), // 20 second timeout
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      if (__DEV__) console.error('OpenAI error:', errText);
      throw new Error('Plant identification service unavailable. Please try again.');
    }

    const openaiData = await openaiResponse.json();
    const rawContent = openaiData.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error('Empty response from identification service.');

    // ── 5. Parse and validate OpenAI response ──
    let parsed: any;
    try {
      parsed = JSON.parse(rawContent.trim());
    } catch {
      throw new Error('Invalid response from identification service.');
    }

    if (!parsed.identified) {
      return new Response(
        JSON.stringify({ identified: false, error: parsed.error ?? 'Could not identify plant.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields exist
    const required = ['common_name', 'scientific_name', 'confidence_score', 'description', 'origin', 'care_watering', 'care_sunlight', 'care_soil', 'uses'];
    for (const field of required) {
      if (parsed[field] === undefined || parsed[field] === null) {
        throw new Error(`Missing field in AI response: ${field}`);
      }
    }

    const result = {
      identified: true,
      common_name: String(parsed.common_name),
      scientific_name: String(parsed.scientific_name),
      confidence_score: Math.min(1, Math.max(0, Number(parsed.confidence_score))),
      description: String(parsed.description),
      origin: String(parsed.origin),
      care_watering: String(parsed.care_watering),
      care_sunlight: String(parsed.care_sunlight),
      care_soil: String(parsed.care_soil),
      uses: String(parsed.uses),
      alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : null,
    };

    // ── 6. Write identification log (server-side only) ──
    await supabase.from('identification_logs').insert({
      user_id: user.id,
      image_storage_path: imageStoragePath ?? '',
      identified_plant_scientific_name: result.scientific_name,
      confidence_score: result.confidence_score,
      alternatives: result.alternatives,
      was_accepted: false, // updated later when user confirms
    });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    if (__DEV__) console.error('identify-plant error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Something went wrong. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

Note: The `__DEV__` guard used above — in Deno Edge Functions, replace with:
  `if (Deno.env.get('SUPABASE_ENV') !== 'production')`

═══ STEP 2: Create /src/services/identificationService.ts ═══

```typescript
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import type { IdentificationResult } from '../types';

export const identificationService = {

  async compressImage(uri: string): Promise<{ base64: string; mimeType: string }> {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (!result.base64) throw new Error('Image compression failed.');
    // Verify compressed size <= 2MB
    const sizeBytes = (result.base64.length * 3) / 4;
    if (sizeBytes > 2 * 1024 * 1024) {
      // Try harder compression
      const smaller = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (!smaller.base64) throw new Error('Image compression failed.');
      return { base64: smaller.base64, mimeType: 'image/jpeg' };
    }
    return { base64: result.base64, mimeType: 'image/jpeg' };
  },

  async identifyPlant(imageUri: string): Promise<IdentificationResult & { identified: boolean; error?: string }> {
    const { base64, mimeType } = await identificationService.compressImage(imageUri);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated.');

    const response = await supabase.functions.invoke('identify-plant', {
      body: { imageBase64: base64, mimeType, imageStoragePath: '' },
    });

    if (response.error) throw new Error(response.error.message ?? 'Identification failed.');
    return response.data;
  },

  async checkDuplicate(userId: string, scientificName: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_plants')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .ilike('plants.scientific_name', scientificName.trim())
      .limit(1);
    return (data?.length ?? 0) > 0;
  },
};
```

═══ STEP 3: Build /src/screens/ScanScreen.tsx ═══

Layout:
- Full-screen camera viewfinder using expo-camera CameraView component
- Thin white corner bracket guides (not a full border — just 4 corner accents)
- Bottom panel: linen background (#EDE7DA), 28px top radius, soft shadow upward
  - Title "Identify a Plant" in DM Serif Display 22px, soil color
  - Subtitle in bark color, DM Sans 13px
  - Large circular capture button: green700 background, white camera icon (Feather),
    surrounded by a subtle linen ring (border: 3px linen, box-shadow: green200)
  - Location indicator row: small map-pin Feather icon (green600), bark text showing
    "Barangay / City" or "Location off" with a soft toggle
  - Tips row (3 pills): "Good lighting" / "Clear focus" / "Hold steady"
    Each pill: stone border, parchment background, bark text, Feather icon

Capture preview state (after photo taken, before identifying):
- Shows the captured image (full width, rounded bottom corners clipped)
- Two buttons side by side:
  "Retake" — secondary style (stone border, bark text)
  "Identify This Plant" — primary green700, white text, leaf icon
- Loading overlay (when identifying): semi-transparent linen overlay,
  ActivityIndicator in green700, "Identifying your plant…" in DM Serif Display 18px

Permission denied state:
- Centered parchment screen
- 🔒 icon + "Camera Access Required" in DM Serif Display
- Bark text explaining why
- "Open Settings" button in green700

═══ STEP 4: Build /src/screens/IdentificationResultScreen.tsx ═══

Props (from navigation): result: IdentificationResult & { identified: boolean }, capturedImageUri: string

Layout:
- Hero: captured image, 220px tall, no border-radius on top (edge-to-edge)
- Confidence badge: absolute positioned top-right of hero image
  - ≥80%: green200 bg, green700 text "89% match" + leaf icon
  - 60–79%: warningBg bg, warning text
  - <60%: terraLight bg, terra text
- Below hero: linen sheet with 24px top radius (slides up over bottom of image)
  - Common name: DM Serif Display 28px, soil color
  - Scientific name: DM Serif Display italic 16px, bark color
  - Tag pills row: "Succulent", "Indoor", "Low Water" — lavenderLight bg, lavender border
  - Care grid (3 columns): each card has linen bg, stone border, green500 icon,
    bark label, soil value — DM Sans 12px label uppercase, 13px value
  - Location row: map-pin icon (green600), bark text "Discovered at [label]"
  - If confidence < 0.6: "Not confident? See top matches" section
    - Radio-style list of alternatives, each with confidence %, linen bg rows
    - User must select one before Save is enabled
- Two buttons at bottom (fixed, not scrolling):
  "Retake" — 40% width, secondary stone-border style
  "Save to Collection" — 56% width, green700 primary

Save behavior (same as before):
1. Duplicate check → Alert if found → user chooses Add Again or View Existing
2. Upload image → upsert plant → insert user_plant → navigate to PlantDetailScreen

═══ STEP 5: Verify ═══

Run: npx tsc --noEmit — zero errors required.
```

---

## ══════════════════════════════════════════════
## PART 4 OF 7 — Collection, Plant Details & Notes
## (PUF007, PUF008, PUF009, PUF010, PUF011, PUF013)
## ══════════════════════════════════════════════

```
Continue building PICUFLA. Parts 1–3 are complete.
Build the plant collection, detail view, notes, and tags.

═══ STEP 1: Create /src/services/plantService.ts ═══

```typescript
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import type { UserPlant, IdentificationResult } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Config } from '../constants/config';

export const plantService = {

  // ── Upload captured image to Supabase Storage ──
  async uploadPlantImage(userId: string, imageUri: string): Promise<string> {
    const imageId = uuidv4();
    const path = `${userId}/${imageId}.jpg`;
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const { error } = await supabase.storage
      .from('plant-images')
      .upload(path, decode(base64), {
        contentType: 'image/jpeg',
        upsert: false,
      });
    if (error) throw new Error('Failed to upload image. ' + error.message);
    const { data } = supabase.storage.from('plant-images').getPublicUrl(path);
    // NOTE: bucket is private so getPublicUrl returns a signed URL pattern.
    // For display, use createSignedUrl instead:
    const { data: signed } = await supabase.storage
      .from('plant-images')
      .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 day expiry
    return signed?.signedUrl ?? data.publicUrl;
  },

  // ── Upsert plant master record ──
  async upsertPlant(result: IdentificationResult): Promise<string> {
    // Find by scientific name first
    const { data: existing } = await supabase
      .from('plants')
      .select('id')
      .ilike('scientific_name', result.scientific_name.trim())
      .single();

    if (existing?.id) return existing.id;

    // Insert new plant via service role (Edge Function) or directly
    // Since plants table has no insert policy for authenticated users,
    // use a dedicated Edge Function or adjust RLS for this specific case.
    // For development: temporarily allow insert to authenticated users.
    // For production: create an upsert-plant Edge Function.
    const { data, error } = await supabase
      .from('plants')
      .insert({
        common_name: result.common_name,
        scientific_name: result.scientific_name.trim().toLowerCase(),
        description: result.description,
        origin: result.origin,
        care_watering: result.care_watering,
        care_sunlight: result.care_sunlight,
        care_soil: result.care_soil,
        uses: result.uses,
      })
      .select('id')
      .single();

    if (error) throw new Error('Failed to save plant data.');
    return data.id;
  },

  // ── Save user plant (after identification confirmed) ──
  async saveUserPlant(
    userId: string,
    plantId: string,
    capturedImageUrl: string,
    confidenceScore: number,
    locationCoords: { lat: number | null; lng: number | null; label: string | null }
  ): Promise<string> {
    const { data, error } = await supabase
      .from('user_plants')
      .insert({
        user_id: userId,
        plant_id: plantId,
        discovered_at: new Date().toISOString(),
        location_lat: locationCoords.lat,
        location_lng: locationCoords.lng,
        location_label: locationCoords.label,
        confidence_score: confidenceScore,
        captured_image_url: capturedImageUrl,
        notes: null,
        is_favorite: false,
        tags: [],
        is_deleted: false,
      })
      .select('id')
      .single();

    if (error) throw new Error('Failed to save plant to collection.');
    return data.id;
  },

  // ── Get reverse geocode label from GPS ──
  async getLocationLabel(lat: number, lng: number): Promise<string | null> {
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (!place) return null;
      const parts = [place.street, place.district, place.city].filter(Boolean);
      return parts.join(', ') || null;
    } catch {
      return null;
    }
  },

  // ── Fetch user collection ──
  async getUserPlants(userId: string): Promise<UserPlant[]> {
    const { data, error } = await supabase
      .from('user_plants')
      .select('*, plant:plants(*)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('discovered_at', { ascending: false });

    if (error) throw new Error('Failed to load collection.');
    return (data ?? []) as UserPlant[];
  },

  // ── Toggle favorite ──
  async toggleFavorite(userPlantId: string, isFavorite: boolean): Promise<void> {
    const { error } = await supabase
      .from('user_plants')
      .update({ is_favorite: isFavorite })
      .eq('id', userPlantId);
    if (error) throw new Error('Failed to update favorite.');
  },

  // ── Update notes ──
  async updateNotes(userPlantId: string, notes: string): Promise<void> {
    if (notes.length > Config.MAX_NOTES_LENGTH) {
      throw new Error(`Notes must be ${Config.MAX_NOTES_LENGTH} characters or less.`);
    }
    const { error } = await supabase
      .from('user_plants')
      .update({ notes: notes.trim() || null, notes_updated_at: new Date().toISOString() })
      .eq('id', userPlantId);
    if (error) throw new Error('Failed to save notes.');
  },

  // ── Update tags (normalized, deduplicated, max 10) ──
  async updateTags(userPlantId: string, tags: string[]): Promise<void> {
    const normalized = [...new Set(tags.map(t => t.trim().toLowerCase()).filter(Boolean))];
    if (normalized.length > Config.MAX_TAGS_PER_PLANT) {
      throw new Error(`Maximum ${Config.MAX_TAGS_PER_PLANT} tags allowed.`);
    }
    const { error } = await supabase
      .from('user_plants')
      .update({ tags: normalized })
      .eq('id', userPlantId);
    if (error) throw new Error('Failed to update tags.');
  },

  // ── Soft delete plant ──
  async deleteUserPlant(userPlantId: string): Promise<void> {
    const { error } = await supabase
      .from('user_plants')
      .update({ is_deleted: true })
      .eq('id', userPlantId);
    if (error) throw new Error('Failed to delete plant.');
  },
};
```

═══ STEP 2: Build /src/screens/CollectionScreen.tsx ═══

- On mount: subscribe to real-time changes via:
  ```typescript
  supabase.channel('user_plants').on('postgres_changes', { event: '*', schema: 'public', table: 'user_plants', filter: `user_id=eq.${userId}` }, () => refetch()).subscribe()
  ```

Design:
- Parchment background (#F7F3EC)
- Page header: DM Serif Display "My Plants" 28px, bark subtitle "X discoveries"
- Filter icon button (Feather sliders): card background, stone border, rounded
- Search bar: card background, stone border, 12px radius, Feather search icon in bark,
  sort icon (Feather) on right
- Stats row: small horizontal pills showing total / favorites / tags
  Each pill: card bg, stone border, green500 icon, bark text
- 2-column plant grid with 10px gap, 16px side padding

PlantCard component design:
- card background, 16px radius, Theme.shadow.sm
- Image: 110px tall, rounded top, linen background for placeholder
- Favorite heart: absolute top-right, 26px circle, card bg, 85% opacity
  Active heart: blush/rose color (Colors.blushDark)
- Bottom: 10px padding — common name 13.5px DM Sans SemiBold soil,
  scientific name 11px DM Serif Display italic bark,
  discovery date row with clock icon in bark
- Tags: lavenderLight pill chips, 9.5px DM Sans, lavender text

Empty state: centered 🌱 emoji 64px + DM Serif Display "Start Your Collection" +
  bark subtitle + green700 button

Offline banner: terraLight bg, 4px terra left border, terra dot + "Offline" DM Sans Medium

═══ STEP 3: Build /src/screens/PlantDetailScreen.tsx ═══

Route param: userPlantId (string)

Design:
- Hero image 220px, edge-to-edge, no top radius
- Back button: dark semi-transparent circle, white Feather arrow-left
- Favorite button: dark semi-transparent circle (active = blushDark/rose fill)
- Location pill: absolute bottom of hero, dark semi-transparent bg, white text

Below hero (scrollable, parchment background):
1. Plant name area:
   - Common name: DM Serif Display 28px soil, line-height 1.05
   - Scientific name: DM Serif Display italic 16px bark
   - Confidence chip (small, right-aligned): same color logic as result screen

2. Description: DM Sans 14px bark, line-height 1.65, 18px bottom margin

3. Care Guide section:
   - Section label: DM Sans 11px uppercase letter-spacing 0.1em bark
   - List card: card bg, stone border, 16px radius
   - Each row: 12px left Feather icon (green600), label 11px bark, value 13.5px soil
   - Rows: Watering / Sunlight / Soil / Uses — separated by stone dividers

4. Notes section:
   - Section label same as above
   - View mode: card bg, stone border, 16px radius, 12px padding
     Italic bark text (or bark placeholder "Add your observations…")
     Bottom row: pencil icon + "Last edited X" in 10.5px bark
   - Edit mode: same container, TextInput, character counter "148 / 500" bark
     Save button (small, green700, right-aligned) appears only in edit mode

5. Tags section:
   - Chips: lavenderLight bg, lavender border, soil text, pill shape
   - "＋ Add tag" chip: stone border dashed, bark text
   - Input appears inline when adding, normalized to lowercase on save

6. Reminders row:
   - green100 bg, green400 left border (4px), 10px radius
   - Bell icon (green700), "Water · Monday 8:00 AM" soil text, chevron right bark

7. Delete Plant: bark text button at bottom, shows confirmation sheet before deleting

Favorite toggle: optimistic update → revert on failure

═══ STEP 4: Verify ═══

Run: npx tsc --noEmit — zero errors.
```

---

## ══════════════════════════════════════════════
## PART 5 OF 7 — Favorites, Offline Mode & Reminders
## (PUF012, PUF014, PUF015, PUF016)
## ══════════════════════════════════════════════

```
Continue building PICUFLA. Parts 1–4 are complete.

═══ STEP 1: Offline cache — /src/services/cacheService.ts ═══

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserPlant } from '../types';

const getCacheKey = (userId: string) => `picufla_plants_${userId}`;
const SYNC_KEY = (userId: string) => `picufla_last_sync_${userId}`;

export const cacheService = {

  async savePlants(userId: string, plants: UserPlant[]): Promise<void> {
    // Strip large image URLs from cache to save space — reload from Storage on detail view
    const lean = plants.map(p => ({ ...p, captured_image_url: p.captured_image_url }));
    await AsyncStorage.setItem(getCacheKey(userId), JSON.stringify(lean));
    await AsyncStorage.setItem(SYNC_KEY(userId), new Date().toISOString());
  },

  async getPlants(userId: string): Promise<UserPlant[]> {
    const raw = await AsyncStorage.getItem(getCacheKey(userId));
    return raw ? (JSON.parse(raw) as UserPlant[]) : [];
  },

  async getLastSync(userId: string): Promise<Date | null> {
    const raw = await AsyncStorage.getItem(SYNC_KEY(userId));
    return raw ? new Date(raw) : null;
  },

  async clearPlants(userId: string): Promise<void> {
    await AsyncStorage.removeItem(getCacheKey(userId));
    await AsyncStorage.removeItem(SYNC_KEY(userId));
  },
};
```

═══ STEP 2: Build /src/screens/FavoritesScreen.tsx ═══

- Filter useCollectionStore plants by is_favorite === true
- Same 2-column grid as CollectionScreen
- Empty state: "No favorites yet. Heart a plant to add it here."
- Real-time updates via the same Supabase subscription as CollectionScreen

═══ STEP 3: Create /src/services/reminderService.ts ═══

```typescript
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { permissionService } from './permissionService';
import type { Reminder } from '../types';

// Set notification handler once at app startup in App.tsx:
// Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }) });

export const reminderService = {

  async scheduleLocalNotification(reminder: Omit<Reminder, 'id' | 'created_at' | 'expo_push_token'>): Promise<string | null> {
    const status = await permissionService.getNotificationStatus();
    if (status !== 'granted') return null;

    const scheduledAt = new Date(reminder.scheduled_at);
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🌿 Plant Care Reminder`,
        // Only include minimal, non-sensitive data in notification payload
        body: `Time to ${reminder.care_type}${reminder.custom_label ? ': ' + reminder.custom_label : ''} your plant!`,
        data: { userPlantId: reminder.user_plant_id, careType: reminder.care_type },
      },
      trigger: {
        date: scheduledAt,
        repeats: false,
      },
    });
    return notificationId;
  },

  async cancelLocalNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  async getExpoPushToken(): Promise<string> {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    return token;
  },

  async saveReminder(
    userId: string,
    userPlantId: string,
    careType: Reminder['care_type'],
    scheduledAt: Date,
    isRecurring: boolean,
    recurringInterval: Reminder['recurring_interval'],
    customLabel: string | null
  ): Promise<void> {
    const status = await permissionService.requestNotifications();
    if (status !== 'granted') {
      throw new Error('Notifications permission denied. Enable notifications in your device Settings to use reminders.');
    }

    const expoPushToken = await reminderService.getExpoPushToken();

    const reminderData = {
      user_id: userId,
      user_plant_id: userPlantId,
      care_type: careType,
      custom_label: customLabel,
      scheduled_at: scheduledAt.toISOString(),
      is_recurring: isRecurring,
      recurring_interval: isRecurring ? recurringInterval : null,
      expo_push_token: expoPushToken,
      is_active: true,
    };

    const { error } = await supabase.from('reminders').insert(reminderData);
    if (error) throw new Error('Failed to save reminder.');

    // Schedule local notification
    await reminderService.scheduleLocalNotification(reminderData as any);
  },

  async deleteReminder(reminderId: string): Promise<void> {
    const { data: reminder } = await supabase
      .from('reminders')
      .select('id')
      .eq('id', reminderId)
      .single();

    if (reminder) {
      await reminderService.cancelLocalNotification(reminderId);
      const { error } = await supabase
        .from('reminders')
        .update({ is_active: false })
        .eq('id', reminderId);
      if (error) throw new Error('Failed to delete reminder.');
    }
  },

  async getRemindersForPlant(userPlantId: string): Promise<Reminder[]> {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_plant_id', userPlantId)
      .eq('is_active', true)
      .order('scheduled_at', { ascending: true });
    if (error) throw new Error('Failed to load reminders.');
    return (data ?? []) as Reminder[];
  },
};
```

═══ STEP 4: Build /src/screens/ReminderScreen.tsx ═══

Route params: userPlantId (string), commonName (string)

Layout:
- Header: "Reminders for [commonName]"
- Existing reminders list (from reminderService.getRemindersForPlant)
  - Each row: care type icon, care type label, scheduled date/time, delete button
- "Add Reminder" section:
  - Care type picker: Water / Fertilize / Repot / Custom
  - If Custom: text input for label
  - Date picker (expo DateTimePicker)
  - Time picker
  - Recurring toggle
  - If recurring: interval picker (Daily / Weekly / Monthly)
  - "Save Reminder" button

Save behavior:
- Validate scheduled_at is in the future (error: "Reminder must be set for a future time")
- Call reminderService.saveReminder
- On permission denied: show message "Enable notifications in Settings to use reminders" — do NOT navigate away or crash
- On success: add to list, clear form

Delete behavior:
- Confirm alert before deletion
- Call reminderService.deleteReminder
- Remove from list

═══ STEP 5: Verify ═══

Run: npx tsc --noEmit — zero errors.
```

---

## ══════════════════════════════════════════════
## PART 6 OF 7 — Profile, Account Management & DPA Compliance
## (PUF002b, PUF017)
## ══════════════════════════════════════════════

```
Continue building PICUFLA. Parts 1–5 are complete.

═══ STEP 1: Create /supabase/functions/delete-user/index.ts ═══

This Edge Function handles account deletion (DPA compliant, 30-day soft delete).

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Verify JWT
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const body = await req.json();
  const { confirmationText, deletionType } = body;

  // Server-side typed confirmation check
  if (confirmationText !== 'DELETE') {
    return new Response(
      JSON.stringify({ error: 'Type DELETE to confirm.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  if (!['account', 'plant_data'].includes(deletionType)) {
    return new Response(
      JSON.stringify({ error: 'Invalid deletion type.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const purgeAfter = new Date();
  purgeAfter.setDate(purgeAfter.getDate() + 30); // 30 days per DPA

  if (deletionType === 'account') {
    // Soft-delete: mark account for deletion, purge after 30 days
    await supabase.from('profiles').update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    }).eq('id', user.id);

    // Revoke all sessions immediately
    await supabase.auth.admin.signOut(user.id, 'global');
  }

  // Log the deletion request (audit trail)
  await supabase.from('deletion_audit_log').insert({
    user_id: user.id,
    deletion_type: deletionType,
    requested_at: new Date().toISOString(),
    purge_after: purgeAfter.toISOString(),
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: deletionType === 'account'
        ? 'Your account has been scheduled for deletion. All data will be purged within 30 days.'
        : 'Your plant data has been scheduled for deletion within 30 days.',
      purgeAfter: purgeAfter.toISOString(),
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
```

Note: The actual 30-day data purge (deleting Storage files and DB rows) should be
triggered by a scheduled Supabase database function or a separate cron Edge Function.
For development purposes, the soft-delete flag is sufficient.

═══ STEP 2: Build /src/screens/ProfileScreen.tsx ═══

Design:
- Parchment background throughout
- Profile hero area (no dark header — keep it light and warm):
  - Avatar: 72px circle, green200 bg, DM Serif Display initials soil color
    Small green600 checkmark badge bottom-right
  - Display name: DM Serif Display 22px soil
  - Email + auth provider badge: bark DM Sans, green100 pill badge for provider

- Stats row: 3 equal cards with linen bg, stone border, 12px radius
  Each: DM Serif Display 22px green700 number, DM Sans 10.5px bark label

- Settings sections use grouping cards (card bg, stone border, 16px radius):

  Section "Preferences":
    - Notifications toggle row: notification bell Feather icon (green200 bg chip),
      "Push notifications" soil label, custom toggle (green700 when on, stone when off)
    - Location row: map-pin icon, "Location access", chevron → opens device Settings
    - Offline sync: wifi-off icon, "Offline mode", bark subtitle "Synced X min ago"

  Section "Account":
    - Privacy Policy: shield icon, chevron
    - Log out: log-out icon, soil text
    - Erase Plant Data: trash icon (terraLight bg), terra text
    - Delete Account: trash-2 icon (errorBg), error text

- Footer: 11px bark centered DPA notice

All icons use @expo/vector-icons Feather at 16px, in small 32px rounded-8 chip containers.
Icon container colors: green100 for standard, terraLight for warning, errorBg for danger.

═══ STEP 3: Logout flow ═══

Logout button handler:
1. Show confirmation Alert "Log out of PICUFLA?"
2. On confirm:
   a. Call authService.logout()
   b. Cancel all scheduled local notifications: Notifications.cancelAllScheduledNotificationsAsync()
   c. Clear AsyncStorage cache: cacheService.clearPlants(userId)
   d. Call useAuthStore.clearAuth()
   e. Navigate to Login and RESET the navigation stack (CommonActions.reset)
      so the user cannot press Back to return to authenticated screens

═══ STEP 4: Delete flows (both require typed confirmation) ═══

For BOTH "Erase Plant Data" and "Delete Account":
1. Show a modal with:
   - Warning explanation
   - "Type DELETE to confirm" text
   - TextInput (no autocorrect, no autocapitalize)
   - Confirm button (disabled until input === 'DELETE')
   - Cancel button
2. On confirm:
   - Show loading spinner
   - Call the delete-user Edge Function via supabase.functions.invoke
   - The Edge Function also validates 'DELETE' server-side
   - On "account" type: sign out + clear cache + navigate to Login + reset stack
   - On "plant_data" type: clear cache + refresh collection + show success toast

═══ STEP 5: Build /src/screens/PrivacyPolicyScreen.tsx ═══

Static scrollable screen with the following sections:
- Data We Collect (camera, location, plant data, usage logs)
- How We Use Your Data (plant identification, personal collection)
- Data Storage (Supabase cloud infrastructure)
- Your Rights (access, correction, deletion)
- Data Retention (30-day deletion policy)
- Contact (placeholder email)
- Reference to Philippine Data Privacy Act of 2012

═══ STEP 6: Verify ═══

Run: npx tsc --noEmit — zero errors.
```

---

## ══════════════════════════════════════════════
## PART 7 OF 7 — Navigation, App Entry Point & Final Audit
## ══════════════════════════════════════════════

```
Continue building PICUFLA. Parts 1–6 are complete.
Wire everything together and run the final security audit.

═══ STEP 1: Create /src/navigation/AuthStack.tsx ═══

```typescript
import { createStackNavigator } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import LoginScreen from '../screens/LoginScreen';
import EmailRegisterScreen from '../screens/EmailRegisterScreen';
import EmailLoginScreen from '../screens/EmailLoginScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="EmailRegister" component={EmailRegisterScreen} />
      <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </Stack.Navigator>
  );
}
```

═══ STEP 2: Create /src/navigation/AppTabs.tsx ═══

Three tabs: Collection (Feather "book-open" icon), Scan (Feather "aperture" icon), Profile (Feather "user" icon)

Each tab has its own Stack navigator:
- CollectionTab: Collection → PlantDetail → Reminders
- ScanTab: Scan → IdentificationResult
- ProfileTab: Profile → PrivacyPolicy

Tab bar styling:
- backgroundColor: Colors.tabBg (#F7F3EC) — warm parchment, not white
- borderTopColor: Colors.stone at 50% opacity
- height: 70px, paddingTop: 10px
- Active tab: Feather icon + label in Colors.tabActive (#4E6B52),
  small green100 pill background (28px × 28px rounded-8) behind icon
- Inactive: Colors.tabInactive (#B5A898)
- Label: DM Sans 10px, letter-spacing 0.02em
- No tab bar label shift — keep icons and labels vertically stable

═══ STEP 3: Create root App.tsx ═══

```typescript
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { NavigationContainer } from '@react-navigation/native';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './src/hooks/useAuth';
import AuthStack from './src/navigation/AuthStack';
import AppTabs from './src/navigation/AppTabs';
import { Colors } from './src/constants/colors';

// Configure notification handler ONCE at app level
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.cream }}>
        <ActivityIndicator size="large" color={Colors.green600} />
      </View>
    );
  }

  return session ? <AppTabs /> : <AuthStack />;
}

export default function App() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
```

IMPORTANT: the polyfill imports must be at the VERY TOP of App.tsx,
before any other imports. Order matters.

═══ STEP 4: Create README.md ═══

Include:
1. Project overview (what PICUFLA is)
2. Prerequisites: Node.js 18+, Expo CLI, Supabase CLI, Deno, Docker (for Edge Functions local dev)
3. Setup steps:
   a. Clone repo
   b. npm install
   c. Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
   d. Run Supabase locally: supabase start
   e. Apply migrations: supabase db push
   f. Set Edge Function secrets: supabase secrets set OPENAI_API_KEY=sk-...
   g. Serve Edge Functions locally: supabase functions serve
   h. Start Expo: npx expo start
4. Environment variables table with explanations
5. SECURITY WARNING box: "Never commit .env to version control. Never add EXPO_PUBLIC_ prefix to OPENAI_API_KEY."
6. How to run on device (Expo Go for UI testing; development build required for Google OAuth and camera features)

═══ STEP 5: FINAL SECURITY AUDIT ═══

Go through every item in this list. Fix anything that does not pass.

AUTH & SESSION:
[ ] supabase.ts uses LargeSecureStore (encrypted AES session storage) — not plain AsyncStorage
[ ] No screen calls supabase.auth directly — all calls go through authService
[ ] onAuthStateChanged listener is set up in useAuth.ts and tears down on unmount
[ ] Login does NOT proceed if email_confirmed_at is null
[ ] Logout clears AsyncStorage cache AND cancels all local notifications AND resets navigation stack

API KEY SECURITY:
[ ] OPENAI_API_KEY exists ONLY in supabase/functions/identify-plant/index.ts via Deno.env.get
[ ] OPENAI_API_KEY is NOT in .env (it goes in Supabase Secrets, not .env)
[ ] No key prefixed EXPO_PUBLIC_ that is secret
[ ] imageBase64 is never logged or stored — only passed to OpenAI and discarded

DATABASE SECURITY:
[ ] Every table has: alter table [name] enable row level security;
[ ] Every RLS policy uses (select auth.uid()) not auth.uid() (the select wrapper improves performance)
[ ] identification_logs has NO insert policy for authenticated role — only service role writes
[ ] rate_limits has NO user-accessible policy — only service role reads/writes
[ ] deletion_audit_log has NO user-accessible policy
[ ] plants table has NO insert/update/delete policy for authenticated role

STORAGE SECURITY:
[ ] Bucket 'plant-images' is private (not public)
[ ] Storage insert policy checks: (storage.foldername(name))[1] = auth.uid()::text
[ ] Image signed URLs expire (7 days) — not permanent public URLs

INPUT VALIDATION:
[ ] All form inputs validated with Zod before any Supabase write
[ ] Notes length capped at 500 chars both client-side AND via DB constraint
[ ] Tags normalized to lowercase, deduplicated, max 10 — enforced client-side before write
[ ] Typed 'DELETE' confirmation validated on BOTH client and Edge Function server

EDGE FUNCTIONS:
[ ] Both Edge Functions verify auth JWT before any operation
[ ] identify-plant rate-limits to 10 calls/hour per user
[ ] identify-plant has 20-second timeout on OpenAI fetch
[ ] delete-user confirms deletionType is in ['account', 'plant_data']
[ ] No sensitive data logged in production (guard with env check)

NAVIGATION:
[ ] User cannot navigate back to authenticated screens after logout (navigation stack reset)
[ ] Loading spinner shown during auth state resolution — no screen flash

CONSOLE LOGS:
[ ] No console.log/error outside of: if (__DEV__) { ... } guards in React Native files
[ ] In Edge Functions (Deno): guard logs with: if (Deno.env.get('SUPABASE_ENV') !== 'production')

═══ STEP 6: Final TypeScript check ═══

Run: npx tsc --noEmit

All errors must be resolved. The app must compile cleanly before handoff.

═══ STEP 7: Smoke test checklist ═══

Test these flows manually before declaring the build complete:

[ ] Register with email → verify email → login → see empty collection
[ ] Scan camera → capture → identify plant → view result with confidence score
[ ] Save plant → appears in collection → tap to see detail
[ ] Add notes → character counter works → save succeeds
[ ] Add tags → lowercase normalization works → can filter by tag
[ ] Set reminder → notification fires at correct time
[ ] Toggle favorite → appears in favorites tab
[ ] Turn on airplane mode → collection shows cached plants → scan shows offline message
[ ] Logout → can't navigate back → login again → collection restored
[ ] Delete plant → disappears from collection (soft deleted)
[ ] Delete account → typed confirmation → account gone → redirected to login
```

---

## QUICK REFERENCE — Story ID to Part

| Story  | Description                         | Part |
|--------|-------------------------------------|------|
| PUF001 | Registration (Google + Email + OTP) | 2    |
| PUF002 | Login + session persistence         | 2    |
| PUF002b| Logout                              | 6    |
| PUF003 | Camera + Location permissions       | 2, 3 |
| PUF004 | Camera capture + preview + retake   | 3    |
| PUF005 | OpenAI identification + confidence  | 3    |
| PUF006 | Duplicate detection                 | 3    |
| PUF007 | Auto-save with GPS + geocoding      | 4    |
| PUF008 | Full plant details page             | 4    |
| PUF009 | Notes (500 char limit)              | 4    |
| PUF010 | Collection grid view                | 4    |
| PUF011 | Search + sort                       | 4    |
| PUF012 | Favorites                           | 5    |
| PUF013 | Tags (normalized, deduped, max 10)  | 4    |
| PUF014 | Offline mode                        | 5    |
| PUF015 | Set plant care reminders            | 5    |
| PUF016 | Edit / delete reminders             | 5    |
| PUF017 | Delete account — DPA compliant      | 6    |

---

## SECURITY COMMIT CHECKLIST

Run before every `git commit`:

- [ ] .env is in .gitignore and not tracked
- [ ] No real API keys in any committed file
- [ ] npx tsc --noEmit passes with zero errors
- [ ] No console.log outside __DEV__ guard
- [ ] All new DB tables have RLS enabled + correct policies
