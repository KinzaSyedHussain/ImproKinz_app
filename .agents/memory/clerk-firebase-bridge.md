---
name: Clerk+Firebase bridge
description: How Clerk auth on mobile is bridged to Firebase Auth so Firestore rules work. Two activation methods.
---

# Clerk → Firebase Authentication Bridge

## Architecture
- Clerk is the identity provider (email/password + Google OAuth)
- `ClerkFirebaseBridge` component runs silently after Clerk signs in
- It exchanges a Clerk JWT for a Firebase custom token (UID = Clerk user ID)
- `signInWithCustomToken(auth, token)` signs into Firebase, satisfying Firestore security rules
- Firebase UID = Clerk user ID ensures same Gmail → same Firestore documents on web + mobile

## Two activation methods (tried in order)
1. **Clerk JWT Template for Firebase** (client-side, no server needed):
   - Clerk Dashboard → JWT Templates → New → Firebase → upload Firebase service account JSON
   - Client calls `getToken({ template: 'firebase' })` → `signInWithCustomToken(auth, token)`
2. **API server endpoint** (`POST /api/auth/firebase-token`):
   - Requires `FIREBASE_SERVICE_ACCOUNT_JSON` env var (JSON string of Firebase service account key)
   - If missing, endpoint returns 503 gracefully

**Why:** Firestore security rules use `request.auth.uid`. Without Firebase Auth, writes fail. Clerk JWT Template is preferred because it's client-side only; server approach requires a service account secret.

## How to activate
Either:
- Set `FIREBASE_SERVICE_ACCOUNT_JSON` env var with the JSON content of a Firebase service account key, OR
- Upload the Firebase service account key to Clerk Dashboard JWT Templates

## Key files
- `artifacts/mobile/context/ClerkFirebaseBridge.tsx` — bridge component
- `artifacts/api-server/src/routes/auth.ts` — server-side token exchange endpoint
