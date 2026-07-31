import { useSubscription } from "@/lib/revenuecat";
import Constants from "expo-constants";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";

/**
 * Free-user AdMob placement.
 *
 * RevenueCat's current AdMob adapter exposes loadAndTrack only through its
 * native Swift/Kotlin SDKs, not through react-native-purchases. This component
 * therefore uses the supported React Native AdMob loader and keeps the
 * premium suppression rule in one place. A native adapter can replace the
 * BannerAd loader later without changing screen code.
 */
export function AdBanner() {
  const { isSubscribed } = useSubscription();
  const isExpoGo = Constants.executionEnvironment === "storeClient";

  useEffect(() => {
    if (Platform.OS !== "web" && !isExpoGo && !isSubscribed) {
      const { MobileAds } = require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
      MobileAds().initialize().catch((error) => {
        console.warn("AdMob initialization failed:", error);
      });
    }
  }, [isExpoGo, isSubscribed]);

  if (Platform.OS === "web" || isExpoGo || isSubscribed) return null;

  const {
    BannerAd,
    BannerAdSize,
  } = require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
  const bannerUnitId =
    process.env.EXPO_PUBLIC_ADMOB_BANNER_AD_UNIT_ID || "ca-app-pub-3940256099942544/6300978111";

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={bannerUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={(error) => console.warn("AdMob banner failed:", error)}
        onPaid={(event) => {
          console.log("AdMob paid event:", event.value, event.currency);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    minHeight: 52,
    paddingVertical: 6,
  },
});