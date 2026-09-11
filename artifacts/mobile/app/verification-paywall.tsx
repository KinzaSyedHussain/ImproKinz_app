/**
 * VerificationPaywallSheet
 */
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSubscription, VERIFICATION_ENTITLEMENT_ID } from "@/lib/revenuecat";

const GOLD = "#F59E0B";
const DARK = "#0D0B2B";
const CARD = "#1A1740";
const BORDER = "#2A2560";
const TEXT = "#FFFFFF";
const MUTED = "#9CA3AF";
const SUCCESS = "#10B981";

const BENEFITS = [
  { icon: "briefcase-outline", text: "Post jobs, hackathons & internships" },
  { icon: "checkmark-circle-outline", text: "Verified badge on profile & posts" },
  { icon: "infinite-outline", text: "Lifetime — pay once, keep forever" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

export function VerificationPaywallSheet({ visible, onClose, onVerified }: Props) {
  const { offerings, isConfigured, isPurchasing, purchase, restore, isRestoring } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const verificationOffering = offerings?.all?.["verification"] ?? null;
  const verificationPkg =
    verificationOffering?.availablePackages?.[0] ??
    verificationOffering?.lifetime ??
    null;
  const priceString = verificationPkg?.product?.priceString ?? "$4.99";
  const offeringAvailable = !!verificationOffering && !!verificationPkg;
  const isDevMode = __DEV__;

  const handlePurchase = async () => {
    if (!offeringAvailable || !isConfigured) {
      // In dev mode, we'll show the mock button instead of this alert
      if (!isDevMode) {
        Alert.alert(
          "Unavailable",
          "The verification purchase is not available on this device yet.",
        );
      }
      return;
    }
    if (isDevMode) {
      setConfirmVisible(true);
      return;
    }
    await doPurchase();
  };

  const doPurchase = async () => {
    setConfirmVisible(false);
    setPurchasing(true);
    try {
      const customerInfo = await purchase(verificationPkg!);
      const entitlementActive =
        customerInfo?.entitlements?.active?.[VERIFICATION_ENTITLEMENT_ID] !== undefined;
      if (!entitlementActive) {
        Alert.alert(
          "Purchase incomplete",
          "The verification entitlement was not activated.",
        );
        return;
      }
      onVerified?.();
      onClose();
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert("Purchase failed", "Please try again or restore your purchases.");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      const customerInfo = await restore();
      const entitlementActive =
        (customerInfo as any)?.entitlements?.active?.[VERIFICATION_ENTITLEMENT_ID] !== undefined;
      if (entitlementActive) {
        onVerified?.();
        onClose();
      } else {
        Alert.alert("No purchase found", "We couldn't find a verified purchase on this account.");
      }
    } catch {
      Alert.alert("Restore failed", "We couldn't restore your purchases.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.badgeWrap}>
          <View style={[styles.badgeCircle, { backgroundColor: GOLD + "20", borderColor: GOLD }]}>
            <Ionicons name="shield-checkmark" size={36} color={GOLD} />
          </View>
        </View>

        <Text style={styles.title}>Get Verified</Text>
        <Text style={styles.subtitle}>
          A one-time purchase that unlocks posting privileges and your gold verified badge.
        </Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: GOLD + "18" }]}>
                <Ionicons name={b.icon as any} size={16} color={GOLD} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{priceString}</Text>
          <Text style={styles.priceSub}>one-time · lifetime access</Text>
        </View>

        {/* Unavailable notice */}
        {!offeringAvailable && isConfigured && (
          <View style={[styles.unavailableNote, { borderColor: BORDER }]}>
            <Ionicons name="time-outline" size={14} color={MUTED} />
            <Text style={[styles.unavailableText, { color: MUTED }]}>
              Verification purchase not yet available on this store.
            </Text>
          </View>
        )}

        {/* Main CTA (Disabled if not configured/available) */}
        <TouchableOpacity
          style={[
            styles.ctaBtn,
            (!offeringAvailable || !isConfigured || purchasing || isPurchasing) && { opacity: 0.55 },
          ]}
          onPress={handlePurchase}
          disabled={!offeringAvailable || !isConfigured || purchasing || isPurchasing}
          activeOpacity={0.85}
        >
          {purchasing || isPurchasing ? (
            <ActivityIndicator size="small" color={DARK} />
          ) : (
            <Text style={styles.ctaText}>Get Verified — {priceString}</Text>
          )}
        </TouchableOpacity>

        {/* 🛠️ DEV MODE BYPASS: Lets you test the flow without RevenueCat configured */}
        {isDevMode && (!offeringAvailable || !isConfigured) && (
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: SUCCESS, marginTop: 8 }]}
            onPress={() => {
              console.log("🛠️ DEV: Mock verifying user...");
              onVerified?.();
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>🛠️ Mock Verify (Dev Only)</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleRestore} disabled={isRestoring} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>
            {isRestoring ? "Restoring…" : "Restore purchase"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>Maybe later</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Payment charged to your App Store / Play Store account at confirmation.
        </Text>
      </View>

      {/* Dev-mode confirm dialog */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.devOverlay}>
          <View style={styles.devCard}>
            <Ionicons name="construct-outline" size={32} color={GOLD} style={{ marginBottom: 8 }} />
            <Text style={styles.devTitle}>Test Purchase</Text>
            <Text style={styles.devBody}>
              You're in development mode. This simulates the "verification" purchase.
            </Text>
            <View style={styles.devBtns}>
              <TouchableOpacity style={styles.devCancel} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.devCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.devConfirm} onPress={doPurchase}>
                <Text style={styles.devConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, marginBottom: 20 },
  badgeWrap: { marginBottom: 16 },
  badgeCircle: {
    width: 76, height: 76, borderRadius: 22, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  title: {
    fontSize: 24, fontFamily: "Inter_700Bold", color: TEXT,
    marginBottom: 8, textAlign: "center",
  },
  subtitle: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: MUTED,
    textAlign: "center", lineHeight: 20, marginBottom: 20,
  },
  benefits: { width: "100%", gap: 12, marginBottom: 24 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  benefitText: { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT, flex: 1 },
  priceRow: { alignItems: "center", marginBottom: 16 },
  price: { fontSize: 36, fontFamily: "Inter_700Bold", color: GOLD },
  priceSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: MUTED, marginTop: 2 },
  unavailableNote: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12, width: "100%", justifyContent: "center",
  },
  unavailableText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 17, textAlign: "center" },
  ctaBtn: {
    width: "100%", backgroundColor: GOLD, borderRadius: 14,
    paddingVertical: 15, alignItems: "center", marginBottom: 12,
  },
  ctaText: { fontSize: 16, fontFamily: "Inter_700Bold", color: DARK },
  restoreBtn: { paddingVertical: 8, marginBottom: 4 },
  restoreText: { fontSize: 13, fontFamily: "Inter_400Regular", color: MUTED },
  dismissBtn: { paddingVertical: 6, marginBottom: 12 },
  dismissText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: MUTED },
  legal: {
    fontSize: 10, fontFamily: "Inter_400Regular", color: "#4B5563",
    textAlign: "center", lineHeight: 15,
  },
  devOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center" },
  devCard: {
    backgroundColor: CARD, borderRadius: 20, padding: 24, margin: 24,
    alignItems: "center", borderWidth: 1, borderColor: GOLD,
  },
  devTitle: { color: TEXT, fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 8 },
  devBody: {
    color: MUTED, fontFamily: "Inter_400Regular", fontSize: 13,
    textAlign: "center", lineHeight: 18, marginBottom: 20,
  },
  devBtns: { flexDirection: "row", gap: 12, width: "100%" },
  devCancel: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: "#2A2560" },
  devCancelText: { color: MUTED, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  devConfirm: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: GOLD },
  devConfirmText: { color: DARK, fontFamily: "Inter_700Bold", fontSize: 14 },
});