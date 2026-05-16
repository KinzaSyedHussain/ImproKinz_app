import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserProfile, useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { Post, PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { XPStreakBadge } from "@/components/XPStreakBadge";

export default function UserProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const targetId = Array.isArray(id) ? id[0] : id ?? "";
  const isOwnProfile = user?.uid === targetId;
  const isFollowing = !!(user && profile?.followers?.includes(user.uid));
  const followerCount = profile?.followers?.length ?? 0;
  const followingCount = profile?.following?.length ?? 0;

  useEffect(() => {
    if (!targetId) return;
    const fetchData = async () => {
      try {
        const [userSnap, postsSnap] = await Promise.all([
          getDoc(doc(db, "users", targetId)),
          getDocs(query(collection(db, "community_posts"), where("authorId", "==", targetId))),
        ]);
        if (userSnap.exists()) setProfile(userSnap.data() as UserProfile);
        const mapped = postsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Post, "id">),
          createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
        }));
        setPosts(mapped.sort((a, b) => b.createdAt - a.createdAt));
      } catch (e) {
        console.warn("fetchData error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [targetId]);

  const handleFollow = async () => {
    if (!user || !targetId || followLoading) return;

    if (isFollowing) {
      Alert.alert(
        `Unfollow ${profile?.displayName ?? "this user"}?`,
        "You will no longer see their posts.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unfollow",
            style: "destructive",
            onPress: async () => {
              setFollowLoading(true);
              try {
                await Promise.all([
                  updateDoc(doc(db, "users", targetId), { followers: arrayRemove(user.uid) }),
                  updateDoc(doc(db, "users", user.uid), { following: arrayRemove(targetId) }),
                ]);
                setProfile((p) => p ? { ...p, followers: (p.followers ?? []).filter((f) => f !== user.uid) } : p);
                refreshProfile().catch(() => {});
              } catch (e) { console.warn("unfollow error:", e); }
              finally { setFollowLoading(false); }
            },
          },
        ]
      );
      return;
    }

    setFollowLoading(true);
    try {
      await Promise.all([
        updateDoc(doc(db, "users", targetId), { followers: arrayUnion(user.uid) }),
        updateDoc(doc(db, "users", user.uid), { following: arrayUnion(targetId) }),
      ]);
      setProfile((p) => p ? { ...p, followers: [...(p.followers ?? []), user.uid] } : p);
      refreshProfile().catch(() => {});
    } catch (e) { console.warn("follow error:", e); }
    finally { setFollowLoading(false); }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: botPad }}
        ListHeaderComponent={
          <View>
            {/* Banner area — image if available, gradient fallback */}
            <View style={[styles.bannerWrap, { paddingTop: topPad }]}>
              {profile?.bannerUrl ? (
                <Image
                  source={{ uri: profile.bannerUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  style={StyleSheet.absoluteFill}
                />
              )}
              {/* Back button overlaid on banner */}
              <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { top: topPad + 8 }]}>
                <Icon name="arrow-left" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Avatar + name card sitting below banner */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={styles.avatarRow}>
                <View style={[styles.avatarRing, { borderColor: colors.card }]}>
                  <UserAvatar
                    photoURL={profile?.photoURL}
                    displayName={profile?.displayName}
                    size={76}
                  />
                </View>
                {/* Follow button — only for other users */}
                {!isOwnProfile && user && (
                  <TouchableOpacity
                    onPress={handleFollow}
                    disabled={followLoading}
                    style={[
                      styles.followBtn,
                      isFollowing
                        ? { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border }
                        : { backgroundColor: colors.primary },
                    ]}
                  >
                    {followLoading
                      ? <ActivityIndicator size="small" color={isFollowing ? colors.mutedForeground : "#fff"} />
                      : <Text style={[styles.followBtnText, { color: isFollowing ? colors.mutedForeground : "#fff" }]}>
                          {isFollowing ? "Following" : "Follow"}
                        </Text>}
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.name, { color: colors.foreground }]}>
                {profile?.displayName || "User"}
              </Text>
              {profile?.bio ? (
                <Text style={[styles.bio, { color: colors.mutedForeground }]}>{profile.bio}</Text>
              ) : null}

              {/* Followers / Following / Posts stats */}
              <View style={styles.statsRow}>
                <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/followers/${targetId}?tab=followers`)}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{followerCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Followers</Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/followers/${targetId}?tab=following`)}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{followingCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Following</Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{posts.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Posts</Text>
                </View>
              </View>
            </View>

            <View style={{ paddingVertical: 16 }}>
              {profile && <XPStreakBadge xp={profile.xp ?? 0} streak={profile.streak ?? 0} />}
            </View>

            {profile?.subjects && profile.subjects.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
                {profile.subjects.map((s) => (
                  <View key={s} style={[styles.chip, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.chipText, { color: colors.primary }]}>{s}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Posts ({posts.length})
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="file-text" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No posts yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  bannerWrap: { height: 160, position: "relative", overflow: "hidden" },
  backBtn: { position: "absolute", left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  infoCard: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  avatarRow: { marginTop: -38, marginBottom: 10, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  avatarRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, overflow: "hidden" },
  followBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, minWidth: 100, alignItems: "center", justifyContent: "center" },
  followBtnText: { fontSize: 14, fontWeight: "600" },
  name: { fontFamily: undefined, fontSize: 20, fontWeight: "700", marginBottom: 2 },
  bio: { fontFamily: undefined, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 0 },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 17, fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 1 },
  statDivider: { width: 1, height: 28, marginHorizontal: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText: { fontFamily: undefined, fontSize: 13 },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, marginBottom: 4 },
  sectionTitle: { fontFamily: undefined, fontSize: 16 },
  empty: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { fontFamily: undefined, fontSize: 14 },
});
