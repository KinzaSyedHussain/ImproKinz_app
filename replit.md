# ImproKinz — Study Social Media App

## Overview

pnpm workspace monorepo using TypeScript. Mobile-first study social media app with dark purple + gold treasure theme.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Mobile**: Expo SDK 54, React Native, Expo Router (file-based routing)
- **Auth + DB**: Firebase (Auth + Firestore) — project: studyhub-39294
- **AI**: Groq API via Express API server
- **Videos**: YouTube Data API v3 (YOUTUBE_API_KEY)
- **Icons**: `@expo/vector-icons` (Ionicons) — loaded via useFonts on web, pre-bundled on native
- **Fonts**: Inter (400/500/600/700) via `@expo-google-fonts/inter`
- **API framework**: Express 5
- **Node.js version**: 24
- **Package manager**: pnpm

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/scripts run seed:revenuecat` — seed RevenueCat entities
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## App Structure

### Screens (`artifacts/mobile/app/`)
- `index.tsx` — animated splash/loading screen, routes to onboarding or tabs
- `onboarding.tsx` — 4-step first-time user wizard (name → field → level → goal)
- `auth/login.tsx`, `auth/register.tsx` — email/Google auth
- `(tabs)/` — main tab navigator:
  - `index.tsx` — home feed (posts, skeleton loading)
  - `tools.tsx` — AI tools (flashcards, notes, quiz, summarizer)
  - `notifications.tsx` — Study Videos tab (YouTube search)
  - `profile.tsx` — user profile
- `leaderboard.tsx` — XP + Streaks leaderboard with podium
- `flashcards.tsx`, `notes.tsx`, `quiz.tsx`, `summarizer.tsx` — AI tools

### Key Components (`artifacts/mobile/components/`)
- `Icon.tsx` — Ionicons wrapper with legacy name map
- `PressableScale.tsx` — animated spring press
- `SkeletonCard.tsx` — shimmer loading card
- `PostCard.tsx` — animated like/bookmark, Inter fonts

### Context
- `context/AuthContext.tsx` — Firebase auth + Firestore profile (UserProfile includes `onboardingComplete`)
- `context/ThemeContext.tsx` — theme provider

### Lib
- `lib/firebase.ts` — Firebase init
- `lib/revenuecat.tsx` — RevenueCat SDK wrapper (deferred — paywall not yet integrated)

## Onboarding Flow

New users (profile without `onboardingComplete: true`) are routed to `/onboarding` after login.
Steps: 1) Nickname, 2) Field of study, 3) Study level, 4) Main goal.
Saves to Firestore and sets `onboardingComplete: true`.

## RevenueCat (Setup Complete, Paywall Deferred)

Seeds run — entities created in RevenueCat project `projda4bb8e3`:
- Entitlement: `premium`
- Product: `improkinz_premium_monthly` ($4.99/mo)
- Test store API key: stored as `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`
- Android API key: stored as `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- iOS API key: stored as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`

**Note**: RevenueCat Replit integration was dismissed by user. Secret key stored manually as `REVENUECAT_SECRET_API_KEY`. Paywall UI (`app/paywall.tsx`) is built but not yet wired into the app navigation.

## Firebase

- Storage: NOT available (Spark tier) — photos stored as compressed base64 in Firestore
- Photos stored as base64 data URLs in Firestore docs

## Theme

- Background: `#0D0B2B` (dark purple)
- Accent: `#F59E0B` (gold)
- Cards: `#1A1740`
