---
name: Clerk SDK v5 methods
description: Correct Clerk v5 signIn/signUp method names for Expo React Native — common wrong names cause silent runtime failures.
---

## Sign In

```ts
const { signIn, setActive, isLoaded } = useSignIn();

// Create a sign-in attempt
const result = await signIn.create({ identifier: email, password });
// result.status === "complete" → setActive({ session: result.createdSessionId })
```

**Wrong names (do not use):**
- `signIn.password(...)` — does not exist
- `signIn.finalize(...)` — does not exist
- `signIn.status` directly on the hook object — use the result object instead

## Sign Up

```ts
const { signUp, setActive, isLoaded } = useSignUp();

// Create account
await signUp.create({ emailAddress, password, firstName });

// Send email verification code
await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

// Verify the code
const result = await signUp.attemptEmailAddressVerification({ code });
// result.status === "complete" → setActive({ session: result.createdSessionId })
```

**Wrong names (do not use):**
- `signUp.password(...)` — does not exist
- `signUp.verifications.sendEmailCode()` — does not exist
- `signUp.verifications.verifyEmailCode(...)` — does not exist
- `signUp.finalize(...)` — does not exist

## Google SSO

```ts
const { startSSOFlow } = useSSO();
const { createdSessionId, setActive } = await startSSOFlow({
  strategy: "oauth_google",
  redirectUrl: AuthSession.makeRedirectUri(),
});
if (createdSessionId && setActive) await setActive({ session: createdSessionId });
```

**Why:** These methods were fabricated in a previous session; running them throws immediately at runtime, making sign-in/sign-up completely non-functional.

**How to apply:** Any time auth screens are written or modified, verify method names against this list before shipping.
