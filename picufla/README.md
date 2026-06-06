# PICUFLA

Discover & collect every plant around you. PICUFLA is a mobile application that uses AI-powered plant identification to help you build a personal digital collection of plants you encounter. Snap a photo, get instant identification, track your discoveries, and set care reminders.

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase CLI (`npm install -g supabase`)
- Deno (for Edge Functions — [install guide](https://deno.land/manual/getting_started/installation))

## Setup

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd picufla
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

4. Start local Supabase:
   ```bash
   supabase start
   ```

5. Apply database migrations:
   ```bash
   supabase db push
   ```

6. Set OpenAI API key in Supabase Edge Function secrets:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...
   ```

7. Serve Edge Functions locally:
   ```bash
   supabase functions serve
   ```

8. Start the Expo development server:
   ```bash
   npx expo start
   ```

## Environment Variables

| Name | Required | Description |
|------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) API key |
| `EXPO_PUBLIC_LOCAL_FUNCTION_URL` | No | Local Edge Function URL for development |
| `OPENAI_API_KEY` | Yes | OpenAI API key (Edge Function secret only) |

## Security Warnings

> ⚠ **Never commit `.env` to version control.** It contains sensitive credentials.
>
> ⚠ **Never prefix `OPENAI_API_KEY` with `EXPO_PUBLIC_`.** This key must remain server-side only. Prefixing it exposes it to the React Native client bundle.
>
> ⚠ **The anon key is safe to expose.** It is protected by Row Level Security (RLS) policies on every database table.
>
> ⚠ **The service role key must never appear in the app client.** It bypasses RLS and provides full database access. It is only used in server-side Edge Functions.
