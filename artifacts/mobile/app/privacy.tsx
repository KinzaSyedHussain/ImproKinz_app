import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Privacy Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={[styles.lastUpdated, { color: colors.mutedForeground }]}>
          Last updated: May 3, 2026
        </Text>

        <Section title="Introduction" colors={colors}>
          {`ImproKinz ("we", "us", or "our") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and share information when you use the ImproKinz mobile application ("App").

By using the App you agree to the collection and use of information in accordance with this policy.`}
        </Section>

        <Section title="Information We Collect" colors={colors}>
          {`• Account data: email address, display name, and profile photo when you sign up.\n\n• Usage data: study session durations, XP/coins earned, streak data, subjects, and daily goals — used to power your personal dashboard.\n\n• Content: posts, replies, and group activity you create in the community feed.\n\n• Device data: device type, OS version, and crash logs for debugging purposes.\n\n• Purchase data: subscription status managed through RevenueCat. We do not store payment card information.`}
        </Section>

        <Section title="How We Use Your Information" colors={colors}>
          {`• To provide and improve the App's features.\n\n• To personalise your study experience (subject recommendations, goal tracking).\n\n• To process in-app purchases and manage subscription entitlements.\n\n• To send transactional emails (email verification, password reset).\n\n• To analyse aggregate, anonymised usage patterns.`}
        </Section>

        <Section title="Data Sharing" colors={colors}>
          {`We do not sell your personal data. We share data only with:\n\n• Clerk (authentication provider)\n• Google Firebase (database and file storage)\n• RevenueCat (subscription management)\n• YouTube Data API (video content — subject to Google's Privacy Policy)\n• Cloudinary (user-uploaded image hosting)\n\nAll third-party providers are bound by appropriate data processing agreements.`}
        </Section>

        <Section title="Data Retention" colors={colors}>
          {`Your account data is retained until you delete your account. You can delete your account at any time from Settings → Delete Account. This will permanently remove your profile, posts, and all associated data.`}
        </Section>

        <Section title="Children's Privacy" colors={colors}>
          {`The App is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately.`}
        </Section>

        <Section title="Your Rights" colors={colors}>
          {`Depending on your location you may have the right to:\n\n• Access the personal data we hold about you.\n• Request correction of inaccurate data.\n• Request deletion of your data.\n• Object to or restrict processing.\n• Data portability.\n\nTo exercise these rights, contact us at privacy@improkinz.com.`}
        </Section>

        <Section title="Security" colors={colors}>
          {`We use industry-standard measures (TLS encryption, Firebase security rules, Clerk's SOC 2–compliant auth) to protect your data. No system is 100% secure; please use a strong, unique password.`}
        </Section>

        <Section title="Changes to This Policy" colors={colors}>
          {`We may update this Privacy Policy from time to time. We will notify you of material changes through the App or by email. Continued use of the App after changes constitutes acceptance.`}
        </Section>

        <Section title="Contact Us" colors={colors}>
          {`If you have any questions about this Privacy Policy, please contact us at:\n\nprivacy@improkinz.com`}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children, colors }: { title: string; children: string; colors: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 0 },
  lastUpdated: { fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 8 },
  body: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
});
