# PICUFLA — Complete Sprint Plan

## Navigation Structure

```
Bottom Tabs (4 tabs)
├── 🌿 Collection (Dashboard)   ← redesigned with dashboard info hierarchy
├── 📸 Scan (center, elevated)  ← Google Lens-inspired UI 

---

## Implementation Order (10 Sprints)

```
Sprint 0: Research (PictureThis audit) + screen-by-screen UI audit + component library
     ↓
Sprint 1: Bug fixes + architecture (font hoisting, shared components, hooks, storage keys, appStore)
     ↓
Sprint 2: Auth redesign (landing screen + onboarding flow)
     ↓
Sprint 3: ScanScreen → Google Lens-style redesign
     ↓
Sprint 4: Collection → Dashboard redesign
     ↓
Sprint 5: Favorites tab + bottom nav redesign (elevated scan button)
     ↓
Sprint 6: Account deletion (full permanent delete via Edge Function)
     ↓
Sprint 7: Offline mode (automatic detection, remove manual toggle)
     ↓
Sprint 8: Visual polish (haptics, skeletons, toasts, animations, accessibility)
     ↓
Sprint 9: Final QA + performance + edge cases
```

---

## Sprint 0 ✅ COMPLETED

### Tasks
- [x] Research PictureThis (features, reviews, complaints, UX patterns)
- [x] Create PictureThis analysis report → `docs/picturethis-analysis.md`
- [x] Screen-by-screen UI audit → `docs/ui-audit.md`
- [x] Create component library: `src/components/`
  - Button, Input, Header, Card, Badge, EmptyState, LoadingScreen, OfflineBanner, Toast, Skeleton
- [x] Create `src/constants/storage.ts` — all AsyncStorage keys
- [x] Create `src/store/appStore.ts` — global state (offline, onboarding, fonts)

### Key Research Findings
- PICUFLA's biggest advantage: **trust** (PictureThis has dark patterns, hidden confidence scores, locked reminders)
- Keep reminders free, always show confidence + alternatives, no aggressive paywalls

---

## Sprint 1 — Bug Fixes + Architecture

### Bug Fixes

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `identificationService.ts:11` | `compress: 1.0` is lossless | Change to `compress: 0.7`, add adaptive resize strategy |
| 2 | `supabase/functions/identify-plant/index.ts:120` | Syntax error: `{D` | Remove stray `D` character |
| 3 | `CollectionScreen.tsx:46` | `React.useState` mixed with imported `useState` | Normalize to imported hook |
| 4 | `EmailLoginScreen.tsx:89` + `errorHandler.ts` | "Incorrect email or password" for network errors | Differentiate network vs auth errors in `getErrorMessage()` |

### Architecture Changes

| Task | Files | Detail |
|------|-------|--------|
| Hoist font loading | `App.tsx` + remove per-screen `useFonts()` from all 16 screens | Create FontContext or set `useAppStore.setFontsLoaded()`. Each screen checks global flag instead of loading fonts independently. |
| Replace per-screen spinners | All 16 screens | Replace `if (!fontsLoaded) return <View><ActivityIndicator /></View>` with `if (!fontsLoaded) return null` (handled by App-level loading) |
| Update LoginScreen CTAs | `LoginScreen.tsx` | Change "Sign Up" → "Get Started", "Sign In" → text link "Already have an account? Log In" |
| Use shared Input component | `EmailRegisterScreen.tsx`, `EmailLoginScreen.tsx`, etc. | Replace raw TextInput with `<Input />` component |
| Use shared Button component | All screens with buttons | Replace raw TouchableOpacity buttons with `<Button />` component |
| Use shared EmptyState | `CollectionScreen.tsx`, `FavoritesScreen.tsx` | Replace inline empty states with `<EmptyState />` |
| Use shared LoadingScreen | All screens | Replace inline spinners with `<LoadingScreen />` |
| Use shared OfflineBanner | `CollectionScreen.tsx` | Replace inline banner with `<OfflineBanner />` |
| Use shared Header | `PrivacyPolicyScreen.tsx`, `ReminderScreen.tsx` | Replace inline headers with `<Header />` |
| Use StorageKeys constants | All services | Replace string literals with `StorageKeys.X` references |
| Use appStore offline flag | `CollectionScreen.tsx`, `AppTabs.tsx` | Replace `useState` for offline with `useAppStore().isOffline` |

---

## Sprint 2 — Auth Redesign

### 2a. Landing Screen (`LoginScreen.tsx`)

| Element | Current | New |
|---------|---------|-----|
| Hero | Leaf emoji (🌿) | Custom plant Lottie animation or SVG illustration |
| App name | Plain text | Title with subtle fade-in entrance |
| Value prop | "Discover & collect every plant around you." | Same — strong, clear (keep) |
| Background | Solid `linen` | Subtle gradient with floating leaf particle animation |
| Primary CTA | "Sign Up" button | "Get Started" — prominent, elevated |
| Secondary CTA | "Sign In" button | Text link: "Already have an account? Log In" |
| Footer | Privacy policy text | Keep, with better formatting |

### 2b. Onboarding Flow (NEW)

**Screens**: `src/screens/onboarding/`
- `OnboardingWelcome.tsx` — What PICUFLA does (plant ID, collection, reminders)
- `OnboardingFeatures.tsx` — Feature showcase (AI ID, personal collection, care guides, offline)
- `OnboardingPermissions.tsx` — Explains why: camera, storage, location, notifications
- `OnboardingTerms.tsx` — Must explicitly accept Terms & Privacy Policy

**Storage**: Save `onboardingComplete` + `termsAccepted` in AsyncStorage (via `StorageKeys` constants)

**Flow**: "Get Started" → Onboarding screens → Login → Register or Sign In

**RootStackParamList** update: Add `Onboarding` route

### 2c. Login Screen Enhanced
- Animated entrance (fade-in for form card, staggered buttons)
- Press scale animations on buttons (via shared Button component)
- Better error display with inline icon + description
- Haptic on error

---

## Sprint 3 — ScanScreen: Google Lens Redesign

### Layout

```
┌─────────────────────────┐
│  [Flash ▼]    [Rate 3/5]│  ← overlay chips
│                         │
│     ┌───────────┐      │
│     │  SCAN     │      │  ← fullscreen camera
│     │   FRAME   │      │     corner guides + scanning arc
│     └───────────┘      │
│                         │
│  ┌───────────────────┐ │
│  │ 📷  |    ○    | 💡│ │  ← glassmorphic bottom bar
│  │ gal |  capture |flash│     (compact, ~80px, translucent+blur)
│  └───────────────────┘ │
└─────────────────────────┘
```

### Changes to `ScanScreen.tsx`

| Current | New |
|---------|-----|
| Camera fills top half | Fullscreen camera (`flex: 1`) |
| Solid bottom panel (40%) | Glassmorphic absolute bottom bar (80px, `position: 'absolute'`, `backdropFilter: 'blur'`) |
| Corner brackets only | Corner brackets + subtle scanning animation arc (Animated line sweep) |
| Tips modal (separate) | Floating info chip, auto-dismiss after 5s |
| Separate retake/identify screen | Preview is fullscreen image with overlay: [Retake] [Save] buttons |
| No flash toggle | Flash: auto/on/off cycle button |
| Stray icons in search (wrong screen) | Already removed in Sprint 1 |
| Location fetched on mount | Location fetched on capture (deferred) |

### New Component: `ScanOverlay.tsx`
- Corner brackets (animated border)
- Scanning arc animation
- Flash toggle chip
- Rate limit badge

### Preview Mode
After capture, show fullscreen image with:
- [Retake] [Identify This Plant] buttons overlaid at bottom
- Pinch-to-zoom on preview
- Error banner if identification fails

---
          
## Sprint 4 — Collection → Dashboard Redesign

### Layout

```
┌─────────────────────────────┐
│  🌿 Good morning, [Name]!  │ ← Greeting + avatar from useAuthStore
│  24 plants · 4 reminders   │ ← Quick stats
├─────────────────────────────┤
│  ┌───────┐ ┌───────┐       │
│  │ 📸    │ │ 📖    │       │ ← Quick action cards (2-col)
│  │Identify│ │Collection│   │
│  └───────┘ └───────┘       │
├─────────────────────────────┤
│  ❤️ Favorites               │
│  [Card] [Card] [Card] →    │ ← Horizontal scroll (last 5 favorites)
├─────────────────────────────┤
│  ⏰ Upcoming Reminders      │
│  💧 Water Snake Plant - Today│ ← Vertical list, fetched via single query
│  🌱 Fertilize Pothos - Tue  │
├─────────────────────────────┤
│  📊 Collection Summary      │
│  Total: 24 | Favorites: 8  │ ← Stats bar
│  Recent: 3 this week       │
├─────────────────────────────┤
│  Recent Discoveries         │
│  [2-col grid of last 6]    │ ← Plant cards
├─────────────────────────────┤
│  🔍 [Search plants...]  [Filter icon] │ ← search left, filter right
│  Newest | Oldest | A-Z | Z-A│
└─────────────────────────────┘
```

### What Stays
- Plant card component (enhanced)
- Search/sort/filter (moved below dashboard, search bar left + filter icon right)
- Offline banner (via shared component)
- Pull-to-refresh (refreshes everything)
- Realtime subscription

### What Changes
- Add greeting section with user name + avatar
- Add quick-action cards (Identify → navigate to ScanTab | Collection → scroll to grid)
- Add favorites horizontal scroll (last 5 favorited plants, tap → PlantDetail)
- Add upcoming reminders section (query: upcoming active reminders across all plants)
- Add collection summary stats
- Add "recent discoveries" grid (last 6 plants)
- Move search bar + sort below dashboard sections (search bar left, small filter icon right)
- Add staggered entrance animation for sections

### Reminder Query (optimal)
```ts
supabase
  .from('reminders')
  .select('*, user_plant:user_plants!inner(plant:plants(common_name, image_url))')
  .eq('user_id', userId)
  .eq('is_active', true)
  .gte('scheduled_at', new Date().toISOString())
  .order('scheduled_at')
  .limit(5)
```

---

## Sprint 5 — Favorites Tab + Bottom Navigation

### 5a. Favorites Tab

**Files**:
- `src/types/index.ts` — Add `FavoritesStackParamList` (`Favorites`, `PlantDetail`, `Reminders`)
- `src/screens/FavoritesScreen.tsx` — Enhance existing (pull-to-refresh, loading state, fetch data)
- `src/navigation/AppTabs.tsx` — Add FavoritesStack

**Layout**:
```
┌─────────────────────┐
│ ❤️ Favorites  (8)  │ ← Header with count from collectionStore
├─────────────────────┤
│ [2-col grid]        │ ← Same enhanced plant cards
│ [Card] [Card]       │
│ [Card] [Card]       │
└─────────────────────┘
```

- Pull-to-refresh to re-fetch collection
- Empty state: "No favorites yet — tap the heart on any plant"
- Uses `useCollectionStore` plants filtered by `is_favorite`
- Own stack: Favorites → PlantDetail → Reminders

### 5b. Bottom Navigation

**Tabs**:
```
[  🌿  ] [  📸  ] [  ❤️  ] [  👤  ]
Collection  Scan   Favorites  Profile
```

**Scan button (center, elevated)**:
- Circular container (68px vs 24px for others)
- Floating above tab bar (`translateY: -8`)
- Filled circle with `Colors.green700` background
- White camera icon
- Shadow/elevation for floating effect
- Ripple animation on press

**Implementation**: Custom `TabBar` component (instead of default), or custom `tabBarButton` for Scan tab.

---

## Sprint 6 — Account Deletion (Permanent)

### 6a. Edge Function (`supabase/functions/delete-user/index.ts`)

| Change | Detail |
|--------|--------|
| Remove soft-delete | No `is_deleted` flag, no 30-day window |
| Immediate permanent delete | Delete: profile, user_plants, reminders, identification_logs, rate_limits, deletion_audit_log |
| Storage cleanup | Delete all files in `plant-images/{userId}/` storage bucket |
| Auth user deletion | `supabaseClient.auth.admin.deleteUser(id)` |
| Require OTP re-auth | Accept OTP verification timestamp from client, validate it's < 10 min old |
| Return confirmation | Success message with deletion timestamp |

### 6b. Client (`SetupProfileScreen.tsx`)

| Change | Detail |
|--------|--------|
| Remove "30 days" messaging | "This permanently deletes your account. No recovery." |
| OTP flow | Before delete, trigger OTP send → user verifies → then confirmation |
| Confirm "DELETE" | Keep existing type-to-confirm pattern |
| Visual emphasis | Red styling, clear warning |
| Post-delete | Clear cache, clear auth state, redirect to Login |

---

## Sprint 7 — Offline Mode (Automatic)

| Change | Files | Detail |
|--------|-------|--------|
| Remove manual toggle | `ProfileScreen.tsx` | Remove offline mode Switch + `AsyncStorage` persistence |
| Global offline state | `useNetworkStatus.ts` | Store result in `useAppStore.setOffline()` |
| Persistent banner | Use `<OfflineBanner />` component | Show on Collection, Favorites, PlantDetail when offline |
| Cache on fetch | `CollectionScreen.tsx` | Already caches — ensure cache loads on offline |
| Offline scan | `ScanScreen.tsx` | Show "Go online to identify plants" overlay with icon |
| Offline profile | `ProfileScreen.tsx` | Show cached data + "(Offline)" badge |
| Auto-detect | `useNetworkStatus.ts` | Subscribe to NetInfo changes, update store |

---

## Sprint 8 — Visual Polish & Micro-Interactions

| Task | Detail |
|------|--------|
| Add `expo-haptics` | Shutter, save, favorite, delete, button press feedback |
| Skeleton loading | Use `<SkeletonGrid />` and `<SkeletonDetail />` components |
| Toast system | Use `showToast()` for: save success, tag added, favorite toggled, reminder saved |
| Button press animations | Already built into `<Button />` component |
| Collection cards | Stagger entrance animation (already partially done — enhance) |
| PlantDetail parallax | Hero image parallax effect on scroll |
| IdentificationResult stagger | Care guide sections fade in sequentially |
| Modal dismiss animations | Better backdrop fade, spring transitions |
| Accessibility pass | `accessibilityLabel` on all icon buttons, `accessibilityRole`, 44pt touch targets |
| Input focus states | Already built into `<Input />` component |
| Color indicators | Ensure all color-coded elements have text labels (confidence badges, status) |

---

## Sprint 9 — Final QA & Performance

| Task | Detail |
|------|--------|
| Cross-screen consistency | All screens use shared components, consistent spacing |
| Performance | `React.memo` on FlatList items, image caching, list optimization |
| Error state review | Every network call has error UI (not just Alert) |
| Edge cases | Empty collection, no internet, expired session, first launch, re-auth |
| Test account deletion | End-to-end: OTP → confirm → delete → verify gone |
| Update types | All new params, stacks, navigation params typed |
| Update `app.json` | Splash screen, app name, icon if needed |

---

## Files to Create (New)

| File | Sprint | Purpose |
|------|--------|---------|
| `src/components/Button.tsx` | S1 | Shared button (done ✅) |
| `src/components/Input.tsx` | S1 | Shared TextInput (done ✅) |
| `src/components/Header.tsx` | S1 | Screen header (done ✅) |
| `src/components/Card.tsx` | S1 | Card container (done ✅) |
| `src/components/Badge.tsx` | S1 | Badge variants (done ✅) |
| `src/components/EmptyState.tsx` | S1 | Empty state (done ✅) |
| `src/components/LoadingScreen.tsx` | S1 | Loading spinner (done ✅) |
| `src/components/OfflineBanner.tsx` | S1 | Offline banner (done ✅) |
| `src/components/Toast.tsx` | S1 | Toast system (done ✅) |
| `src/components/Skeleton.tsx` | S1 | Skeleton loader (done ✅) |
| `src/components/ScanOverlay.tsx` | S3 | Camera viewfinder overlay |
| `src/constants/storage.ts` | S1 | Storage keys (done ✅) |
| `src/store/appStore.ts` | S1 | Global app state (done ✅) |
| `src/screens/onboarding/OnboardingWelcome.tsx` | S2 | Onboarding screen 1 |
| `src/screens/onboarding/OnboardingFeatures.tsx` | S2 | Onboarding screen 2 |
| `src/screens/onboarding/OnboardingPermissions.tsx` | S2 | Onboarding screen 3 |
| `src/screens/onboarding/OnboardingTerms.tsx` | S2 | Onboarding screen 4 |

---

## Files to Modify

| File | Sprint | Changes |
|------|--------|---------|
| `App.tsx` | S1, S2 | Font hoisting (S1), add onboarding flow (S2) |
| `src/types/index.ts` | S2, S5 | Add `Onboarding` to RootStack (S2), add `FavoritesStackParamList`, update `AppTabParamList` (S5) |
| `src/navigation/AppTabs.tsx` | S5 | 4 tabs with elevated scan button |
| `src/navigation/AuthStack.tsx` | S2 | Add onboarding screens |
| `src/screens/LoginScreen.tsx` | S1, S2 | Update CTA labels (S1), full redesign with animations (S2) |
| `src/screens/ScanScreen.tsx` | S3 | Google Lens redesign |
| `src/screens/CollectionScreen.tsx` | S4 | Dashboard layout |
| `src/screens/FavoritesScreen.tsx` | S5 | Enhance with own stack navigation |
| `src/screens/PlantDetailScreen.tsx` | S6, S8 | Delete changes (S6), parallax hero (S8) |
| `src/screens/SetupProfileScreen.tsx` | S6 | Permanent account deletion with OTP |
| `src/screens/ProfileScreen.tsx` | S7 | Remove manual offline toggle |
| `src/screens/EmailLoginScreen.tsx` | S1 | Better error differentiation |
| `src/services/identificationService.ts` | S1 | Fix compression quality |
| `src/utils/errorHandler.ts` | S1 | Add network error differentiation |
| `src/hooks/useNetworkStatus.ts` | S7 | Store result in appStore |
| `supabase/functions/identify-plant/index.ts` | S1 | Fix syntax error |
| `supabase/functions/delete-user/index.ts` | S6 | Full permanent deletion |
