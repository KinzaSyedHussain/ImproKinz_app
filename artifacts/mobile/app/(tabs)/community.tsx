import { Icon } from "@/components/Icon";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  limit,
  query,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Post, PostCard, normalizePost } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { AdBanner } from "@/components/AdBanner";

const POOL_SIZE = 60;
const PAGE_SIZE = 12;

const COMMUNITIES = [
  { id: "all", label: "All", icon: "globe" },
  { id: "Math", label: "Math", icon: "calculator" },
  { id: "Science", label: "Science", icon: "flask-conical" },
  { id: "Biology", label: "Biology", icon: "leaf" },
  { id: "Physics", label: "Physics", icon: "atom" },
  { id: "History", label: "History", icon: "book-open" },
  { id: "CS", label: "CS", icon: "code-2" },
  { id: "English", label: "English", icon: "type" },
  { id: "Languages", label: "Languages", icon: "languages" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedAttempt, setFeedAttempt] = useState(0);
  const [community, setCommunity] = useState("all");

  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const poolRef = useRef<Post[]>([]);

  const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`${API_BASE}/api/posts`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const raw: any[] = json.posts || [];
        const all: Post[] = raw
          .map((p) => { try { return normalizePost(p.id || "", p); } catch { return null; } })
          .filter((p): p is Post => p !== null);
        all.sort((a, b) => b.createdAt - a.createdAt);

        const filtered = community === "all"
          ? all
          : all.filter((p) => p.subject === community || p.tags?.includes(community));

        const firstPage = filtered.slice(0, PAGE_SIZE);
        poolRef.current = filtered.slice(PAGE_SIZE);
        if (!cancelled) {
          setPosts(firstPage);
          setHasMore(filtered.length > PAGE_SIZE);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e?.message || "Failed to load community");
          setLoading(false);
        }
      }
    }
    load();
    const t = setTimeout(() => { if (!cancelled) { setLoadError("Timed out."); setLoading(false); } }, 8000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [feedAttempt, community]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      if (poolRef.current.length > 0) {
        const next = poolRef.current.slice(0, PAGE_SIZE);
        poolRef.current = poolRef.current.slice(PAGE_SIZE);
        setPosts((prev) => [...prev, ...next]);
        setHasMore(poolRef.current.length > 0);
        return;
      }
      if (community !== "all" || !lastDocRef.current) { setHasMore(false); return; }
      const q = query(collection(db, "community_posts"), startAfter(lastDocRef.current), limit(POOL_SIZE));
      const snap = await getDocs(q);
      if (!snap.docs.length) { setHasMore(false); return; }
      lastDocRef.current = snap.docs[snap.docs.length - 1];
      const more = shuffle(snap.docs.map((d) => normalizePost(d.id, d.data())));
      setPosts((prev) => [...prev, ...more.slice(0, PAGE_SIZE)]);
      poolRef.current = more.slice(PAGE_SIZE);
      setHasMore(more.length > PAGE_SIZE);
    } finally { setLoadingMore(false); }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setFeedAttempt((n) => n + 1);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 6, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Community</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => router.push("/search")} style={styles.headerBtn}>
            <Icon name="search" size={21} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/create-post")} style={[styles.composeBtn, { backgroundColor: colors.primary }]}>
            <Icon name="plus" size={17} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Community filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.communityRow}>
          {COMMUNITIES.map((c) => {
            const active = community === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => { setCommunity(c.id); setFeedAttempt((n) => n + 1); }}
                style={[
                  styles.communityChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.communityChipText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ paddingTop: 8 }}>
          {loadError ? (
            <View style={styles.errorWrap}>
              <Icon name="alert-circle" size={36} color="#EF4444" />
              <Text style={[styles.errorText, { color: colors.foreground }]}>{loadError}</Text>
              <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => setFeedAttempt((n) => n + 1)}>
                <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Retry</Text>
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
              onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
            />
          )}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: botPad }}
          ListHeaderComponent={
            <View>
              <TouchableOpacity
                style={[styles.composer, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push("/create-post")}
                activeOpacity={0.7}
              >
                <View style={styles.composerRow}>
                  <UserAvatar photoURL={profile?.photoURL} displayName={profile?.displayName} size={36} />
                  <Text style={[styles.composerPrompt, { color: colors.mutedForeground }]}>
                    Share a study tip, progress, or question…
                  </Text>
                </View>
                <View style={styles.composerFooter}>
                  <View style={styles.composerIcons}>
                    <Icon name="image" size={17} color={colors.mutedForeground} />
                    <Icon name="file-text" size={17} color={colors.mutedForeground} />
                    <Icon name="bar-chart-2" size={17} color={colors.mutedForeground} />
                  </View>
                  <View style={[styles.postBtn, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.postBtnText, { color: colors.primaryForeground }]}>Post</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <AdBanner />
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="users" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No posts yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Be first to share in this community!</Text>
              <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/create-post")}>
                <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Create Post</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 16 }} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  headerBtn: { padding: 4 },
  composeBtn: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  communityRow: { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  communityChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  communityChipText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  composer: { marginHorizontal: 12, marginBottom: 8, padding: 13, borderRadius: 16, borderWidth: 1 },
  composerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  composerPrompt: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13 },
  composerFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 11 },
  composerIcons: { flexDirection: "row", gap: 14 },
  postBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  postBtnText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  errorWrap: { alignItems: "center", paddingVertical: 40, gap: 12 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
});
