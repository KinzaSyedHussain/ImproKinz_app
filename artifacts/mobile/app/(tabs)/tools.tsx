import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const TOOLS = [
  {
    icon: "layers",
    label: "Flashcard Generator",
    desc: "Transform any text or notes into interactive Q&A flashcards for effective memorization.",
    route: "/flashcards",
    gradient: ["#4F46E5", "#7C3AED"] as [string, string],
    xp: "+15 XP per session",
  },
  {
    icon: "align-left",
    label: "AI Summarizer",
    desc: "Get concise, key-point summaries from lengthy study materials in seconds.",
    route: "/summarizer",
    gradient: ["#7C3AED", "#DB2777"] as [string, string],
    xp: "+10 XP per summary",
  },
  {
    icon: "check-square",
    label: "Quiz Generator",
    desc: "Test your knowledge with AI-generated multiple choice questions from your material.",
    route: "/quiz",
    gradient: ["#059669", "#0891B2"] as [string, string],
    xp: "+20 XP per quiz",
  },
];

export default function ToolsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: botPad }}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={[styles.headerGradient, { paddingTop: topPad + 16 }]}
      >
        <Text style={styles.headerLabel}>STUDY TOOLS</Text>
        <Text style={styles.headerTitle}>AI-Powered Learning</Text>
        <Text style={styles.headerSub}>
          Use AI tools to study smarter and earn XP points
        </Text>
        <View style={styles.xpWrap}>
          <Text style={styles.xpText}>★ {profile?.xp?.toLocaleString() ?? 0} XP total</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.route}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(tool.route as any)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={tool.gradient}
              style={styles.cardIcon}
            >
              <Icon name={tool.icon as any} size={28} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {tool.label}
              </Text>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
                {tool.desc}
              </Text>
              <View style={[styles.xpBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.xpBadgeText, { color: colors.primary }]}>
                  {tool.xp}
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}

        <View style={[styles.tipCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Icon name="info" size={18} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
            Tip: You can input text directly or paste content from your study materials. PDF content can be copied and pasted.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  headerLabel: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: undefined,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontFamily: undefined,
    fontSize: 28,
  },
  headerSub: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: undefined,
    fontSize: 14,
    marginTop: 6,
  },
  xpWrap: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  xpText: {
    color: "#FFFFFF",
    fontFamily: undefined,
    fontSize: 14,
  },
  content: { padding: 16, gap: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: { flex: 1, gap: 6 },
  cardTitle: { fontFamily: undefined, fontSize: 16 },
  cardDesc: { fontFamily: undefined, fontSize: 13, lineHeight: 18 },
  xpBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 2,
  },
  xpBadgeText: { fontFamily: undefined, fontSize: 11 },
  tipCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  tipText: { flex: 1, fontFamily: undefined, fontSize: 13, lineHeight: 18 },
});
