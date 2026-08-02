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