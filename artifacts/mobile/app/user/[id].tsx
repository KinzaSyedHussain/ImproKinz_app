import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
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
import { UserProfile } from "@/context/AuthContext";
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [userSnap, postsSnap] = await Promise.all([
        getDoc(doc(db, "users", id)),
        getDocs(query(collection(db, "community_posts"), where("authorId", "==", id), orderBy("createdAt", "desc"))),
      ]);
      if (userSnap.exists()) setProfile(userSnap.data() as UserProfile);
      setPosts(postsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Post, "id">),
        createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
      })));
      setLoading(false);
    };
    fetchData();
  }, [id]);

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
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={[styles.header, { paddingTop: topPad + 8 }]}
            >
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <UserAvatar
                photoURL={profile?.photoURL}
                displayName={profile?.displayName}
                size={72}
              />
              <Text style={styles.name}>{profile?.displayName || "User"}</Text>
              {profile?.bio ? (
                <Text style={styles.bio}>{profile.bio}</Text>
              ) : null}
            </LinearGradient>

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
            <Feather name="file-text" size={36} color={colors.mutedForeground} />
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
  header: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24, gap: 8 },
  backBtn: { alignSelf: "flex-start", marginBottom: 12 },
  name: { color: "#FFFFFF", fontFamily: undefined, fontSize: 22 },
  bio: { color: "rgba(255,255,255,0.85)", fontFamily: undefined, fontSize: 14, textAlign: "center" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText: { fontFamily: undefined, fontSize: 13 },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, marginBottom: 4 },
  sectionTitle: { fontFamily: undefined, fontSize: 16 },
  empty: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { fontFamily: undefined, fontSize: 14 },
});
