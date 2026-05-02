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

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<LeaderUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const q = query(
        collection(db, "users"),
        orderBy("xp", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      setLeaders(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<LeaderUser, "uid">) })));
      setLoading(false);
    };
    fetch();
  }, []);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

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
        <Text style={styles.headerSub}>Top students this week</Text>
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
          renderItem={({ item, index }) => (
            <LeaderboardItem
              rank={index + 1}
              displayName={item.displayName}
              photoURL={item.photoURL}
              xp={item.xp ?? 0}
              streak={item.streak ?? 0}
              isMe={item.uid === user?.uid}
            />
          )}
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
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 4 },
  backBtn: { marginBottom: 12 },
  headerTitle: { color: "#FFFFFF", fontFamily: undefined, fontSize: 28 },
  headerSub: { color: "rgba(255,255,255,0.75)", fontFamily: undefined, fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontFamily: undefined, fontSize: 14 },
});
