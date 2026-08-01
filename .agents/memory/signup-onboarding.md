---
name: Signup-only onboarding
description: New-account setup must be entered from completed signup, not inferred from an incomplete or missing profile during sign-in.
---

Onboarding is a post-signup flow. A verified account created through registration routes to onboarding, while sign-in routes directly to the app regardless of profile loading or legacy profile completeness.

**Why:** Existing users may have incomplete, old, or temporarily unavailable profile data; using that state to decide whether to show onboarding incorrectly interrupts sign-in.

**How to apply:** Keep signup and sign-in navigation decisions explicit at their completion points, and do not use missing profile data as a proxy for “new user.”

Email verification completion is idempotent: if Clerk reports that the verification was already verified, treat it as successful and continue to onboarding, activating any session Clerk provides.

**Why:** A repeated submit or delayed UI event can reach Clerk after the first verification succeeded; surfacing that response leaves a valid new account stranded on the verification screen.

**How to apply:** Guard concurrent verification submissions and handle Clerk’s already-verified response as a completion path rather than a user-facing failure.