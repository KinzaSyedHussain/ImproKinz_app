import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSubscription } from "@/lib/revenuecat";
import { useLocalSearchParams } from "expo-router";

const GOLD = "#F59E0B";
const DARK = "#0D0B2B";
const CARD = "#1A1740";
const TEXT = "#FFFFFF";
const MUTED = "#9CA3AF";

const FEATURES = [
  { icon: "flash" as const, label: "Unlimited AI Flashcards", desc: "Generate cards from any topic" },
  { icon: "document-text" as const, label: "AI Notes Maker", desc: "Auto-summarise your study material" },
  { icon: "help-circle" as const, label: "Unlimited Quizzes", desc: "Test yourself on anything" },
  { icon: "trophy" as const, label: "Leaderboard Access", desc: "Compete with top students" },
  { icon: "videocam" as const, label: "Curated Study Videos", desc: "Expert video library" },
  { icon: "people" as const, label: "Full Social Feed", desc: "Share and discover study posts" },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { fromOnboarding } = useLocalSearchParams<{ fromOnboarding?: string }>();
  const { offerings, isConfigured, isLoading, purchase, restore, isPurchasing, isRestoring, isSubscribed } =
    useSubscription();
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    if (isSubscribed) router.replace("/(tabs)");
  }, [isSubscribed, router]);

  const currentOffering = offerings?.current;
  const pkg = currentOffering?.availablePackages[0];
  const priceString = pkg?.product.priceString ?? "$4.99";
  const productTitle = pkg?.product.title ?? "ImproKinz Premium";

  const handleSubscribe = () => {
    if (__DEV__) {
      setConfirmVisible(true);
    } else {
      doPurchase();
    }
  };

  const doPurchase = async () => {
    setConfirmVisible(false);
    if (!pkg) return;
    try {
      await purchase(pkg);
      router.replace("/(tabs)");
    } catch (e: any) {
      if (e?.userCancelled) return;
      console.error("Purchase error:", e);
      Alert.alert("Purchase unavailable", "We couldn't complete the purchase. Please try again.");
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
    } catch (e) {
      console.error("Restore error:", e);
      Alert.alert("Restore unavailable", "We couldn't restore your purchases. Please try again.");
    }
  };

  if (isSubscribed) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={MUTED} />
        </TouchableOpacity>

        {/* Crown badge */}
        <View style={styles.crownWrap}>
          <View style={styles.crownCircle}>
            <Ionicons name="trophy" size={36} color={GOLD} />
          </View>
        </View>

        <Text style={styles.title}>Unlock ImproKinz{"\n"}Premium</Text>
        <Text style={styles.subtitle}>
          Everything you need to study smarter, rise higher, and ace every exam.
        </Text>

        {/* Trial badge */}
        <View style={styles.trialBadge}>
          <Ionicons name="gift-outline" size={16} color={GOLD} />
          <Text style={styles.trialText}> 7-day free trial • Cancel anytime</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureRow, i < FEATURES.length - 1 && styles.featureDivider]}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={20} color={GOLD} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={GOLD} />
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={styles.priceCard}>
          <View>
            <Text style={styles.planName}>{productTitle}</Text>
            <Text style={styles.planFreq}>Billed monthly after trial</Text>
          </View>
          {!isConfigured ? (
            <Text style={styles.unavailable}>Unavailable</Text>
          ) : isLoading ? (
            <ActivityIndicator color={GOLD} />
          ) : (
            <Text style={styles.price}>{priceString}<Text style={styles.perMo}>/mo</Text></Text>
          )}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, (isPurchasing || isLoading) && styles.ctaDisabled]}
           onPress={handleSubscribe}
           disabled={isPurchasing || isLoading || !isConfigured || !pkg}
          activeOpacity={0.85}
        >
          {isPurchasing ? (
            <ActivityIndicator color={DARK} />
          ) : (
            <Text style={styles.ctaText}>Start Free Trial</Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={isRestoring}>
           <Text style={styles.restoreText}>
             {isRestoring ? "Restoring…" : "Restore Purchases"}
          </Text>
        </TouchableOpacity>

        {fromOnboarding === "1" && (
          <TouchableOpacity
            style={styles.startFreeBtn}
            onPress={() => router.replace("/(tabs)")}
            activeOpacity={0.8}
          >
            <Text style={styles.startFreeText}>or start free with 100 daily credits</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.legal}>
          Payment will be charged to your account at confirmation of purchase. Subscription automatically renews
          unless cancelled at least 24 hours before the end of the period.
        </Text>
      </ScrollView>

      {/* Dev-mode confirm modal */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="construct-outline" size={32} color={GOLD} style={{ marginBottom: 8 }} />
            <Text style={styles.modalTitle}>Test Purchase</Text>
            <Text style={styles.modalBody}>
              You're in development mode. This will simulate a purchase using RevenueCat's test store.
              No real charge will be made.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={doPurchase}>
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DARK },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  closeBtn: { alignSelf: "flex-end", padding: 8, marginTop: 4 },
  crownWrap: { alignItems: "center", marginTop: 8, marginBottom: 16 },
  crownCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: "#2A1F5E",
    borderWidth: 2, borderColor: GOLD,
    alignItems: "center", justifyContent: "center",
  },
  title: {
    fontSize: 28, fontFamily: "Inter_700Bold", color: TEXT,
    textAlign: "center", lineHeight: 34, marginBottom: 10,
  },
  subtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: MUTED,
    textAlign: "center", lineHeight: 20, marginBottom: 16,
  },
  trialBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#1A1740", borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 8, alignSelf: "center", marginBottom: 24,
    borderWidth: 1, borderColor: GOLD,
  },
  trialText: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  featuresCard: {
    backgroundColor: CARD, borderRadius: 16, overflow: "hidden", marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
  },
  featureDivider: { borderBottomWidth: 1, borderBottomColor: "#2A2560" },
  featureIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "#2A1F5E",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  featureText: { flex: 1 },
  featureLabel: { color: TEXT, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  featureDesc: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  priceCard: {
    backgroundColor: CARD, borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, borderColor: GOLD, marginBottom: 20,
  },
  planName: { color: TEXT, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  planFreq: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  price: { color: GOLD, fontFamily: "Inter_700Bold", fontSize: 26 },
  unavailable: { color: MUTED, fontFamily: "Inter_500Medium", fontSize: 14 },
  perMo: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14 },
  ctaBtn: {
    backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginBottom: 12,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: DARK, fontFamily: "Inter_700Bold", fontSize: 17 },
  restoreBtn: { alignItems: "center", paddingVertical: 10, marginBottom: 16 },
  restoreText: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13 },
  startFreeBtn: { alignItems: "center", paddingVertical: 10, marginBottom: 10 },
  startFreeText: { color: GOLD, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  legal: { color: "#4B5563", fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center", lineHeight: 16 },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center",
  },
  modalCard: {
    backgroundColor: CARD, borderRadius: 20, padding: 24, margin: 24,
    alignItems: "center", borderWidth: 1, borderColor: GOLD,
  },
  modalTitle: { color: TEXT, fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 8 },
  modalBody: {
    color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13,
    textAlign: "center", lineHeight: 18, marginBottom: 20,
  },
  modalBtns: { flexDirection: "row", gap: 12 },
  modalCancel: {
    flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center",
    backgroundColor: "#2A2560",
  },
  modalCancelText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  modalConfirm: {
    flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center",
    backgroundColor: GOLD,
  },
  modalConfirmText: { color: DARK, fontFamily: "Inter_700Bold", fontSize: 14 },
});
