import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { LeaderboardItem } from "@/components/LeaderboardItem";

interface LeaderUser {
  uid: string;
  displayName: string;
  photoURL: string;
  xp: number;
  streak: number;
}

type Tab = "xp" | "streak";

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("xp");
  const [xpLeaders, setXpLeaders] = useState<LeaderUser[]>([]);
  const [streakLeaders, setStreakLeaders] = useState<LeaderUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [xpSnap, streakSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), orderBy("xp", "desc"), limit(50))),
        getDocs(query(collection(db, "users"), orderBy("streak", "desc"), limit(50))),
      ]);
      setXpLeaders(xpSnap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<LeaderUser, "uid">) })));
      setStreakLeaders(streakSnap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<LeaderUser, "uid">) })));
      setLoading(false);
    };
    fetch();
  }, []);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  const leaders = tab === "xp" ? xpLeaders : streakLeaders;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={[styles.header, { paddingTop: topPad + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <Text style={styles.headerSub}>
          {tab === "xp" ? "All-time knowledge points" : "Current daily streaks — resets if you miss a day"}
        </Text>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabChip, { backgroundColor: tab === "xp" ? "#FFFFFF" : "rgba(255,255,255,0.2)" }]}
            onPress={() => setTab("xp")}
          >
            <Text style={[styles.tabChipText, { color: tab === "xp" ? colors.gradientEnd : "#FFFFFF" }]}>
              ★ XP Rank
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabChip, { backgroundColor: tab === "streak" ? "#FFFFFF" : "rgba(255,255,255,0.2)" }]}
            onPress={() => setTab("streak")}
          >
            <Text style={[styles.tabChipText, { color: tab === "streak" ? colors.gradientEnd : "#FFFFFF" }]}>
              ✦ Streaks
            </Text>
          </TouchableOpacity>
        </View>

        {/* Fairness note for streaks */}
        {tab === "streak" && (
          <View style={styles.fairnessNote}>
            <Text style={styles.fairnessText}>
              ⚖ Fair for everyone — streaks reset daily so new users compete equally
            </Text>
          </View>
        )}
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={leaders}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: botPad }}
          ListHeaderComponent={
            leaders.length > 0 ? (
              <View style={styles.podiumRow}>
                {[1, 0, 2].map((pos) => {
                  const item = leaders[pos];
                  if (!item) return null;
                  const isCenter = pos === 0;
                  const value = tab === "xp" ? `${item.xp?.toLocaleString() ?? 0} XP` : `${item.streak ?? 0}d`;
                  return (
                    <View key={item.uid} style={[styles.podiumItem, isCenter && styles.podiumCenter]}>
                      <Text style={styles.podiumMedal}>{RANK_MEDALS[pos]}</Text>
                      <View
                        style={[
                          styles.podiumAvatar,
                          {
                            backgroundColor: colors.secondary,
                            borderColor: isCenter ? colors.primary : colors.border,
                            width: isCenter ? 60 : 50,
                            height: isCenter ? 60 : 50,
                            borderRadius: isCenter ? 30 : 25,
                          },
                        ]}
                      >
                        <Text style={[styles.podiumInitial, { fontSize: isCenter ? 24 : 20 }]}>
                          {(item.displayName?.[0] ?? "?").toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.podiumName, { color: colors.foreground }]} numberOfLines={1}>
                        {item.displayName}
                      </Text>
                      <View style={[styles.podiumScore, { backgroundColor: colors.primary + "22" }]}>
                        <Text style={[styles.podiumScoreText, { color: colors.primary }]}>{value}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            if (index < 3) return null;
            return (
              <LeaderboardItem
                rank={index + 1}
                displayName={item.displayName}
                photoURL={item.photoURL}
                xp={tab === "xp" ? (item.xp ?? 0) : (item.streak ?? 0)}
                streak={item.streak ?? 0}
                isMe={item.uid === user?.uid}
                showStreak={tab === "streak"}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="award" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No students ranked yet
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 4 },
  backBtn: { marginBottom: 8 },
  headerTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 14, lineHeight: 18 },
  tabRow: { flexDirection: "row", gap: 10 },
  tabChip: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
  },
  tabChipText: { fontSize: 14, fontWeight: "700" },
  fairnessNote: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  fairnessText: { color: "#FFFFFF", fontSize: 12, lineHeight: 17 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  podiumRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  podiumItem: { alignItems: "center", gap: 6, flex: 1 },
  podiumCenter: { marginBottom: 10 },
  podiumMedal: { fontSize: 28 },
  podiumAvatar: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumInitial: { fontWeight: "700", color: "#FFFFFF" },
  podiumName: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  podiumScore: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  podiumScoreText: { fontSize: 11, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14 },
});
