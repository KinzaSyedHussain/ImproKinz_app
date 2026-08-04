---
name: Authenticated feed mutations
description: Why feed writes use the API transaction before the mobile Firestore fallback.
---

Authenticated mobile feed mutations should prefer the Clerk-authenticated API when the operation needs reliable persistence across accounts, with a direct Firestore fallback for environments where the API is unavailable.

**Why:** The mobile app can temporarily have a valid Clerk session while Firebase custom-token hydration is incomplete. Direct Firestore writes then fail security rules even though the user is signed in, while server-side Clerk authentication can still authorize the mutation.

**How to apply:** For votes and similar multi-account feed updates, send the Clerk bearer token to the API first and perform the read-modify-write atomically there. Only use the Firestore transaction when the API cannot be reached or is not configured.