import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { useTheme } from "@/context/ThemeContext";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { Post, PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { XPStreakBadge } from "@/components/XPStreakBadge";

const SUBJECT_OPTIONS = [
  "Math", "Science", "History", "English", "Physics",
  "Chemistry", "Biology", "Computer Science", "Economics", "Art",
];

async function pickAndUpload(
  options: ImagePicker.ImagePickerOptions,
  storagePath: string
): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]?.uri) return null;
  const resp = await fetch(result.assets[0].uri);
  const blob = await resp.blob();
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, user, refreshProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "saved">("posts");
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
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
        const sort = (arr: Post[]) =>
          arr.sort((a, b) => b.createdAt - a.createdAt);

        const [snap, savedSnap] = await Promise.all([
          getDocs(query(collection(db, "community_posts"), where("authorId", "==", user.uid))),
          getDocs(query(collection(db, "community_posts"), where("savedBy", "array-contains", user.uid))),
        ]);
        setPosts(sort(snap.docs.map(toPost)));
        setSavedPosts(sort(savedSnap.docs.map(toPost)));
      } catch (e) {
        console.warn("fetchPosts error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [user]);

  const pickAvatar = async () => {
    if (!user || uploadingAvatar) return;
    setUploadingAvatar(true);
    try {
      const url = await pickAndUpload(
        { mediaTypes: ["images"] as any, allowsEditing: true, aspect: [1, 1], quality: 0.8 },
        `avatars/${user.uid}`
      );
      if (url) {
        await updateDoc(doc(db, "users", user.uid), { photoURL: url });
        await refreshProfile();
      }
    } catch (e) {
      console.warn("Avatar upload failed:", e);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickBanner = async () => {
    if (!user || uploadingBanner) return;
    setUploadingBanner(true);
    try {
      const url = await pickAndUpload(
        { mediaTypes: ["images"] as any, allowsEditing: true, aspect: [16, 9], quality: 0.85 },
        `banners/${user.uid}`
      );
      if (url) {
        await updateDoc(doc(db, "users", user.uid), { bannerUrl: url });
        await refreshProfile();
      }
    } catch (e) {
      console.warn("Banner upload failed:", e);
    } finally {
      setUploadingBanner(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);
  const displayPosts = tab === "posts" ? posts : savedPosts;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={displayPosts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: botPad }}
        ListHeaderComponent={
          <View>
            {/* Banner */}
            <View style={[styles.bannerWrap, { paddingTop: topPad }]}>
              {profile?.bannerUrl ? (
                <Image source={{ uri: profile.bannerUrl }} style={styles.bannerImage} resizeMode="cover" />
              ) : (
                <LinearGradient
                  colors={[colors.purpleStart, colors.purpleEnd]}
                  style={styles.bannerImage}
                />
              )}
              {/* Banner edit button */}
              <TouchableOpacity style={styles.bannerEditBtn} onPress={pickBanner} disabled={uploadingBanner}>
                {uploadingBanner
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Feather name="camera" size={14} color="#fff" />}
              </TouchableOpacity>

              {/* Avatar overlapping the banner */}
              <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} disabled={uploadingAvatar}>
                {uploadingAvatar
                  ? (
                    <View style={[styles.avatarLoadingRing, { borderColor: colors.card, backgroundColor: colors.muted }]}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  )
                  : (
                    <>
                      <UserAvatar
                        photoURL={profile?.photoURL}
                        displayName={profile?.displayName}
                        size={84}
                        style={{ borderWidth: 3, borderColor: colors.card }}
                      />
                      <View style={[styles.editAvatarBadge, { backgroundColor: colors.primary }]}>
                        <Feather name="camera" size={11} color="#fff" />
                      </View>
                    </>
                  )}
              </TouchableOpacity>
            </View>

            {/* Name / bio / actions */}
            <View style={[styles.infoBlock, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {profile?.displayName || "Study User"}
              </Text>
              <Text style={[styles.email, { color: colors.mutedForeground }]}>
                {profile?.email || ""}
              </Text>
              {profile?.bio ? (
                <Text style={[styles.bio, { color: colors.mutedForeground }]}>{profile.bio}</Text>
              ) : null}

              <View style={styles.profileActions}>
                <TouchableOpacity
                  style={[styles.editProfileBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push("/user/edit" as any)}
                >
                  <Feather name="edit-2" size={13} color="#fff" />
                  <Text style={styles.editProfileText}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  onPress={toggleTheme}
                >
                  <Feather name={isDark ? "sun" : "moon"} size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* XP / streak */}
            <View style={{ paddingVertical: 12 }}>
              {profile && <XPStreakBadge xp={profile.xp} streak={profile.streak} />}
            </View>

            {/* Subjects */}
            {profile?.subjects && profile.subjects.length > 0 ? (
              <View style={styles.subjectsRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                  {profile.subjects.map((s) => (
                    <View key={s} style={[styles.subjectChip, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.subjectText, { color: colors.primary }]}>{s}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Tabs */}
            <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
              {(["posts", "saved"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tabBtn,
                    tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                  ]}
                  onPress={() => setTab(t)}
                >
                  <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
                    {t === "posts" ? "My Posts" : "Saved"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading && (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
            )}
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Feather
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
  bannerWrap: { position: "relative" },
  bannerImage: { width: "100%", height: 160 },
  bannerEditBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    position: "absolute",
    bottom: -42,
    left: 20,
  },
  avatarLoadingRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
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
    marginTop: 50,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  name: { fontSize: 20, fontWeight: "700", fontFamily: undefined, marginBottom: 2 },
  email: { fontSize: 13, fontFamily: undefined, marginBottom: 4 },
  bio: { fontSize: 14, lineHeight: 20, fontFamily: undefined, marginBottom: 8 },
  profileActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editProfileText: { color: "#fff", fontSize: 13, fontFamily: undefined },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectsRow: { marginBottom: 8 },
  subjectChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  subjectText: { fontFamily: undefined, fontSize: 13 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabLabel: { fontFamily: undefined, fontSize: 14 },
  empty: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { fontFamily: undefined, fontSize: 14 },
});
