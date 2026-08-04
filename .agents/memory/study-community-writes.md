---
name: Study community writes
description: Durable rule for multi-user study-community features and notifications.
---

Study circles, focus rooms, buddy requests, resource sharing, saved collections, reactions, and best-answer actions should prefer Clerk-authenticated API routes backed by atomic Firestore Admin operations. Keep direct Firestore fallbacks only for mobile environments where the API is unavailable.

**Why:** Mobile Clerk sessions and Firebase custom-token hydration can be briefly out of sync, and multi-user read-modify-write operations need server-side authorization and atomicity to persist reliably across accounts.

**How to apply:** Add new community mutations under the API router, validate the Clerk user there, use Firestore transactions for membership/reaction/save state, and create user-scoped notification records for meaningful cross-user activity.