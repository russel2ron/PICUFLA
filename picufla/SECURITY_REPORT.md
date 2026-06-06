# PICUFLA Security Implementation Report

## 1. Executive Summary

PICUFLA is a React Native mobile application that uses AI-powered plant identification to help users build and manage a personal digital plant collection. The application processes sensitive user data including camera images, GPS location, and personal account information. Every security decision in PICUFLA is guided by the CIA triad — **Confidentiality, Integrity, and Availability** — ensuring that user data remains private, accurate, and accessible only to authorized parties. This report documents the identified threats, implemented controls, and remaining security posture of the application.

## 2. Identified Threats & Vulnerabilities

| ID | Threat | Category | Description | Impact |
|----|--------|----------|-------------|--------|
| T1 | API Key Exposure | Exposure | The OpenAI API key used for plant identification could be exposed if bundled in client-side code. An attacker extracting the key could make unauthorized API calls at the developer's expense. | Financial loss, service abuse |
| T2 | Unauthorized Data Access | Authorization | Without proper access controls, one authenticated user could read, modify, or delete another user's plant collection data. | Data breach, privacy violation |
| T3 | Session Token Theft | Authentication | Session JWTs stored unencrypted on device could be extracted via device backup, malware, or physical access. | Account takeover |
| T4 | Credential Enumeration | Authentication | A login endpoint that reveals whether an email is registered (e.g., "Email not found" vs "Wrong password") enables attackers to enumerate valid user accounts. | Information disclosure, targeted attacks |
| T5 | SQL / Parameter Injection | Injection | Maliciously crafted user inputs (notes, tags, search strings) could inject SQL or Supabase query operators if not sanitized. | Data corruption, unauthorized access |
| T6 | Unvalidated File Uploads | Input Validation | Users could upload oversized, malicious, or incorrectly formatted images, exhausting storage quota or crashing the identification service. | Denial of service, resource exhaustion |
| T7 | Privilege Escalation | Authorization | An authenticated user could attempt to write to admin-only tables (identification_logs, rate_limits, deletion_audit_log) if RLS policies are misconfigured. | Data integrity loss, audit trail tampering |
| T8 | Accidental Account Deletion | Integrity | A user could accidentally trigger account or data deletion without sufficient confirmation, resulting in permanent data loss. | Data loss, user frustration |
| T9 | API Rate Abuse | Availability | An attacker or buggy client could flood the OpenAI-powered identification endpoint, exhausting the developer's API quota and denying service to legitimate users. | Denial of service, financial loss |
| T10 | Data Privacy Violation | Compliance | If user data is not properly deleted upon request (right to erasure under DPA 2012), the application violates data privacy regulations. | Legal liability, regulatory penalties |

## 3. Security Controls Implemented

### C1 — OpenAI API Proxy
**Location:** `supabase/functions/identify-plant/index.ts`  
**Mitigates:** T1  
**CIA Principle:** Confidentiality  
**Implementation:** The OpenAI API key is stored exclusively as a Supabase Edge Function secret (`Deno.env.get('OPENAI_API_KEY')`). The React Native app never receives or stores the key. All identification requests are sent as image data to the Edge Function, which proxies them to OpenAI. The app only communicates with its own backend, never directly with OpenAI. The `EXPO_PUBLIC_` prefix (which would expose the key to the client bundle) is intentionally avoided for the OpenAI key.

### C2 — Row Level Security
**Location:** `supabase/migrations/001_initial_schema.sql`  
**Mitigates:** T2, T7  
**CIA Principle:** Confidentiality  
**Implementation:** RLS is enabled on every database table. Each policy enforces `(select auth.uid()) = user_id` or equivalent owner checks, ensuring no cross-user data access. Critical tables (`identification_logs`, `rate_limits`, `deletion_audit_log`) have **no authenticated-role insert policies** — only the `service_role` (used exclusively by Edge Functions) can write to them. This prevents any client-side user from tampering with audit trails or rate limit records.

### C3 — AES-256 Session Encryption
**Location:** `src/services/supabase.ts` (LargeSecureStore class)  
**Mitigates:** T3  
**CIA Principle:** Confidentiality  
**Implementation:** The `LargeSecureStore` class encrypts session JWTs using AES-256-CTR before persisting them to AsyncStorage. The encryption key is stored separately in `expo-secure-store`, which uses hardware-backed key storage on supported iOS and Android devices. An attacker with file-system access to AsyncStorage cannot read the raw JWT. On logout, the session is destroyed from both stores.

### C4 — Credential Enumeration Prevention
**Location:** `src/services/authService.ts` (loginWithEmail)  
**Mitigates:** T4  
**CIA Principle:** Confidentiality  
**Implementation:** The `loginWithEmail()` method catches any Supabase authentication error and throws a single, generic message: `'Incorrect email or password.'` This message is displayed regardless of whether the error was caused by a non-existent email or an incorrect password. The UI (`EmailLoginScreen`) always displays this combined message. No error code, Supabase error detail, or differentiating diagnostic information is shown to the user.

### C5 — Input Validation (Zod Schemas)
**Location:** `src/screens/EmailRegisterScreen.tsx`, `src/screens/EmailLoginScreen.tsx`, `src/screens/PlantDetailScreen.tsx`  
**Mitigates:** T5  
**CIA Principle:** Integrity  
**Implementation:** All user-facing forms validate inputs with Zod schemas before any Supabase write operation. Schemas enforce: valid email format, password strength (minimum 8 characters including at least one number), notes maximum 500 characters (`Config.MAX_NOTES_LENGTH`). Tags are normalized to lowercase, trimmed, and deduplicated before database write (`plantService.updateTags`). These validations are replicated at the database layer with PostgreSQL CHECK constraints for defense in depth.

### C6 — Image Upload Restrictions
**Location:** `supabase/migrations/002_storage.sql` + `src/services/identificationService.ts`  
**Mitigates:** T6  
**CIA Principle:** Integrity, Availability  
**Implementation:** Three layers of image validation: (1) The Supabase storage bucket enforces a maximum 5MB file size and restricts MIME types to `image/jpeg`, `image/png`, and `image/webp`. (2) The client-side `identificationService` compresses images to a maximum of 2MB before upload. (3) The Edge Function validates the decoded base64 size (maximum 4MB) before sending to OpenAI. These layered checks prevent storage exhaustion and malformed image processing.

### C7 — Role-Based Access Control (RLS + Service Role)
**Location:** Database RLS policies + Edge Function usage  
**Mitigates:** T7  
**CIA Principle:** Confidentiality, Integrity  
**Implementation:** Three authorization roles exist: **unauthenticated** (no table access), **authenticated** (read/write own rows only via RLS), and **service_role** (full access, Edge Functions only). Authenticated users cannot write to `identification_logs`, `rate_limits`, or `deletion_audit_log` — these tables have no authenticated write policies. Only Edge Functions, invoked with the service role JWT, can insert into these tables. This implements proper RBAC at the database layer, preventing any client-side privilege escalation.

### C8 — Typed Deletion Confirmation
**Location:** `src/screens/ProfileScreen.tsx` + `supabase/functions/delete-user/index.ts`  
**Mitigates:** T8  
**CIA Principle:** Integrity, Availability  
**Implementation:** Account and data deletion require the user to type the exact word `DELETE` (case-sensitive, trimmed) into a text input field. On the client side, the confirm button is disabled until the input matches. The Edge Function independently validates `confirmationText === 'DELETE'` server-side before any data modification occurs. This **defense-in-depth** approach prevents accidental deletion via UI glitches, tap-jacking, or programmatic trigger.

### C9 — API Rate Limiting
**Location:** `supabase/functions/identify-plant/index.ts`  
**Mitigates:** T9  
**CIA Principle:** Availability  
**Implementation:** A `rate_limits` table tracks the number of identification requests per user within a sliding 1-hour window. The Edge Function checks the call count before processing each request. If the user has exceeded the limit of 10 calls per hour, the function returns HTTP 429 with an explanatory message and does not call the OpenAI API. The rate limit window resets automatically after 60 minutes.

### C10 — DPA-Compliant Soft Deletion + Audit Log
**Location:** `supabase/functions/delete-user/index.ts` + `deletion_audit_log` table  
**Mitigates:** T10  
**CIA Principle:** Integrity  
**Implementation:** User deletion requests set `is_deleted = true` on affected rows rather than performing hard deletes. A `purge_after` timestamp is calculated as 30 days from the request date (satisfying the Philippine Data Privacy Act of 2012 right to erasure timeline). Every deletion request is recorded in the `deletion_audit_log` table with `user_id`, `deletion_type`, `requested_at`, and `purge_after`. The audit log has no authenticated write policies — it is append-only by Edge Functions with the service role, ensuring non-repudiation.

## 4. CIA Triad Analysis

### Confidentiality
- **Data isolation:** Row Level Security ensures each user can only access their own plant data, reminders, and profile. Cross-user data access is structurally impossible at the database layer.
- **API key secrecy:** The OpenAI API key is never exposed to the React Native client. It is stored exclusively as an Edge Function environment variable (`Deno.env.get`).
- **Session protection:** JWTs are encrypted with AES-256-CTR before AsyncStorage persistence. The encryption key is stored in `expo-secure-store` (hardware-backed on supported devices).
- **Error sanitization:** All error messages are sanitized before display. No raw Supabase error codes, SQL queries, or stack traces are shown to users. The login endpoint returns the same message for wrong email and wrong password.
- **Storage privacy:** The `plant-images` storage bucket is private (no public access). Images are served through signed URLs with a 7-day expiry (`plantService.ts`).

### Integrity
- **Input validation:** All user inputs are validated through Zod schemas on the client side, business-rule checks in service files (notes length, tag limits), and database CHECK constraints. Inconsistencies between layers would cause a write failure rather than corrupted data.
- **Deletion protection:** Account and data deletion require typed `DELETE` confirmation validated on both client and server. Accidental or malicious programmatic deletion is structurally prevented.
- **Non-repudiation:** The `deletion_audit_log` table records immutable audit entries for every deletion request. No user-facing policy allows writing to this table — only service-role Edge Functions can create audit records.
- **Data normalization:** Scientific names are lowercased before storage. Tags are trimmed, lowercased, and deduplicated. These normalizations prevent duplicate records and inconsistent query results.
- **Soft deletion:** Rather than hard-deleting rows, `is_deleted = true` flags are set. This preserves data integrity during the 30-day DPA compliance window and allows for potential recovery.

### Availability
- **Rate limiting:** The identification endpoint is limited to 10 requests per user per hour, preventing individual users from exhausting the OpenAI API quota and denying service to others.
- **Offline mode:** Plant collection data is cached locally via `cacheService` (AsyncStorage). When the network is unavailable, the app serves cached data and displays an "Offline · Last synced" banner, ensuring the core browsing feature remains available.
- **Timeout protection:** All async operations include appropriate timeout handling. The OpenAI Edge Function uses `AbortSignal.timeout(25000)` to prevent indefinite hangs.
- **Graceful degradation:** Every async operation in the app is wrapped in try/catch blocks. Network failures, database errors, and unexpected exceptions never crash the app — they display user-friendly error messages or fall back to cached data.

## 5. Authentication Implementation

PICUFLA uses **Supabase Auth** as its authentication provider, supporting both email/password and Google OAuth sign-in methods.

**Registration flow:**
1. User submits email and password, validated by Zod schema (email format, password ≥ 8 chars with ≥ 1 number).
2. Supabase creates the user account and sends a verification email.
3. The user must click the verification link before login is permitted — unverified accounts are blocked at login with `throw new Error('Please verify your email before logging in.')`.
4. After successful login, `profiles.last_login_at` is updated.

**Session management:**
1. On app launch, `useAuth()` restores the session from encrypted storage via `supabase.auth.getSession()`.
2. The `onAuthStateChange` listener tracks sign-in/sign-out lifecycle events in real time.
3. Sessions are encrypted with AES-256-CTR before AsyncStorage persistence. The encryption key is stored in `expo-secure-store` (hardware-backed).
4. On logout: Supabase session is destroyed, all scheduled notifications are cancelled, cached plant data is cleared, and the navigation stack is reset to prevent back-navigation to authenticated screens.

**Account deletion re-authentication:**
1. Email-password users must re-enter their password before the delete account flow proceeds.
2. Re-authentication calls `authService.reauthenticateWithPassword()`, which verifies credentials against Supabase.
3. If re-authentication fails, the deletion flow is blocked with an error message.
4. Google OAuth users see a prompt to sign in with Google again (re-auth through Google is handled by the OAuth provider).

## 6. Input Validation & Protection

PICUFLA implements validation at three independent layers, ensuring defense in depth:

| Layer | Technology | Examples |
|-------|-----------|----------|
| Client (UI) | Zod schemas | Email format, password strength, notes length (500 chars), tags limit (10), tag deduplication |
| Service | Business rules | `plantService.updateNotes` rejects > 500 chars. `plantService.updateTags` deduplicates and normalizes to lowercase. |
| Database | PostgreSQL CHECK | Column constraints mirror client rules. MIME types enforced at storage bucket level. |

**Edge Function validation:**
- Image base64 must be a non-empty string.
- Decoded size must not exceed 4MB.
- MIME type must be one of `image/jpeg`, `image/png`, `image/webp`.
- OpenAI response is validated for required fields before returning to client.

**Error handling:**
- All errors pass through `getErrorMessage()` in `src/utils/errorHandler.ts`, which produces user-friendly messages.
- Raw Supabase error codes, SQL queries, and stack traces are never exposed.
- The login endpoint returns the same message for wrong email and wrong password (enumeration prevention).

## 7. Role-Based Access Control

| Role | Tables Accessible | Notes |
|------|-------------------|-------|
| Unauthenticated | None (all tables require auth) | RLS blocks all access; redirect to Login screen |
| authenticated | `profiles` (own), `plants` (read), `user_plants` (own), `reminders` (own), `identification_logs` (read own) | RLS enforces `auth.uid() = user_id` on all writes. No authenticated write policies on admin tables. |
| service_role | All tables | Edge Functions only. Used for OpenAI proxying, rate limiting, and deletion audit logging. |

Tables with no authenticated write policies (service_role only):
- `identification_logs` — insert via Edge Function only
- `rate_limits` — upsert via Edge Function only
- `deletion_audit_log` — insert via Edge Function only

Tables accessible to authenticated users are protected by RLS policies that verify `auth.uid()` matches the row's owner, preventing any cross-user data access.

## 8. Security Testing Checklist

| Status | Test | Verification Method |
|--------|------|-------------------|
| ✅ PASS | OpenAI key not present in any `src/` file | `rg "OPENAI_API_KEY" src/ --no-results` |
| ✅ PASS | All tables have RLS enabled | Supabase SQL: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity = false;` returns 0 rows |
| ✅ PASS | `identification_logs` has no authenticated insert policy | Supabase SQL review of policies |
| ✅ PASS | `rate_limits` has no authenticated policy | Supabase SQL review of policies |
| ✅ PASS | `deletion_audit_log` has no authenticated policy | Supabase SQL review of policies |
| ✅ PASS | Session storage uses AES-256 encryption | Code review of `src/services/supabase.ts` — `aesjs.ModeOfOperation.ctr` with 256-bit key |
| ✅ PASS | Login returns same error for wrong email vs wrong password | Unit test: verify error message is identical for both cases |
| ✅ PASS | Notes > 500 chars blocked by both Zod and DB constraint | Manual test: attempt to save 501-char note → blocked at client and DB layers |
| ✅ PASS | Deletion requires typed 'DELETE' on client AND server | Code review: `ProfileScreen.tsx` checks `input.trim() === 'DELETE'`; Edge Function checks `confirmationText === 'DELETE'` |
| ✅ PASS | Storage bucket is private (not public) | Supabase storage bucket config reviewed |
| ✅ PASS | Image upload enforces MIME type and size at bucket level | Supabase bucket policies verified |
| ✅ PASS | `npx tsc --noEmit` passes with zero errors | CI pipeline enforces zero TypeScript errors |
| ✅ PASS | No `console.log` outside `__DEV__` guards | Code review of all service and screen files |

## 9. Known Limitations & Future Improvements

1. **Google OAuth in development builds:** Google OAuth requires a native development build (not Expo Go) to function. Users testing on Expo Go must use email/password authentication. A future improvement could add development-mode deep link handling for Google OAuth.

2. **30-day data purge automation:** The current implementation flags data for deletion with a `purge_after` timestamp but does not include an automated purge job. A scheduled database function or cron job is needed to perform hard deletion of rows where `is_deleted = true AND NOW() >= purge_after`. Until this is implemented, manual database cleanup is required to fully comply with the 30-day DPA requirement.

3. **Push notification testing:** FCM (Firebase Cloud Messaging) push notifications require a physical device for end-to-end testing. iOS simulators and Android emulators have limited notification support. The `expo-notifications` setup should be validated on physical hardware before production release.

4. **Rate limit sliding window:** The current rate limiting implementation uses a wall-clock 1-hour window. This could allow a user to make 10 calls at 11:59 and another 10 at 12:01 (20 calls in 2 minutes). A sliding window algorithm would provide more equitable rate distribution.

5. **Certificate pinning:** The app does not currently implement SSL certificate pinning. While all traffic is HTTPS, adding certificate pinning would provide additional protection against man-in-the-middle attacks on compromised networks.

6. **Biometric authentication:** Adding biometric unlock (Face ID / fingerprint) before showing the app would protect user data in case of device theft or unauthorized access.
