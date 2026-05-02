import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { useUserPhoto } from "@/hooks/useUserPhotoCache";
import { Post, PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";

interface TopUser {
  uid: string;
  displayName: string;
  photoURL: string;
  xp: number;
  streak: number;
}

function TopUserCard({ user }: { user: TopUser }) {
  const colors = useColors();
  const router = useRouter();
  const livePhoto = useUserPhoto(user.uid, user.photoURL);
  return (
    <TouchableOpacity
      style={[styles.topUserCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/user/${user.uid}` as any)}
    >
      <UserAvatar photoURL={livePhoto} displayName={user.displayName} size={48} />
      <Text style={[styles.topUserName, { color: colors.foreground }]} numberOfLines={1}>
        {user.displayName}
      </Text>
      <View style={[styles.xpBadge, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.xpBadgeText, { color: colors.primary }]}>
          ★ {user.xp >= 1000 ? `${(user.xp / 1000).toFixed(1)}k` : user.xp}
        </Text>
      </View>
      {user.streak > 0 && (
        <Text style={[styles.streakText, { color: colors.mutedForeground }]}>
          ✦ {user.streak}d
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 70 + insets.bottom;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        setLoading(true);
        try {
          const [postsSnap, usersSnap] = await Promise.all([
            getDocs(query(
              collection(db, "community_posts"),
              orderBy("likes", "desc"),
              limit(20)
            )).catch(() =>
              getDocs(query(collection(db, "community_posts"), limit(20)))
            ),
            getDocs(query(
              collection(db, "users"),
              orderBy("xp", "desc"),
              limit(8)
            )),
          ]);
          if (cancelled) return;
          const posts: Post[] = postsSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Post, "id">),
            createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
          }));
          const users: TopUser[] = usersSnap.docs.map((d) => ({
            uid: d.id,
            displayName: d.data()["displayName"] ?? "Learner",
            photoURL: d.data()["photoURL"] ?? "",
            xp: d.data()["xp"] ?? 0,
            streak: d.data()["streak"] ?? 0,
          }));
          setTopPosts(posts);
          setTopUsers(users);
        } catch (e) {
          console.warn("Discover load error:", e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Discover</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Trending knowledge</Text>
        </View>
        <TouchableOpacity
          style={[styles.leaderboardBtn, { backgroundColor: colors.secondary }]}
          onPress={() => router.push("/leaderboard" as any)}
        >
          <Icon name="award" size={16} color={colors.primary} />
          <Text style={[styles.leaderboardBtnText, { color: colors.primary }]}>Full Board</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={topPosts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: botPad }}
          ListHeaderComponent={
            <View>
              {/* Hero banner */}
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroBanner}
              >
                <Text style={styles.heroEmoji}>🏆</Text>
                <Text style={styles.heroTitle}>Top Learners</Text>
                <Text style={styles.heroSub}>Explore the best study content and connect with top students</Text>
              </LinearGradient>

              {/* Top users horizontal scroll */}
              {topUsers.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="star" size={14} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Rising Stars</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.usersRow}
                  >
                    {topUsers.map((u) => (
                      <TopUserCard key={u.uid} user={u} />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Trending posts header */}
              <View style={[styles.sectionHeader, styles.trendingHeader]}>
                <Icon name="activity" size={14} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trending Posts</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => <PostCard post={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="search" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Be the first to post something!
              </Text>
              <TouchableOpacity
                style={[styles.postCta, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/create-post" as any)}
              >
                <Text style={[styles.postCtaText, { color: colors.primaryForeground }]}>
                  Create a Post
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 2 },
  leaderboardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  leaderboardBtnText: { fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroBanner: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  heroEmoji: { fontSize: 40 },
  heroTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  heroSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, textAlign: "center", lineHeight: 18 },
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  trendingHeader: { marginTop: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  usersRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  topUserCard: {
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    width: 100,
    gap: 6,
  },
  topUserName: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  xpBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  xpBadgeText: { fontSize: 11, fontWeight: "600" },
  streakText: { fontSize: 11 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  postCta: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  postCtaText: { fontSize: 14, fontWeight: "700" },
});
