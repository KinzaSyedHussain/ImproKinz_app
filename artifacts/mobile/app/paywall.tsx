/**
 * PaywallScreen
 *
 * On native development builds: attempts to present the RevenueCat-configured
 * native paywall (presentPaywall from react-native-purchases-ui) which renders
 * the mascot / stars / "Try for Free" design set up in the dashboard.
 *
 * On Expo Go and web: falls back to the custom plan-card UI and shows a banner
 * explaining that the full native paywall requires a development build.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSubscription } from "@/lib/revenuecat";
import { useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

const GOLD = "#F59E0B";
const GOLD2 = "#D97706";
const DARK = "#0D0B2B";
const CARD = "#1A1740";
const CARD2 = "#151230";
const BORDER = "#2A2560";
const TEXT = "#FFFFFF";
const MUTED = "#9CA3AF";
const PURPLE = "#7C3AED";
const TEAL = "#10B981";

// Expo Go is detected by executionEnvironment === "storeClient"
const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";

const FREE_FEATURES = [
  "100 credits daily (resets each day)",
  "AI flashcards, summaries & quizzes",
  "Social feed & communities",
  "Ads on workspace & feed",
];
const FREE_MISSING = ["Unlimited AI usage", "No ads"];

const MONTHLY_FEATURES = [
  "Unlimited credits",
  "Unlimited flashcards & summariser",
  "Unlimited quizzes & notes",
  "Premium AI access",
  "No ads",
  "Premium profile badge",
];

const YEARLY_FEATURES = [
  "Everything in Monthly",
  "Discounted yearly pricing",
  "Priority AI access",
  "Extended tool limits",
  "Premium badge on profile",
];

function CheckIcon({ color = TEAL }: { color?: string }) {
  return <Ionicons name="checkmark-circle" size={16} color={color} />;
}
function CrossIcon() {
  return <Ionicons name="close-circle" size={16} color="#4B5563" />;
}

interface PlanCardProps {
  badge?: string;
  badgeColor?: string;
  icon: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  missingFeatures?: string[];
  buttonLabel: string;
  buttonStyle: "gold" | "purple" | "outline";
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

function PlanCard({
  badge, badgeColor = GOLD, icon, name, price, period, features, missingFeatures = [],
  buttonLabel, buttonStyle, onPress, loading, disabled,
}: PlanCardProps) {
  const isGold = buttonStyle === "gold";
  const isPurple = buttonStyle === "purple";

  return (
    <View style={[styles.planCard, buttonStyle === "purple" && styles.planCardHighlighted]}>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: badgeColor + "22", borderColor: badgeColor }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
      ) : <View style={{ height: 26 }} />}

      <View style={styles.planHeader}>
        <View style={[styles.planIconWrap, { backgroundColor: isGold ? "#2A1F5E" : isPurple ? PURPLE + "20" : "#1F2937" }]}>
          <Ionicons name={icon as any} size={22} color={isGold ? GOLD : isPurple ? "#C4B5FD" : MUTED} />
        </View>
        <Text style={styles.planName}>{name}</Text>
      </View>

      <Text style={[styles.planPrice, { color: isGold || isPurple ? TEXT : MUTED }]}>{price}</Text>
      <Text style={styles.planPeriod}>{period}</Text>

      <View style={styles.planDivider} />

      <View style={styles.featureList}>
        {features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <CheckIcon color={isPurple ? "#C4B5FD" : TEAL} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
        {missingFeatures.map((f, i) => (
          <View key={`x-${i}`} style={styles.featureRow}>
            <CrossIcon />
            <Text style={[styles.featureText, { color: "#6B7280", textDecorationLine: "line-through" }]}>{f}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[
          styles.planBtn,
          isGold && { backgroundColor: CARD2, borderWidth: 1, borderColor: BORDER },
          isPurple && { backgroundColor: PURPLE },
          buttonStyle === "outline" && { backgroundColor: "transparent", borderWidth: 1.5, borderColor: GOLD },
          (disabled || loading) && { opacity: 0.55 },
        ]}
      >
        {loading
          ? <ActivityIndicator size="small" color={isGold ? MUTED : TEXT} />
          : <Text style={[styles.planBtnText, { color: isGold ? MUTED : TEXT }]}>{buttonLabel}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const { fromOnboarding } = useLocalSearchParams<{ fromOnboarding?: string }>();
  const {
    offerings, isConfigured, isLoading, purchase, restore,
    isPurchasing, isRestoring, isSubscribed, refetchCustomerInfo,
  } = useSubscription();
  const [purchasing, setPurchasing] = useState<"monthly" | "yearly" | null>(null);
  // Whether we already attempted (and failed/declined) the native paywall this session
  const nativeAttempted = useRef(false);

  useEffect(() => {
    if (isSubscribed) router.replace("/(tabs)");
  }, [isSubscribed]);

  // ── Attempt native RevenueCat paywall on first mount (non-Expo-Go / non-web) ──
  //
  // On a real development build or production build the native module is present and
  // RevenueCatUI.presentPaywall() shows the dashboard-configured paywall (mascot, stars,
  // "Try for Free" design). On Expo Go the native module is absent and the call throws;
  // we catch that and fall through to the custom card UI shown below.
  useEffect(() => {
    if (IS_EXPO_GO || Platform.OS === "web" || nativeAttempted.current) return;
    nativeAttempted.current = true;

    (async () => {
      try {
        const result: PAYWALL_RESULT = await RevenueCatUI.presentPaywall({
          displayCloseButton: fromOnboarding !== "1",
        });
        if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
          router.replace("/(tabs)");
        }
        // CANCELLED / NOT_PRESENTED / ERROR: fall through to custom card UI
      } catch {
        // Native module unavailable (simulator without native build) — custom UI handles it
      }
    })();
  }, []);

  // Map RevenueCat packages to monthly/yearly
  const allPackages = offerings?.current?.availablePackages ?? [];
  const monthlyPkg = allPackages.find((p: any) =>
    p.packageType === "MONTHLY" || p.identifier?.toLowerCase().includes("monthly")
  ) ?? allPackages[0];
  const yearlyPkg = allPackages.find((p: any) =>
    p.packageType === "ANNUAL" || p.identifier?.toLowerCase().includes("annual") || p.identifier?.toLowerCase().includes("yearly")
  ) ?? allPackages[1];

  const monthlyPrice = monthlyPkg?.product?.priceString ?? "SAR 9.99";
  const yearlyPrice = yearlyPkg?.product?.priceString ?? "SAR 29.99";

  const handlePurchase = async (pkg: any, type: "monthly" | "yearly") => {
    if (!pkg || !isConfigured) {
      Alert.alert("Unavailable", "In-app purchases are not configured on this device.");
      return;
    }
    setPurchasing(type);
    try {
      await purchase(pkg);
      router.replace("/(tabs)");
    } catch (e: any) {
      if (!e?.userCancelled) Alert.alert("Purchase failed", "Please try again or restore purchases.");
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
    } catch {
      Alert.alert("Restore unavailable", "We couldn't restore your purchases. Please try again.");
    }
  };

  if (isSubscribed) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* Close button — hidden when entering from onboarding */}
        {fromOnboarding !== "1" && (
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={MUTED} />
          </TouchableOpacity>
        )}

        {/* Expo Go banner */}
        {IS_EXPO_GO && (
          <View style={styles.expoGoBanner}>
            <Ionicons name="information-circle-outline" size={16} color={GOLD} />
            <Text style={styles.expoGoBannerText}>
              The full premium paywall requires a development build. You are currently in Expo Go preview mode.
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.headerWrap}>
          <View style={styles.crownRow}>
            <View style={[styles.crownBadge, { backgroundColor: GOLD + "18", borderColor: GOLD }]}>
              <Ionicons name="trophy" size={24} color={GOLD} />
            </View>
          </View>
          <Text style={styles.title}>Choose your plan</Text>
          <Text style={styles.subtitle}>
            Upgrade for unlimited AI, no ads, and premium badges.{"\n"}Free users get 100 credits every day.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={GOLD} size="large" />
            <Text style={[styles.subtitle, { marginTop: 12 }]}>Loading plans…</Text>
          </View>
        ) : (
          <>
            {/* Free plan */}
            <PlanCard
              icon="star-outline"
              name="Free"
              price="$0"
              period="Forever"
              features={FREE_FEATURES}
              missingFeatures={FREE_MISSING}
              buttonLabel="Current plan"
              buttonStyle="gold"
              onPress={() => {}}
              disabled
            />

            {/* Monthly plan */}
            <PlanCard
              badge="⭐  Most popular"
              badgeColor={GOLD}
              icon="flash"
              name="Monthly"
              price={monthlyPrice}
              period="per month"
              features={MONTHLY_FEATURES}
              buttonLabel={purchasing === "monthly" ? "Processing…" : "Choose Monthly"}
              buttonStyle="purple"
              onPress={() => handlePurchase(monthlyPkg, "monthly")}
              loading={purchasing === "monthly"}
              disabled={!!purchasing || isLoading}
            />

            {/* Yearly plan */}
            <PlanCard
              badge="🏆  Best value"
              badgeColor={TEAL}
              icon="trophy"
              name="Yearly"
              price={yearlyPrice}
              period="per year"
              features={YEARLY_FEATURES}
              buttonLabel={purchasing === "yearly" ? "Processing…" : "Choose Yearly"}
              buttonStyle="outline"
              onPress={() => handlePurchase(yearlyPkg, "yearly")}
              loading={purchasing === "yearly"}
              disabled={!!purchasing || isLoading}
            />

            {/* Footer actions */}
            <View style={styles.footer}>
              {fromOnboarding === "1" && (
                <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.continueFreeBtn}>
                  <Text style={styles.continueFreeText}>Continue with free plan</Text>
                  <Ionicons name="arrow-forward" size={14} color={GOLD} />
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={handleRestore} disabled={isRestoring} style={styles.restoreBtn}>
                <Text style={styles.restoreText}>{isRestoring ? "Restoring…" : "Restore Purchases"}</Text>
              </TouchableOpacity>

              <Text style={styles.legal}>
                Payment charged at confirmation. Subscription renews automatically unless cancelled at least 24 hours before period ends.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DARK },
  scroll: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 8 },
  closeBtn: { alignSelf: "flex-end", padding: 10, marginBottom: 4 },

  expoGoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: GOLD + "14",
    borderWidth: 1,
    borderColor: GOLD + "44",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  expoGoBannerText: {
    flex: 1,
    color: GOLD,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },

  headerWrap: { alignItems: "center", marginBottom: 24 },
  crownRow: { marginBottom: 14 },
  crownBadge: {
    width: 60, height: 60, borderRadius: 18,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
  },
  title: {
    fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT,
    textAlign: "center", marginBottom: 8,
  },
  subtitle: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: MUTED,
    textAlign: "center", lineHeight: 20,
  },

  loadingWrap: { alignItems: "center", paddingVertical: 48 },

  // Plan card
  planCard: {
    backgroundColor: CARD, borderRadius: 18, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: BORDER,
  },
  planCardHighlighted: {
    borderColor: PURPLE, borderWidth: 1.5,
    shadowColor: PURPLE, shadowOpacity: 0.28, shadowRadius: 18, elevation: 6,
  },
  badge: {
    alignSelf: "center", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, marginBottom: 12,
  },
  badgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  planHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  planIconWrap: {
    width: 40, height: 40, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  planName: { fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT },

  planPrice: { fontSize: 32, fontFamily: "Inter_700Bold", marginBottom: 2 },
  planPeriod: { fontSize: 12, fontFamily: "Inter_400Regular", color: MUTED, marginBottom: 14 },

  planDivider: { height: 1, backgroundColor: BORDER, marginBottom: 14 },

  featureList: { gap: 9, marginBottom: 18 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT, flex: 1 },

  planBtn: {
    borderRadius: 12, paddingVertical: 13, alignItems: "center",
  },
  planBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },

  // Footer
  footer: { alignItems: "center", gap: 12, marginTop: 8 },
  continueFreeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  continueFreeText: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  restoreBtn: { paddingVertical: 8 },
  restoreText: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13 },
  legal: {
    color: "#4B5563", fontFamily: "Inter_400Regular",
    fontSize: 11, textAlign: "center", lineHeight: 16, paddingHorizontal: 12,
  },
});
