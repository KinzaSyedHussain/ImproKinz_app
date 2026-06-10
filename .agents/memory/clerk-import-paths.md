---
name: Mobile Clerk import paths
description: The npm package is @clerk/clerk-expo but some docs show @clerk/expo — use the full package name.
---

# Clerk Expo SDK Import Paths

## Rule
Always import from `@clerk/clerk-expo`, NOT `@clerk/expo`.

The npm package name is `@clerk/clerk-expo` (installed in package.json as such). Some Clerk docs use the shorthand `@clerk/expo` but Metro/Node cannot resolve that path since there is no package with that npm name installed.

**Why:** This caused a Metro "Unable to resolve" bundling failure. The pnpm symlink in node_modules only exists for the actual npm package name.

## Affected imports
- `ClerkProvider, ClerkLoaded` → `@clerk/clerk-expo`
- `tokenCache` → `@clerk/clerk-expo/token-cache`
- `useSignIn, useSignUp, useSSO, useClerk, useAuth` → `@clerk/clerk-expo`
