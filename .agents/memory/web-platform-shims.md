---
name: Web platform shims
description: How to handle native-only modules that crash on Expo web (Metro bundling issue)
---

## The Problem
Metro bundles ALL `require()` and `import` statements at compile time, even those inside `Platform.OS !== "web"` branches. This means native-only modules crash the web bundle even if they're never called at runtime.

## The Fix: Platform-Specific Files
Use Metro's platform extension convention: `.web.ts` / `.native.ts` / `.ts` (fallback).

Metro resolves `@/lib/foo` as:
1. `foo.web.ts` (on web)
2. `foo.native.ts` (on native, not web)
3. `foo.ts` (fallback for all platforms)

## Files Created for This Project

### `lib/asyncStorage.web.ts`
localStorage-backed shim with getItem/setItem/removeItem — replaces `@react-native-async-storage/async-storage` on web.

### `lib/asyncStorage.native.ts`
Re-exports from `@react-native-async-storage/async-storage`.

### `lib/asyncStorage.ts`
Fallback — re-exports from `asyncStorage.web` (safe default).

### `lib/firebase.web.ts`
Firebase init without `getReactNativePersistence` — uses `getAuth(app)` directly.

### `lib/firebase.native.ts`
Firebase init with `getReactNativePersistence(AsyncStorage)` for native persistence.

### `lib/firebase.ts`
Fallback — re-exports from `firebase.web`.

### `lib/tokenCache.web.ts`
localStorage-based Clerk token cache.

### `lib/tokenCache.native.ts`
Re-exports `tokenCache` from `@clerk/clerk-expo/token-cache`.

### `lib/tokenCache.ts`
Fallback — re-exports from `tokenCache.web`.

## ClerkLoaded Blocks Web Render
`<ClerkLoaded>` from `@clerk/clerk-expo` renders `null` until Clerk's JS SDK is fully initialized. On Replit's web preview this never resolves, causing a permanent white screen.

**Fix**: Remove `<ClerkLoaded>` wrapper. Let `<ClerkProvider>` handle initialization. Hooks like `useSignIn` already have `isLoaded` guards.

**Why:** ClerkLoaded waits for a signal from Clerk's native SDK initialization path which doesn't fire correctly on web in this environment.

## Import Pattern in Consumers
Replace `import AsyncStorage from "@react-native-async-storage/async-storage"` with:
```ts
import { asyncStorage as AsyncStorage } from "@/lib/asyncStorage";
```
Files updated: `context/ThemeContext.tsx`, `context/AuthContext.tsx`, `app/notes.tsx`.
