PROJECT DOCUMENT
Secure System Development – Security Implementation Report

COVER PAGE
Project Title: PICUFLA Security Implementation Report
System Name: PICUFLA – Plant Identification and Collection App
Course: ____________________
Course Instructor: ____________________
Submitted By: ____________________
Date Submitted: ____________________

---

1. SYSTEM OVERVIEW

1.1 System Description

PICUFLA is a mobile app that lets users take a photo of any plant and get an instant AI identification. Once identified, users can save the plant to their personal digital collection, add notes and tags, mark favorites, and set reminders for watering, fertilizing, or repotting. The app requires users to sign in (by email or Google) so each person's collection stays private and secure.

1.2 Target Users

PICUFLA is made for adult plant lovers — hobbyists, gardeners, and anyone curious about the plants around them. Users sign up with email (password must be at least 8 characters with a number, uppercase, and lowercase letter) or with their Google account. Each user has their own private collection that only they can see.

1.3 Basic Architecture Diagram

The system has these main parts:

- **Mobile App (React Native / Expo)** — what the user sees and taps on, runs on phones
- **Supabase Auth** — handles login, signup, session tokens, and email verification
- **Supabase Database (PostgreSQL)** — stores user profiles, plant catalog, collections, reminders, and logs
- **Supabase Edge Functions** — server-side code for plant identification and account deletion
- **Supabase Storage** — a private file cabinet for plant photos (not accessible to the public)
- **OpenAI GPT-4o Vision API** — the AI that identifies plants (only called from the server, never from the phone)

How data flows:

1. User opens the app → the app checks for a saved login session (stored encrypted on the phone)
2. User takes a plant photo → the app shrinks the image and converts it to a text format (Base64)
3. The image is sent to a serverless function along with the user's login token → the function checks if the user is allowed (not more than 10 identifications per hour), checks the image is a valid type (JPEG/PNG/WebP) and not too large (under 4MB), then sends it to OpenAI using a secret API key stored on the server
4. The identification result comes back to the phone → user can save it to their collection, which stores the data in the database and the photo in private storage
5. Care reminders are scheduled on the phone and saved to the database for later alerts

---

2. THREAT & VULNERABILITY IDENTIFICATION

**Threat 1: The OpenAI secret key could be stolen**
- Possible Vulnerability: If the API key were written inside the app code, someone could take the app apart and find it.
- Impact on System: The attacker could use the key to make calls to OpenAI, costing the project money and potentially abusing the service.

**Threat 2: A user could see another user's private data**
- Possible Vulnerability: Without database rules, anyone who logs in could read everyone else's plant collection, profile info, and reminders.
- Impact on System: Serious privacy violation — personal photos, location data, and account details would be exposed.

**Threat 3: Login tokens could be stolen from the phone**
- Possible Vulnerability: If the login session is saved in plain text on the phone, a malicious app or someone with phone access could steal it and log in as that user.
- Impact on System: Full account takeover — the thief could view, modify, or delete the victim's entire collection.

**Threat 4: Someone could guess passwords over and over**
- Possible Vulnerability: Without checking input quality or slowing down repeated attempts, an attacker could try thousands of passwords.
- Impact on System: Account could be broken into, or the server could be slowed down by too many failed login attempts.

**Threat 5: A bad image could crash the system**
- Possible Vulnerability: If the server accepted any file without checking, someone could send a huge file (memory overload), a non-image file (wasted AI calls), or a specially crafted malicious file.
- Impact on System: The server could crash or run up huge OpenAI bills processing junk images.

---

3. SECURITY IMPLEMENTATION

3.1 OpenAI Key Hidden on Server
- Threat Addressed: Stealing the OpenAI secret key
- CIA Principle: Confidentiality (keeping secrets secret)
- Source file: picufla/supabase/functions/identify-plant/index.ts, line 117
- Code proof:

```typescript
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
```

The OpenAI key is stored as a server environment variable — it never touches the phone. The app sends only the image to the server, and the server adds the key when calling OpenAI. Even if someone decompiles the app, they cannot find the key because it simply isn't there.

3.2 Row-Level Security (RLS): Users Can Only See Their Own Data
- Threat Addressed: One user reading another's private data
- CIA Principle: Confidentiality (keeping data private)
- Source file: picufla/supabase/migrations/001_initial_schema.sql, lines 24-27
- Code proof:

```sql
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);
```

Every table that stores user data has a rule that checks the logged-in user's ID against the data's owner ID. This means the database itself — not just the app — enforces that you can only see your own profiles, plants, reminders, and logs. It's a safety net even if the app had a bug.

3.3 Login Session Scrambled Before Storing on Phone
- Threat Addressed: Stealing login tokens from the device
- CIA Principle: Confidentiality (keeping secrets secret)
- Source file: picufla/src/services/supabase.ts, lines 8-20
- Code proof:

```typescript
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
```

Before saving the user's login session to the phone's regular storage, the app scrambles it with a strong encryption method (AES-256). The key to unscramble it is stored separately in the phone's secure hardware zone (expo-secure-store). If someone reads the storage file, they get gibberish.

3.4 Input Checking on Every Form
- Threat Addressed: Sending bad or malicious data
- CIA Principle: Integrity (keeping data correct and trustworthy)
- Source file: picufla/src/screens/EmailRegisterScreen.tsx, lines 16-27
- Code proof:

```typescript

const registerSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must include at least one number')
    .regex(/[a-z]/, 'Password must include at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

Every screen where the user types something — registration, login, profile setup, OTP codes, deletion confirmation — checks the input against a clear set of rules before sending it anywhere. Bad data is caught immediately and the user sees a friendly error message instead of the app breaking.

3.5 Rate Limiting: 10 Identifications Per Hour Max
- Threat Addressed: Someone abusing the AI identification feature
- CIA Principle: Availability (keeping the service working for everyone)
- Source file: picufla/supabase/functions/identify-plant/index.ts, lines 40-78
- Code proof:

```typescript
      if (windowStart > oneHourAgo && rateLimit.call_count >= RATE_LIMIT_PER_HOUR) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. You can identify up to 10 plants per hour.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
```

Before each plant identification, the server checks how many times this user has already used the feature in the last hour. If they hit 10, the server politely says no and sends a "too many requests" message. This prevents one person from running up the OpenAI bill and keeps the feature fair for everyone.

---

4. CIA TRIAD APPLICATION

4.1 Confidentiality (Keeping Data Private)

PICUFLA protects private data in three main ways. First, every database table has rules that let users see only their own rows. Second, login sessions are scrambled on the phone so even if the device is compromised, the token is unreadable. Third, plant photos are stored in a private cabinet (not a public folder) and can only be viewed through time-limited links. The OpenAI key never appears in the app code at all.

4.2 Integrity (Keeping Data Correct)

The app checks user input on every screen before sending it anywhere — for example, passwords must meet strength rules, and notes cannot exceed 500 characters. The database itself has its own rules too, like ensuring a confidence score is always between 0 and 1, or a care type can only be one of the allowed values. Deleting data requires typing the word DELETE exactly, which prevents accidents.

4.3 Availability (Keeping the Service Running)

The plant identification feature is limited to 10 calls per hour per user, which prevents anyone from overwhelming the system. The app can work offline — previously saved plants are cached on the phone so users can browse their collection without internet. If the AI service fails or times out, the server returns a friendly "try again later" message instead of crashing.

---

5. CONCLUSION

5.1 What Was Learned

Building PICUFLA showed that security is not one thing — it is many layers working together. The OpenAI key stays safe because it is on the server, but that does not help if someone can abuse the feature without the rate limiter. The database rules keep data private, but they would not help if a login token could be stolen from the phone in plain text. Every layer covers a gap in another layer, and all three goals (privacy, correctness, availability) need attention for a system to be truly secure.

5.2 Future Improvements

1. **Two-factor authentication** — Right now, only a password protects the account. Adding a second step (like a code from an authenticator app) would make stolen passwords useless on their own.

2. **Automatic cleanup of deleted data** — When a user deletes their account, the system marks it as deleted and logs a 30-day cleanup date, but there is no automated process that actually wipes the data after 30 days. A scheduled server task would close this gap.

3. **Slowing down repeated login attempts** — The app does not currently limit how many times someone can try to log in from different accounts. Adding checks based on the device or network address would make brute-force attacks much harder.
