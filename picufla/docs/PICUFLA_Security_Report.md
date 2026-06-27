# PICUFLA Security Implementation Report

**System:** PICUFLA — Plant Identification and Collection App
**Platform:** iOS & Android (React Native / Expo + Supabase)

---

## 1. System Overview

- Mobile app that identifies plants via photo using GPT-4o
- Users save plants to a personal collection with notes, tags, and reminders
- **Frontend:** React Native / Expo SDK 56
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI:** OpenAI GPT-4o (identification) + GPT-4o-mini (alternatives)
- **Auth:** Email/password or Google OAuth
- **Session:** Encrypted with AES-256, key stored in device secure hardware

### Data Flow

```
User → App → Supabase Auth (JWT) → Edge Function → OpenAI GPT-4o → Result → Database → Storage (signed URLs)
```

---

## 2. Threats & Vulnerabilities

| # | Threat | Impact | Mitigation |
|---|--------|--------|------------|
| 1 | OpenAI API key stolen | Unauthorized AI usage, cost | Key stored as server env var, never in app code |
| 2 | User accesses another user's data | Privacy breach | Row Level Security on all tables |
| 3 | Login token stolen from device | Account takeover | AES-256 encryption + expo-secure-store |
| 4 | Brute-force password guessing | Account compromise | Password strength validation (8+ chars, number, upper+lower) |
| 5 | Malicious image crashes system | Server overload, AI abuse | Rate limit (5/hour), file type/size checks |

---

## 3. Security Implementation

### 3.1 OpenAI Key Hidden on Server
- **File:** `supabase/functions/identify-plant/index.ts`
- The API key is read from a server environment variable — it never reaches the phone
- Users can only access the AI through the Edge Function, which is authenticated and rate-limited

### 3.2 Row-Level Security (RLS)
- **File:** `supabase/migrations/001_initial_schema.sql`
- Every user-data table (profiles, user_plants, reminders, identification_logs) has RLS policies
- Policies check `auth.uid() = user_id` — the database enforces data isolation even if the app has a bug

### 3.3 Session Encryption on Device
- **File:** `src/services/supabase.ts`
- Login tokens are encrypted with AES-256-CTR before saving to AsyncStorage
- The encryption key is stored separately in expo-secure-store (hardware-backed secure storage)
- Result: stolen storage files yield only encrypted gibberish

### 3.4 Input Validation
- All user inputs validated before submission: email format, password strength, notes length (500 chars), tags limit (10 per plant), OTP format (6 digits)
- Zod schemas used for registration; inline validation for other forms
- Bad inputs rejected immediately with user-friendly error messages

### 3.5 Rate Limiting — 5 Identifications Per Hour
- **File:** `supabase/functions/identify-plant/index.ts`
- Server tracks call count per user in a rolling 1-hour window
- At 5 calls, server returns HTTP 429 ("Too many requests")
- Prevents API cost abuse and keeps the feature fair

### 3.6 Image Security
- File size limit: 15MB (upload), 4MB (Edge Function check)
- Allowed formats: JPEG, PNG, WebP only
- Storage bucket is private — images accessed via signed URLs (7-day expiry)
- RLS on storage: users can only access files in their own folder (`auth.uid()/`)

### 3.7 Account Deletion
- Requires typing "DELETE" to confirm
- Uses `delete-user` Edge Function with service role for secure operation
- Soft-deletes data (sets `is_deleted = true`) for 30-day recovery window
- Writes to `deletion_audit_log` with `purge_after` timestamp

---

## 4. CIA Triad Application

| Principle | Implementation |
|-----------|---------------|
| **Confidentiality** | RLS on all tables, AES-256 session encryption, private storage bucket with signed URLs, API keys in server env vars only |
| **Integrity** | Input validation on every form (Zod + inline), database constraints (CHECK on care_type, confidence_score range), deletion requires typed confirmation |
| **Availability** | Rate limiting (5 identifications/hour), offline mode with cached collection, graceful error handling for AI timeouts |

---

## 5. Conclusion

Security in PICUFLA works as **multiple layers**: the OpenAI key is safe on the server, but that doesn't help without rate limiting. RLS keeps data private, but wouldn't help if tokens were stored in plain text. Each layer covers a gap in another.

### Future Improvements

1. **Two-factor authentication** — add authenticator app codes
2. **Automated 30-day purge** — pg_cron scheduled job to hard-delete expired records
3. **Login rate limiting** — slow down repeated failed login attempts by IP/device
