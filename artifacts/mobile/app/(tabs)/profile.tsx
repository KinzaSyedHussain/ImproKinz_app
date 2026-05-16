import { Icon } from "@/components/Icon";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { doc, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
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
import { Post, PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { XPStreakBadge } from "@/components/XPStreakBadge";

async function pickAndConvertToBase64(
  options: ImagePicker.ImagePickerOptions,
  maxWidth: number,
  maxHeight: number
): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]?.uri) return null;
  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: maxWidth, height: maxHeight } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!manipulated.base64) throw new Error("Image conversion failed.");
  return `data:image/jpeg;base64,${manipulated.base64}`;
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, user, refreshProfile } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [tab, setTab] = useState<"posts" | "photos" | "videos" | "saved">("posts");
  const [followerCount, setFollowerCount] = useState(0);
  const SCREEN_WIDTH = Dimensions.get("window").width;
  const GRID_COL = 3;
  const GRID_ITEM = (SCREEN_WIDTH - 4) / GRID_COL;

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchPosts = async () => {
      try {
        const toPost = (d: any): Post => ({
          id: d.id,
          ...(d.data() as Omit<Post, "id">),
          createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
        });
        const sort = (arr: Post[]) => arr.sort((a, b) => b.createdAt - a.createdAt);
        const [snap, savedSnap, followerSnap] = await Promise.all([
          getDocs(query(collection(db, "community_posts"), where("authorId", "==", user.uid))),
          getDocs(query(collection(db, "community_posts"), where("savedBy", "array-contains", user.uid))),
          // Count my followers by querying users who have my uid in their following array
          getDocs(query(collection(db, "users"), where("following", "array-contains", user.uid))),
        ]);
        setPosts(sort(snap.docs.map(toPost)));
        setSavedPosts(sort(savedSnap.docs.map(toPost)));
        setFollowerCount(followerSnap.size);
      } catch (e) {
        console.warn("fetchPosts error:", e);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchPosts();
  }, [user]);

  const pickAvatar = async () => {
    if (!user || uploadingAvatar) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await pickAndConvertToBase64(
        { mediaTypes: ["images"] as any, allowsEditing: true, aspect: [1, 1], quality: 1 },
        300, 300
      );
      if (dataUrl) {
        await setDoc(doc(db, "users", user.uid), { photoURL: dataUrl }, { merge: true });
        await refreshProfile();
      }
    } catch (e: any) {
      Alert.alert("Photo failed", e?.message || "Could not process photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickBanner = async () => {
    if (!user || uploadingBanner) return;
    setUploadingBanner(true);
    try {
      const dataUrl = await pickAndConvertToBase64(
        { mediaTypes: ["images"] as any, allowsEditing: true, aspect: [16, 9], quality: 1 },
        900, 400
      );
      if (dataUrl) {
        await setDoc(doc(db, "users", user.uid), { bannerUrl: dataUrl }, { merge: true });
        await refreshProfile();
      }
    } catch (e: any) {
      Alert.alert("Banner failed", e?.message || "Could not process banner.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const topPad = insets.top;
  const botPad = 70 + insets.bottom;
  const BANNER_HEIGHT = 160;
  const photoPosts = posts.filter((p) => p.imageUrl || p.mediaType === "image");
  const videoPosts = posts.filter((p) => p.videoUrl || p.mediaType === "video");
  const isGrid = tab === "photos" || tab === "videos";
  const gridItems = tab === "photos" ? photoPosts : videoPosts;
  const displayPosts = tab === "saved" ? savedPosts : posts;
  const subjects: string[] = (profile as any)?.subjects || [];
  const goal: string = (profile as any)?.studyGoal || "";

  const TAB_CONFIG = [
    { key: "posts",  icon: "grid",       label: "Posts"  },
    { key: "photos", icon: "image",      label: "Photos" },
    { key: "videos", icon: "play-circle", label: "Videos" },
    { key: "saved",  icon: "bookmark",   label: "Saved"  },
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        key={isGrid ? "grid" : "list"}
        data={isGrid ? [] : displayPosts}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: botPad }}
        ListHeaderComponent={
          <View>
            {/* ── Banner ── */}
            <View style={{ height: BANNER_HEIGHT + topPad, position: "relative" }}>
              <View style={{ height: BANNER_HEIGHT + topPad, overflow: "hidden" }}>
                {profile?.bannerUrl ? (
                  <Image
                    source={{ uri: profile.bannerUrl }}
                    style={[StyleSheet.absoluteFill, { marginTop: topPad }]}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.purpleStart, colors.purpleEnd]}
                    style={[StyleSheet.absoluteFill, { marginTop: topPad }]}
                  />
                )}
              </View>

              {/* Settings button — top right */}
              <TouchableOpacity
                style={[styles.cornerBtn, { top: topPad + 10, right: 12 }]}
                onPress={() => router.push("/settings")}
              >
                <Icon name="settings" size={16} color="#fff" />
              </TouchableOpacity>

              {/* Banner camera — bottom right of banner */}
              <TouchableOpacity
                style={[styles.cornerBtn, { bottom: 10, right: 12 }]}
                onPress={pickBanner}
                disabled={uploadingBanner}
              >
                {uploadingBanner
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Icon name="camera" size={15} color="#fff" />}
              </TouchableOpacity>

              {/* Avatar — bottom left overlapping banner */}
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={pickAvatar}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <View style={[styles.avatarRing, { borderColor: colors.card, backgroundColor: colors.muted }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  <>
                    <View style={[styles.avatarRing, { borderColor: colors.card }]}>
                      <UserAvatar
                        photoURL={profile?.photoURL}
                        displayName={profile?.displayName}
                        size={80}
                      />
                    </View>
                    <View style={[styles.editAvatarBadge, { backgroundColor: colors.primary }]}>
                      <Icon name="camera" size={10} color="#fff" />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* ── Info block ── */}
            <View style={[styles.infoBlock, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.foreground }]}>
                  {profile?.displayName || "Study User"}
                </Text>
                <TouchableOpacity
                  style={[styles.editBtn, { borderColor: colors.border }]}
                  onPress={() => router.push("/settings")}
                >
                  <Icon name="edit-2" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.editBtnText, { color: colors.mutedForeground }]}>Edit</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.email, { color: colors.mutedForeground }]}>{profile?.email || ""}</Text>
              {profile?.bio ? (
                <Text style={[styles.bio, { color: colors.foreground }]}>{profile.bio}</Text>
              ) : (
                <TouchableOpacity onPress={() => router.push("/settings")}>
                  <Text style={[styles.bio, { color: colors.mutedForeground }]}>
                    Tap Edit to add a bio...
                  </Text>
                </TouchableOpacity>
              )}

              {/* Subjects summary — read-only, tappable to edit */}
              {subjects.length > 0 && (
                <TouchableOpacity style={styles.tagsRow} onPress={() => router.push("/settings")}>
                  {subjects.slice(0, 4).map((s) => (
                    <View key={s} style={[styles.tag, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{s}</Text>
                    </View>
                  ))}
                  {subjects.length > 4 && (
                    <View style={[styles.tag, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                        +{subjects.length - 4}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Goal summary */}
              {goal ? (
                <TouchableOpacity onPress={() => router.push("/settings")}>
                  <View style={[styles.goalBadge, { backgroundColor: colors.accent + "22", borderColor: colors.accent }]}>
                    <Icon name="target" size={12} color={colors.accent} />
                    <Text style={[styles.goalText, { color: colors.accent }]}>{goal}</Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              {/* Followers / Following / Posts stats */}
              <View style={styles.statsRow}>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => user && router.push(`/followers/${user.uid}?tab=followers`)}
                >
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{followerCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Followers</Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => user && router.push(`/followers/${user.uid}?tab=following`)}
                >
                  <Text style={[styles.statNum, { color: colors.foreground }]}>
                    {(profile as any)?.following?.length ?? 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Following</Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{posts.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Posts</Text>
                </View>
              </View>
            </View>

            {/* ── XP / Streak ── */}
            <View style={{ paddingVertical: 12 }}>
              {profile && <XPStreakBadge xp={profile.xp} streak={profile.streak} />}
            </View>

            {/* ── 4-tab bar: Posts | Photos | Videos | Saved ── */}
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

            {loadingPosts && <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />}

            {/* ── Photo / Video grid ── */}
            {!loadingPosts && isGrid && (
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
                    // For Cloudinary videos, derive thumbnail by swapping extension
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
          !loadingPosts && !isGrid ? (
            <View style={styles.empty}>
              <Icon
                name={tab === "posts" ? "file-text" : "bookmark"}
                size={36}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {tab === "posts" ? "No posts yet" : "No saved posts"}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cornerBtn: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: { position: "absolute", bottom: -40, left: 16 },
  avatarRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, overflow: "hidden" },
  editAvatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBlock: {
    marginTop: 48,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  name: { fontSize: 20, fontWeight: "700" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 12 },
  email: { fontSize: 12, marginBottom: 8, opacity: 0.7 },
  bio: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12 },
  goalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 2,
  },
  goalText: { fontSize: 12, fontWeight: "500" },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 0 },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 17, fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 1 },
  statDivider: { width: 1, height: 28, marginHorizontal: 4 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, marginTop: 8, marginBottom: 0 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 3, borderBottomWidth: 2.5, borderBottomColor: "transparent" },
  tabLabel: { fontSize: 11 },
  empty: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14 },
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
