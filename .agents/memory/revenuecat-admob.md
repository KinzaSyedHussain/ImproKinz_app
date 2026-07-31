---
name: RevenueCat AdMob boundary
description: RevenueCat ad tracking and React Native/Expo limitations for this mobile app.
---

RevenueCat's current AdMob `loadAndTrack` adapter is exposed through native Swift/Kotlin SDKs, not `react-native-purchases`. The React Native app must use the supported AdMob package for serving ads; premium entitlement suppression is separate from ad tracking.

**Why:** Treating the native adapter as a JavaScript API would create a runtime crash or a false impression that ad revenue is being tracked.

**How to apply:** Keep the ad loader isolated behind a native/platform component. Expo Go should skip AdMob because it does not include the native module; verify ad serving and any RevenueCat adapter bridge in a custom native build.