import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
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

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, user, refreshProfile } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "saved">("posts");
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchPosts = async () => {
      const q = query(
        collection(db, "posts"),
        where("authorId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const data: Post[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Post, "id">),
        createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
      }));
      setPosts(data);

      const savedQ = query(
        collection(db, "posts"),
        where("savedBy", "array-contains", user.uid),
        orderBy("createdAt", "desc")
      );
      const savedSnap = await getDocs(savedQ);
      const savedData: Post[] = savedSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Post, "id">),
        createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
      }));
      setSavedPosts(savedData);
      setLoading(false);
    };
    fetchPosts();
  }, [user]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !user) return;
    const asset = result.assets[0];
    if (!asset?.uri) return;
    try {
      const resp = await fetch(asset.uri);
      const blob = await resp.blob();
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
      await refreshProfile();
    } catch {}
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
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={[styles.headerBg, { paddingTop: topPad + 16 }]}
            >
              <TouchableOpacity style={styles.avatarWrap} onPress={pickImage}>
                <UserAvatar
                  photoURL={profile?.photoURL}
                  displayName={profile?.displayName}
                  size={80}
                />
                <View style={[styles.editAvatar, { backgroundColor: colors.card }]}>
                  <Feather name="camera" size={12} color={colors.primary} />
                </View>
              </TouchableOpacity>
              <Text style={styles.name}>{profile?.displayName || "Study User"}</Text>
              <Text style={styles.email}>{profile?.email || ""}</Text>
              {profile?.bio ? (
                <Text style={styles.bio}>{profile.bio}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => router.push("/user/edit" as any)}
              >
                <Feather name="edit-2" size={14} color="#fff" />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </LinearGradient>

            <View style={{ paddingVertical: 16 }}>
              {profile && (
                <XPStreakBadge xp={profile.xp} streak={profile.streak} />
              )}
            </View>

            {profile?.subjects && profile.subjects.length > 0 ? (
              <View style={styles.subjectsRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                  {profile.subjects.map((s) => (
                    <View key={s} style={[styles.subjectChip, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.subjectText, { color: colors.primary }]}>
                        {s}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

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
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: tab === t ? colors.primary : colors.mutedForeground },
                    ]}
                  >
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
  headerBg: { alignItems: "center", paddingBottom: 24, paddingHorizontal: 24, gap: 6 },
  avatarWrap: { position: "relative", marginBottom: 6 },
  editAvatar: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  name: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 22 },
  email: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 13 },
  bio: { color: "rgba(255,255,255,0.85)", fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  editProfileText: { color: "#FFFFFF", fontFamily: "Inter_500Medium", fontSize: 13 },
  subjectsRow: { marginBottom: 8 },
  subjectChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  subjectText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  empty: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
});
