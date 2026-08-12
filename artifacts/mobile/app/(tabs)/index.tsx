import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
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
import { UserAvatar } from "@/components/UserAvatar";
import { CreditBalancePill } from "@/components/CreditUI";

const { width: W } = Dimensions.get("window");

const SUBJECT_COLORS: Record<string, [string, string]> = {
  Math: ["#4F46E5", "#818CF8"],
  Science: ["#059669", "#34D399"],
  Biology: ["#16A34A", "#4ADE80"],
  Physics: ["#0891B2", "#22D3EE"],
  Chemistry: ["#D97706", "#FCD34D"],
  History: ["#B45309", "#F59E0B"],
  "Computer Science": ["#7C3AED", "#A78BFA"],
  CS: ["#7C3AED", "#A78BFA"],
  English: ["#DB2777", "#F472B6"],
  Languages: ["#BE185D", "#F9A8D4"],
  Art: ["#9333EA", "#C084FC"],
  Business: ["#0369A1", "#38BDF8"],
  Medicine: ["#DC2626", "#F87171"],
};

const SUBJECT_ICONS: Record<string, string> = {
  Math: "calculator",
  Science: "flask-conical",
  Biology: "leaf",
  Physics: "atom",
  Chemistry: "test-tube",
  History: "book-open",
  "Computer Science": "code-2",
  CS: "code-2",
  English: "type",
  Languages: "languages",
  Art: "palette",
  Business: "briefcase",
  Medicine: "heart-pulse",
};

const TOOLS = [
  { icon: "layers", label: "Flashcards", route: "/flashcards", color: "#4F46E5" },
  { icon: "align-left", label: "Summarizer", route: "/summarizer", color: "#7C3AED" },
  { icon: "check-square", label: "Quiz", route: "/quiz", color: "#D97706" },
  { icon: "file-text", label: "Notes", route: "/notes", color: "#0891B2" },
  { icon: "message-circle", label: "Chatbot", route: "/chatbot", color: "#059669" },
  { icon: "calculator", label: "Calculator", route: "/calculator", color: "#DB2777" },
];

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${time}, ${name.split(" ")[0]} 👋`;
}

function StudyGoalBar({ goal, done }: { goal: number; done: number }) {
  const colors = useColors();
  const pct = Math.min(1, goal > 0 ? done / goal : 0);
  return (
    <View style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.goalHeader}>
        <Icon name="target" size={16} color={colors.primary} />
        <Text style={[styles.goalTitle, { color: colors.foreground }]}>Daily Goal</Text>
        <Text style={[styles.goalCount, { color: colors.primary }]}>{done}/{goal} min</Text>
      </View>
      <View style={[styles.goalTrack, { backgroundColor: colors.secondary }]}>
        <LinearGradient
          colors={[colors.purpleStart, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.goalFill, { width: `${Math.round(pct * 100)}%` as any }]}
        />
      </View>
      <Text style={[styles.goalSub, { color: colors.mutedForeground }]}>
        {pct >= 1 ? "🎉 Goal reached! Keep going!" : `${goal - done} min left to hit your goal`}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, user } = useAuth();

  const [studiedToday, setStudiedToday] = useState(0); // will grow as user uses Focus

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const displayName = profile?.displayName || user?.displayName || "Learner";
  const streak = (profile as any)?.streak ?? 0;
  const xp = profile?.xp ?? 0;
  const studyGoal: number = parseInt(String((profile as any)?.studyGoal ?? "30"), 10) || 30;

  // Subjects — could be array (new) or single string (old)
  const rawSubjects = (profile as any)?.subjects;
  const subjects: string[] = Array.isArray(rawSubjects)
    ? rawSubjects
    : typeof rawSubjects === "string" && rawSubjects
    ? [rawSubjects]
    : ["Science", "Math", "History"]; // friendly default

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: botPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <LinearGradient
        colors={[colors.purpleEnd, colors.purpleStart]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroBg, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.heroRow}>
          <TouchableOpacity onPress={() => router.push("/profile" as any)}>
            <UserAvatar photoURL={profile?.photoURL} displayName={displayName} size={44} />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Text style={styles.heroGreeting} numberOfLines={1}>{greeting(displayName)}</Text>
            <Text style={styles.heroSub}>Ready to study today?</Text>
          </View>
          <CreditBalancePill />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statVal}>{streak}</Text>
            <Text style={styles.statLbl}>day streak</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statPill}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statVal}>{xp.toLocaleString()}</Text>
            <Text style={styles.statLbl}>XP earned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statPill}>
            <Icon name="trophy" size={16} color="#F59E0B" />
            <Text style={styles.statVal}>{Math.floor(xp / 100)}</Text>
            <Text style={styles.statLbl}>treasures</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Daily goal bar */}
        <StudyGoalBar goal={studyGoal} done={studiedToday} />

        {/* Subject bubbles */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Subjects</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bubblesRow}>
          {subjects.map((subj) => {
            const gradColors = SUBJECT_COLORS[subj] ?? (["#7C3AED", "#A78BFA"] as [string, string]);
            const iconName = SUBJECT_ICONS[subj] ?? "book-open";
            return (
              <TouchableOpacity
                key={subj}
                style={styles.bubbleWrap}
                onPress={() => router.push({ pathname: "/(tabs)/community", params: { community: subj } })}
                activeOpacity={0.8}
              >
                <View style={[styles.bubbleRing, { borderColor: gradColors[0] + "60" }]}>
                  <LinearGradient
                    colors={gradColors}
                    style={styles.bubble}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon name={iconName as any} size={24} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={[styles.bubbleLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {subj}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Add subjects */}
          <TouchableOpacity
            style={styles.bubbleWrap}
            onPress={() => router.push("/onboarding")}
            activeOpacity={0.8}
          >
            <View style={[styles.bubbleRing, { borderColor: colors.border }]}>
              <View style={[styles.bubble, { backgroundColor: colors.card }]}>
                <Icon name="plus" size={22} color={colors.mutedForeground} />
              </View>
            </View>
            <Text style={[styles.bubbleLabel, { color: colors.mutedForeground }]}>Add</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Quick Start Focus */}
        <TouchableOpacity
          style={[styles.focusCTA, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/focus" as any)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.purpleStart, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.focusCTAIcon}
          >
            <Icon name="timer" size={20} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.focusCTATitle, { color: colors.foreground }]}>Start a Focus Session</Text>
            <Text style={[styles.focusCTASub, { color: colors.mutedForeground }]}>
              Set your timer, earn coins on completion
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* AI Study Tools */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>AI Study Tools</Text>
        <View style={styles.toolsGrid}>
          {TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.label}
              style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(tool.route as any)}
              activeOpacity={0.78}
            >
              <View style={[styles.toolIcon, { backgroundColor: tool.color + "22" }]}>
                <Icon name={tool.icon as any} size={22} color={tool.color} />
              </View>
              <Text style={[styles.toolLabel, { color: colors.foreground }]}>{tool.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Community CTA */}
        <TouchableOpacity
          style={[styles.communityCTA, { backgroundColor: colors.secondary }]}
          onPress={() => router.push("/(tabs)/community" as any)}
          activeOpacity={0.85}
        >
          <Icon name="users" size={20} color={colors.primary} />
          <Text style={[styles.communityCTAText, { color: colors.primary }]}>
            See what the community is studying →
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroBg: { paddingHorizontal: 18, paddingBottom: 22 },
  heroRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  heroGreeting: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 },
  heroSub: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  statPill: { flex: 1, alignItems: "center", gap: 2 },
  statEmoji: { fontSize: 16 },
  statVal: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  statLbl: { color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", fontSize: 10 },
  statDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" },

  body: { paddingHorizontal: 16, paddingTop: 18, gap: 18 },

  goalCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  goalHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  goalTitle: { fontFamily: "Inter_700Bold", fontSize: 14, flex: 1 },
  goalCount: { fontFamily: "Inter_700Bold", fontSize: 14 },
  goalTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  goalFill: { height: 8, borderRadius: 4 },
  goalSub: { fontFamily: "Inter_400Regular", fontSize: 12 },

  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: -8 },

  bubblesRow: { gap: 16, paddingVertical: 4, paddingHorizontal: 2 },
  bubbleWrap: { alignItems: "center", gap: 7, width: 70 },
  bubbleRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, padding: 4 },
  bubble: { flex: 1, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  bubbleLabel: { fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center" },

  focusCTA: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 15 },
  focusCTAIcon: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  focusCTATitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  focusCTASub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },

  toolsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  toolCard: {
    width: (W - 32 - 10) / 2 - 0.5,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toolIcon: { width: 42, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  toolLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },

  communityCTA: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 4 },
  communityCTAText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
