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
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W } = Dimensions.get("window");
const GAP = 12;
const PAD = 16;
const COLS = 2;
const CARD_W = (SCREEN_W - PAD * 2 - GAP * (COLS - 1)) / COLS;

const TOOLS = [
  { icon: "layers", label: "Flashcards", route: "/flashcards", colors: ["#4F46E5", "#7C3AED"] as [string, string] },
  { icon: "align-left", label: "Summarizer", route: "/summarizer", colors: ["#7C3AED", "#DB2777"] as [string, string] },
  { icon: "check-circle", label: "Todo", route: "/todo", colors: ["#059669", "#0891B2"] as [string, string] },
  { icon: "check-square", label: "Quiz", route: "/quiz", colors: ["#D97706", "#B45309"] as [string, string] },
  { icon: "grid", label: "Board", route: "/board", colors: ["#2563EB", "#06B6D4"] as [string, string] },
  { icon: "edit-2", label: "Notes", route: "/notes", colors: ["#DC2626", "#F97316"] as [string, string] },
  { icon: "message-circle", label: "Chatbot", route: "/chatbot", colors: ["#4F46E5", "#06B6D4"] as [string, string] },
  { icon: "clock", label: "Pomodoro", route: "/pomodoro", colors: ["#059669", "#84CC16"] as [string, string] },
  { icon: "bar-chart-2", label: "Progress", route: "/progress", colors: ["#7C3AED", "#EC4899"] as [string, string] },
  { icon: "cpu", label: "Calculator", route: "/calculator", colors: ["#0891B2", "#2563EB"] as [string, string] },
];

export default function DashboardScreen() {
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
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.headerLabel, { color: colors.mutedForeground }]}>STUDY DASHBOARD</Text>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Your Learning Hub</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Access all your study tools in one place</Text>
        <View style={styles.xpWrap}>
          <Text style={[styles.xpText, { color: colors.primary }]}>★ {profile?.xp?.toLocaleString() ?? 0} XP</Text>
        </View>
      </View>

      {/* 2-column grid */}
      <View style={[styles.grid, { paddingHorizontal: PAD }]}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.label}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(tool.route as any)}
            activeOpacity={0.75}
          >
            <LinearGradient colors={tool.colors} style={styles.cardIcon}>
              <Icon name={tool.icon as any} size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.cardLabel, { color: colors.foreground }]}>{tool.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: PAD,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#FFFFFF10",
  },
  headerLabel: {
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 14,
    marginTop: 4,
  },
  xpWrap: {
    marginTop: 14,
    backgroundColor: "rgba(245,158,11,0.18)",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F59E0B44",
  },
  xpText: {
    fontSize: 13,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: PAD,
    gap: GAP,
    justifyContent: "space-between",
  },
  card: {
    width: CARD_W,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
