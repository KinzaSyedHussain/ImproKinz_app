import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sidebar } from "@/components/Sidebar";
import { Post, PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";

const PAGE_SIZE = 10;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const loadPosts = useCallback(async (refresh = false) => {
    try {
      const q = query(
        collection(db, "community_posts"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const data: Post[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Post, "id">),
        createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
      }));
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setPosts(data);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    if (!hasMore || loadingMore || !lastDocRef.current) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "community_posts"),
        orderBy("createdAt", "desc"),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const more: Post[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Post, "id">),
        createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
      }));
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? lastDocRef.current;
      setPosts((prev) => [...prev, ...more]);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    lastDocRef.current = null;
    loadPosts(true);
  };

  const topPad =
    insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />

      <View
        style={[
          styles.header,
          {
            paddingTop: topPad,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.headerBtn}>
          <Feather name="menu" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.logoGradient}
        >
          <Text style={styles.logoText}>✦</Text>
        </LinearGradient>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>ImproKinz</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => router.push("/search")}
          style={styles.headerBtn}
        >
          <Feather name="search" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/create-post")}
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard post={item} onRefresh={handleRefresh} />
          )}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: botPad }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          scrollEnabled={!!posts.length}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="book-open" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No posts yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Be the first to share a study note!
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/create-post")}
              >
                <Text style={{ color: "#fff", fontFamily: undefined }}>
                  Create Post
                </Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ paddingVertical: 16 }}
              />
            ) : null
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
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerBtn: { padding: 4 },
  logoGradient: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#fff", fontFamily: undefined, fontSize: 16 },
  headerTitle: { fontFamily: undefined, fontSize: 18 },
  createBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: undefined, fontSize: 18 },
  emptyText: { fontFamily: undefined, fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
});
