---
name: Signup-only onboarding
description: New-account setup must be entered from completed signup, not inferred from an incomplete or missing profile during sign-in.
---

Onboarding is a post-signup flow. A verified account created through registration routes to onboarding, while sign-in routes directly to the app regardless of profile loading or legacy profile completeness.

**Why:** Existing users may have incomplete, old, or temporarily unavailable profile data; using that state to decide whether to show onboarding incorrectly interrupts sign-in.

**How to apply:** Keep signup and sign-in navigation decisions explicit at their completion points, and do not use missing profile data as a proxy for “new user.”

Email verification completion is idempotent: if Clerk reports that the verification was already verified, reload the active signup resource and continue only when it exposes a completed signup session.

**Why:** A repeated submit or delayed UI event can reach Clerk after the first verification succeeded; surfacing that response leaves a valid new account stranded on the verification screen.

**How to apply:** Guard concurrent verification submissions, catch resend failures, and poll `reload()` after both normal and duplicate-verification responses because the legacy SDK can expose completion/session data asynchronously. Use the installed Clerk resource API (`create`, `prepareEmailAddressVerification`, `attemptEmailAddressVerification`, `reload`) rather than mixing in the newer future-resource API. Never fall back to immediate password sign-in after verification; that can report a false “account not found.”

Clerk can accept the email code but leave the legacy signup at `missing_requirements` when required profile fields are not supplied. The registration name is intentionally stored locally during creation, then submitted with `signUp.update` only for fields Clerk reports as missing after verification.

**Why:** Passing unsupported name parameters into the initial signup request previously caused Clerk signup failures, while omitting required dashboard-configured name fields prevented the verified signup from producing a session.

**How to apply:** Keep initial `signUp.create` limited to supported fields. After verification, inspect `missingFields`, fill only the required name fields from the locally saved signup name, then retry session completion.

If Clerk is configured to require legal acceptance, the custom registration form must collect explicit consent and send `legalAccepted: true`; an older in-progress signup cannot be retroactively repaired by the new checkbox.

**Why:** Existing signup attempts retain the requirements from when they were created, so testing a new requirement against an old verification session produces the same generic `missing_requirements` message.

**How to apply:** Require the checkbox before creating a new signup, pass the accepted value to `signUp.create` and `signUp.update`, then test from a fresh registration attempt.

Clerk may also return `username` in `missingFields`; the completion loop should update that requirement before treating the verified signup as failed.

**Why:** Clerk dashboard sign-up settings can require a username independently of email, name, or legal acceptance, while the UI otherwise reports only a generic incomplete signup.

**How to apply:** Normalize Clerk field identifiers, satisfy every supported missing field, reload the returned signup resource, and only show an error after the retry window is exhausted.

The onboarding completion screen must not depend only on Firebase `user` immediately after Clerk activation; use the loaded profile or Clerk user ID while the bridge settles.

**Why:** Clerk activation and Firebase auth/profile hydration are asynchronous, so the final onboarding action can otherwise return silently before saving or opening the paywall.

**How to apply:** Resolve an authenticated identity from Firebase, the profile context, or Clerk, and surface a visible save error when no identity or write is available.

Unauthenticated entry and sign-out should land on a dedicated auth choice screen with separate Sign In and Create Account actions.

**Why:** Sending users directly to only one auth form made the intended sign-in/sign-up choice unclear and inconsistent after sign-out.

**How to apply:** Route the root unauthenticated state and sidebar sign-out to `/auth`; keep `/auth/login` and `/auth/register` as the two explicit destinations.