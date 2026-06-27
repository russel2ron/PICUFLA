# PICUFLA — Presentation Notes

**PICUFLA = Picture Up Flora**

---

## 1. Overview

- Mobile app (iOS & Android) for plant identification and care
- Frontend: React Native / Expo SDK 56
- Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- AI: OpenAI GPT-4o (identification) + GPT-4o-mini (alternatives)
- Users take a photo → get instant ID + care guide → save to collection → set reminders

---

## 2. What Problem It Solves

| Problem | Solution |
|---------|----------|
| "What plant is this?" | GPT-4o identifies any plant from a photo |
| "How do I care for it?" | Care guide: watering, sunlight, soil, uses |
| "I forget my plants" | Push notification reminders |
| "Too many to remember" | Collection with search, sort, tags, favorites |
| "Is this the right one?" | Confidence score + alternative suggestions |
| "Where did I find this?" | Auto-captured location on save |

---

## 3. Emerging Technologies

| Technology | Role in PICUFLA |
|------------|-----------------|
| **GPT-4o** | Primary plant identification — analyzes image, returns structured plant data |
| **GPT-4o-mini** | Generates alternative species when confidence is low (<60%) |
| **Supabase Edge Functions (Deno)** | Serverless functions for identification and account deletion |
| **Expo SDK 56** | Latest cross-platform mobile framework (camera, notifications, location, secure storage) |
| **Supabase Realtime** | Live collection updates — new plants appear without refreshing |
| **Row Level Security (RLS)** | Database-level data isolation — users see only their own data |

---

## 4. Edge of the App

- **AI, not a database** — GPT-4o identifies any plant, no fixed plant catalog
- **Dual AI model** — GPT-4o primary + GPT-4o-mini for fallback alternatives
- **Optimistic updates** — plant appears in collection instantly after saving; DB syncs in background
- **Soft delete + 30-day purge** — complies with Philippine Data Privacy Act; recovery window
- **Serverless** — no server to maintain; Supabase + OpenAI handle everything
- **Offline mode** — cached collection accessible without internet
- **Rate limited** — 5 identifications per hour to manage costs and prevent abuse
- **Secure by design** — AES-256 encrypted tokens, RLS on all tables, signed image URLs (7-day expiry)

---

## 5. Flow of the Application (System Demo)

### A. First Time — Onboarding

```
App opens → 4 intro slides → Accept Terms → Allow permissions → Login screen
```

### B. Authentication

```
Login/Sign Up (email or Google)
  └─ Forgot Password: Email → OTP → Verify → Change Password → Login
  └─ First sign-up: Setup Profile (name, optional photo)
```

### C. Scan & Identify

1. Tap **Scan** tab (center of bottom nav)
2. Camera opens with overlay
3. Options: **Flash** toggle (off/on/auto) | **Gallery** picker | **Tips** modal
4. Take photo → **Preview** appears
5. Tap **Identify** → loading state
6. Image uploaded to `identify-plant` Edge Function → calls GPT-4o → returns result

### D. Results Screen

- **Draggable hero image** — swipe up/down to resize
- **Plant name** (common) + **scientific name** (italic)
- **Confidence badge** — percentage
- **Care guide** — Watering | Sunlight | Soil
- **Notes input** — optional
- **Location** — auto-captured when outdoors
- **Low confidence (<60%)?** → Alternative species shown as radio buttons
- **Save to Collection** or **Retake**

### E. Collection

- Flat list of all saved plants
- **Search** by name
- **Sort**: Newest | Oldest | A–Z | Z–A
- **Filter** by tag (modal)
- **Stats row**: favorites count, tags count, location spots
- Tap card → **Plant Detail**

### F. Plant Detail

- **Hero** with back/favorite buttons + location pill
- **Name** + **scientific name** + **confidence badge**
- **Description** (truncated 4 lines)
- **Care guide**: Watering | Sunlight | Soil | Uses
- **Notes**: tap Edit → type → Save (with character counter)
- **Tags**: tap +Add → type tag → Enter → remove by X
- **Reminders card** → navigate to Reminders
- **Delete Plant** (confirmation alert)

### G. Reminders

- List of existing reminders per plant
- **Add reminder**:
  1. Select **Care Type**: Water / Fertilize / Repot / Custom
  2. Pick **Date & Time** (inline calendar iOS, buttons Android)
  3. Toggle **Repeat**: Off / Daily / Weekly / Monthly
  4. Tap **Save Reminder**
- Push notification fires at scheduled time
- Delete reminder by trash icon

### H. Favorites

- Tap heart on any plant card or detail page
- **Favorites screen**: 2-column grid of favorited plants (accessible from collection stats row)

### I. Profile

- **Avatar** (initials or photo), **display name**, **email**, **auth provider** pill
- **Stats**: Discovered | Favorites | Reminders (counts)
- **Preferences**:
  - Push notifications toggle
  - Location access (opens device settings)
- **Account**:
  - Privacy Policy
  - **Erase Plant Data** — type "DELETE" to confirm → soft-deletes all plants
  - **Delete Account** — type "DELETE" → soft-deletes profile → purged after 30 days
- **Log Out** — clears cache, signs out
