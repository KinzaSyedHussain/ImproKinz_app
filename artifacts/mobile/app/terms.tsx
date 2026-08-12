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

export default function TermsScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Terms of Service</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={[styles.lastUpdated, { color: colors.mutedForeground }]}>
          Last updated: May 3, 2026
        </Text>

        <Section title="Acceptance of Terms" colors={colors}>
          {`By downloading, installing, or using ImproKinz ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the App.`}
        </Section>

        <Section title="Description of Service" colors={colors}>
          {`ImproKinz is an AI-powered study companion that provides:\n\n• AI study tools (flashcards, summariser, quiz generator, notes)\n• A community feed for sharing study tips and progress\n• A focus timer with XP and coin rewards\n• Curated YouTube study videos\n• Study groups organised by subject`}
        </Section>

        <Section title="Account Registration" colors={colors}>
          {`You must create an account to use most features. You agree to:\n\n• Provide accurate, current, and complete information.\n• Maintain the security of your password.\n• Promptly notify us of any unauthorised access.\n• Take responsibility for all activity under your account.\n\nYou must be at least 13 years old to create an account.`}
        </Section>

        <Section title="Subscriptions and Purchases" colors={colors}>
          {`ImproKinz offers free and premium ("ImproKinz Pro") tiers.\n\n• Subscription fees are charged to your App Store / Google Play account at confirmation of purchase.\n• Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period.\n• Manage or cancel your subscription through your device's subscription settings.\n• Refunds are subject to Apple App Store / Google Play refund policies.\n• We reserve the right to change pricing with reasonable notice.`}
        </Section>

        <Section title="User Content" colors={colors}>
          {`You retain ownership of content you post ("User Content"). By posting, you grant us a non-exclusive, worldwide, royalty-free licence to display, distribute, and promote your User Content within the App.\n\nYou agree NOT to post:\n\n• Content that is illegal, harmful, or violates others' rights.\n• Spam, misinformation, or off-topic promotional material.\n• Content unrelated to education or studying.\n\nWe reserve the right to remove any content that violates these Terms.`}
        </Section>

        <Section title="AI-Generated Content" colors={colors}>
          {`AI tools in the App generate content to assist your studies. This content is for educational guidance only and may not be 100% accurate. Always verify important information from authoritative sources. We are not liable for any decisions made based on AI-generated content.`}
        </Section>

        <Section title="Intellectual Property" colors={colors}>
          {`The App, including its design, code, branding, and original content, is owned by ImproKinz and protected by applicable intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the App without written permission.`}
        </Section>

        <Section title="Prohibited Uses" colors={colors}>
          {`You agree not to:\n\n• Use the App to harass, abuse, or harm others.\n• Attempt to bypass security measures or access others' accounts.\n• Scrape or harvest data from the App.\n• Use the App for any commercial purpose without our written consent.\n• Circumvent the credit or subscription system.`}
        </Section>

        <Section title="Disclaimer of Warranties" colors={colors}>
          {`The App is provided "as is" without warranties of any kind. We do not guarantee that the App will be error-free, uninterrupted, or that AI-generated study content will be accurate.`}
        </Section>

        <Section title="Limitation of Liability" colors={colors}>
          {`To the maximum extent permitted by law, ImproKinz shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.`}
        </Section>

        <Section title="Termination" colors={colors}>
          {`You may delete your account at any time from Settings → Delete Account. We may suspend or terminate your account if you violate these Terms. Upon termination, your right to use the App ceases immediately.`}
        </Section>

        <Section title="Changes to Terms" colors={colors}>
          {`We may update these Terms from time to time. We will notify you of material changes through the App. Continued use constitutes acceptance of the revised Terms.`}
        </Section>

        <Section title="Governing Law" colors={colors}>
          {`These Terms shall be governed by the laws of the Kingdom of Saudi Arabia. Any disputes shall be resolved in the courts of Saudi Arabia.`}
        </Section>

        <Section title="Contact" colors={colors}>
          {`For questions about these Terms:\n\nsupport@improkinz.com`}
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
