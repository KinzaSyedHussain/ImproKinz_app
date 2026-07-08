import { Icon } from "@/components/Icon";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useRouter } from "expo-router";
import {
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
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
import { Post, PostCard, normalizePost } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const poolRef = useRef<Post[]>([]);

  // Simple feed load: getDocs directly in useEffect
  const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/posts`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const raw: any[] = json.posts || [];
        const all: Post[] = raw.map((p) => {
          try { return normalizePost(p.id || "", p); } catch { return null; }
        }).filter((p): p is Post => p !== null);
        all.sort((a, b) => b.createdAt - a.createdAt);
        const shuffled = shuffle(all);
        const firstPage = shuffled.slice(0, PAGE_SIZE);
        poolRef.current = shuffled.slice(PAGE_SIZE);
        if (!cancelled) {
          setPosts(firstPage);
          setHasMore(shuffled.length > PAGE_SIZE || raw.length === POOL_SIZE);
          setLoadError(null);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e?.message || "Failed to load feed");
          setLoading(false);
        }
      }
    }

    load();

    const timer = setTimeout(() => {
      if (!cancelled) {
        setLoadError("Feed load timed out.");
        setLoading(false);
      }
    }, 8000);

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      if (poolRef.current.length > 0) {
        const next = poolRef.current.slice(0, PAGE_SIZE);
        poolRef.current = poolRef.current.slice(PAGE_SIZE);
        setPosts((prev) => [...prev, ...next]);
        setHasMore(poolRef.current.length > 0 || !!lastDocRef.current);
        return;
      }
      if (!lastDocRef.current) { setHasMore(false); return; }
      const q = query(
        collection(db, "community_posts"),
        startAfter(lastDocRef.current),
        limit(POOL_SIZE)
      );
      const snap = await getDocs(q);
      if (!snap.docs.length) { setHasMore(false); return; }
      lastDocRef.current = snap.docs[snap.docs.length - 1];
      const more: Post[] = snap.docs.map((d) => normalizePost(d.id, d.data()));
      const shuffled = shuffle(more);
      const next = shuffled.slice(0, PAGE_SIZE);
      poolRef.current = shuffled.slice(PAGE_SIZE);
      setPosts((prev) => [...prev, ...next]);
      setHasMore(shuffled.length > PAGE_SIZE || snap.docs.length === POOL_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // onSnapshot listener auto-refreshes; just briefly show spinner
    setTimeout(() => setRefreshing(false), 800);
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
          {loadError ? (
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
              <Icon name="alert-circle" size={36} color="#EF4444" />
              <Text style={{ color: colors.foreground, fontSize: 14, textAlign: "center" }}>
                {loadError}
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => { setLoading(true); loadPosts(); }}
              >
                <Text style={{ color: "#fff" }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            [1, 2, 3].map((i) => <SkeletonCard key={i} />)
          )}
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
