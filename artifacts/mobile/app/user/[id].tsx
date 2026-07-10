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
  Dimensions,
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
import { Post, PostCard, normalizePost } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { XPStreakBadge } from "@/components/XPStreakBadge";

export default function UserProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [tab, setTab] = useState<"posts" | "photos" | "videos">("posts");
  const SCREEN_WIDTH = Dimensions.get("window").width;
  const GRID_COL = 3;
  const GRID_ITEM = (SCREEN_WIDTH - 4) / GRID_COL;

  const TAB_CONFIG = [
    { key: "posts",  icon: "grid",        label: "Posts"  },
    { key: "photos", icon: "image",       label: "Photos" },
    { key: "videos", icon: "play-circle", label: "Videos" },
  ] as const;
  // Local optimistic state — null means "use myProfile as source of truth"
  const [localFollowing, setLocalFollowing] = useState<boolean | null>(null);

  const targetId = Array.isArray(id) ? id[0] : id ?? "";
  const isOwnProfile = user?.uid === targetId;
  // Use local override when set (optimistic), otherwise fall back to server profile
  const isFollowing = localFollowing !== null
    ? localFollowing
    : !!(myProfile?.following?.includes(targetId));
  const followingCount = profile?.following?.length ?? 0;

  // Sync localFollowing when myProfile loads (first mount only)
  React.useEffect(() => {
    if (myProfile && localFollowing === null) {
      setLocalFollowing(!!(myProfile.following?.includes(targetId)));
    }
  }, [myProfile, targetId]);

  useEffect(() => {
    if (!targetId) return;
    const fetchData = async () => {
      try {
        const [userSnap, postsSnap, followerSnap] = await Promise.all([
          getDoc(doc(db, "profiles", targetId)),
          getDocs(query(collection(db, "community_posts"), where("authorId", "==", targetId))),
          // Count followers by querying profiles who have targetId in their following array
          getDocs(query(collection(db, "profiles"), where("following", "array-contains", targetId))),
        ]);
        if (userSnap.exists()) setProfile(userSnap.data() as UserProfile);
        setFollowerCount(followerSnap.size);
        const mapped = postsSnap.docs.map((d) => normalizePost(d.id, d.data()));
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

    // Optimistic update first — button flips immediately
    const newState = !isFollowing;
    setLocalFollowing(newState);
    setFollowerCount((c) => newState ? c + 1 : Math.max(0, c - 1));
    setFollowLoading(true);
    try {
      await updateDoc(doc(db, "profiles", user.uid), {
        following: newState ? arrayUnion(targetId) : arrayRemove(targetId),
      });
      refreshProfile().catch(() => {});
    } catch (e) {
      // Revert on failure
      setLocalFollowing(!newState);
      setFollowerCount((c) => newState ? Math.max(0, c - 1) : c + 1);
      console.warn("follow/unfollow error:", e);
    }
    finally { setFollowLoading(false); }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);
  const photoPosts = posts.filter((p) => p.imageUrl || p.mediaType === "image");
  const videoPosts = posts.filter((p) => p.videoUrl || p.mediaType === "video");
  const isGrid = tab === "photos" || tab === "videos";
  const gridItems = tab === "photos" ? photoPosts : videoPosts;

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
        key={isGrid ? "grid" : "list"}
        data={isGrid ? [] : posts}
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

            {/* ── 3-tab bar: Posts | Photos | Videos ── */}
            <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
              {TAB_CONFIG.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tabBtn, tab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
                  onPress={() => setTab(t.key)}
                >
                  <Icon name={t.icon} size={18} color={tab === t.key ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.tabLabel, { color: tab === t.key ? colors.primary : colors.mutedForeground }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Photo / Video grid ── */}
            {isGrid && (
              gridItems.length === 0 ? (
                <View style={styles.empty}>
                  <Icon
                    name={tab === "photos" ? "image" : "play-circle"}
                    size={40}
                    color={colors.mutedForeground}
                  />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    {tab === "photos" ? "No photos yet" : "No videos yet"}
                  </Text>
                </View>
              ) : (
                <View style={styles.grid}>
                  {gridItems.map((post, i) => {
                    const imgSrc = post.imageUrl || post.mediaUrl;
                    const vidSrc = post.videoUrl || (post.mediaType === "video" ? post.mediaUrl : undefined);
                    const thumbSrc = tab === "videos" && vidSrc
                      ? vidSrc.replace(/\.(mp4|mov|webm)(\?.*)?$/, ".jpg")
                      : imgSrc;
                    return (
                      <TouchableOpacity
                        key={post.id}
                        onPress={() => router.push(`/post/${post.id}`)}
                        style={[styles.gridCell, {
                          width: GRID_ITEM,
                          height: GRID_ITEM,
                          marginRight: i % GRID_COL === GRID_COL - 1 ? 0 : 2,
                          marginBottom: 2,
                          backgroundColor: colors.muted,
                        }]}
                        activeOpacity={0.85}
                      >
                        {thumbSrc ? (
                          <Image source={{ uri: thumbSrc }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        ) : (
                          <View style={[StyleSheet.absoluteFill, styles.gridPlaceholder]}>
                            <Icon name={tab === "videos" ? "play-circle" : "image"} size={28} color={colors.mutedForeground} />
                          </View>
                        )}
                        {tab === "videos" && (
                          <View style={styles.videoOverlay}>
                            <Icon name="play-solid" size={20} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
            )}
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} />}
        ListEmptyComponent={
          !isGrid ? (
            <View style={styles.empty}>
              <Icon name="file-text" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No posts yet</Text>
            </View>
          ) : null
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
  empty: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { fontFamily: undefined, fontSize: 14 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, marginTop: 0, marginBottom: 0 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 3, borderBottomWidth: 2.5, borderBottomColor: "transparent" },
  tabLabel: { fontSize: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingTop: 2 },
  gridCell: { overflow: "hidden", position: "relative" },
  gridPlaceholder: { alignItems: "center", justifyContent: "center" },
  videoOverlay: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});
