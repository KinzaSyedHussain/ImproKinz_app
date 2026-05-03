import { Icon } from "@/components/Icon";
import { SkeletonCard } from "@/components/SkeletonCard";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
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

const POOL_SIZE = 60;
const PAGE_SIZE = 12;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  // Shuffled pool — remaining posts not yet shown
  const poolRef = useRef<Post[]>([]);

  const loadPosts = useCallback(async (_refresh = false) => {
    try {
      const q = query(
        collection(db, "community_posts"),
        orderBy("createdAt", "desc"),
        limit(POOL_SIZE)
      );
      const snap = await getDocs(q);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      const all: Post[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Post, "id">),
        createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
      }));
      const shuffled = shuffle(all);
      const firstPage = shuffled.slice(0, PAGE_SIZE);
      poolRef.current = shuffled.slice(PAGE_SIZE);
      setPosts(firstPage);
      setHasMore(shuffled.length > PAGE_SIZE || snap.docs.length === POOL_SIZE);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      // First drain the in-memory shuffled pool
      if (poolRef.current.length > 0) {
        const next = poolRef.current.slice(0, PAGE_SIZE);
        poolRef.current = poolRef.current.slice(PAGE_SIZE);
        setPosts((prev) => [...prev, ...next]);
        setHasMore(poolRef.current.length > 0 || !!lastDocRef.current);
        return;
      }
      // Pool exhausted — fetch next batch from Firestore and shuffle
      if (!lastDocRef.current) { setHasMore(false); return; }
      const q = query(
        collection(db, "community_posts"),
        orderBy("createdAt", "desc"),
        startAfter(lastDocRef.current),
        limit(POOL_SIZE)
      );
      const snap = await getDocs(q);
      if (!snap.docs.length) { setHasMore(false); return; }
      lastDocRef.current = snap.docs[snap.docs.length - 1];
      const more: Post[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Post, "id">),
        createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
      }));
      const shuffled = shuffle(more);
      const next = shuffled.slice(0, PAGE_SIZE);
      poolRef.current = shuffled.slice(PAGE_SIZE);
      setPosts((prev) => [...prev, ...next]);
      setHasMore(shuffled.length > PAGE_SIZE || snap.docs.length === POOL_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  // Reload feed every time this tab comes into focus (e.g. after creating a post)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setHasMore(true);
      lastDocRef.current = null;
      loadPosts();
    }, [loadPosts])
  );

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
          <Icon name="menu" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.logoBrand}>
          <Image
            source={require("../../assets/images/logo_nobg.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>ImproKinz</Text>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => router.push("/search")}
          style={styles.headerBtn}
        >
          <Icon name="search" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/create-post")}
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
        >
          <Icon name="plus" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingTop: 8 }}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onRefresh={handleRefresh}
              onDelete={(deletedId) => setPosts((prev) => prev.filter((p) => p.id !== deletedId))}
            />
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
              <Icon name="book-open" size={48} color={colors.mutedForeground} />
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

      {/* Sidebar last → renders on top of all content on web */}
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
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
  logoBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  logoImg: {
    width: 56,
    height: 56,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 19 },
  createBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
});
