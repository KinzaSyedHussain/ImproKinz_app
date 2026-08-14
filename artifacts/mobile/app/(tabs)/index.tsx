import { Icon } from "@/components/Icon";
import { Post, PostCard, normalizePost } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { CreditBalancePill } from "@/components/CreditUI";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Constants ───────────────────────────────────────────────────────────────

const TOOLS = [
  { icon: "timer",       label: "Focus",      route: "/(tabs)/focus",  color: "#7C3AED" },
  { icon: "layers",      label: "Flashcards", route: "/flashcards",    color: "#4F46E5" },
  { icon: "align-left",  label: "Summarizer", route: "/summarizer",    color: "#7C3AED" },
  { icon: "check-square",label: "Quiz",       route: "/quiz",          color: "#D97706" },
  { icon: "file-text",   label: "Notes",      route: "/notes",         color: "#0891B2" },
  { icon: "message-circle", label: "Chatbot", route: "/chatbot",       color: "#059669" },
  { icon: "calculator",  label: "Calculator", route: "/calculator",    color: "#DB2777" },
];

const PAGE_SIZE = 20;

// ─── Greeting ────────────────────────────────────────────────────────────────

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${time}, ${name.split(" ")[0]} 👋`;
}

// ─── Create Menu Sheet ───────────────────────────────────────────────────────

function CreateMenuSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible]);

  const go = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 120);
  };

  const ACTIONS = [
    { icon: "edit-3",   label: "New Post",        sub: "Share something with the community",       route: "/create-post" },
    { icon: "users-round", label: "New Group",     sub: "Create a study group for your subject",    route: "/create-group" },
    { icon: "briefcase",   label: "New Opportunity", sub: "Post a hackathon, job or internship",  route: "/create-opportunity" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.menuSheet,
            { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle */}
          <View style={[styles.sheetHandle, { backgroundColor: colors.muted }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Create</Text>

          {ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.route}
              style={[styles.sheetRow, { borderBottomColor: colors.border }]}
              onPress={() => go(a.route)}
              activeOpacity={0.75}
            >
              <View style={[styles.sheetIcon, { backgroundColor: colors.secondary }]}>
                <Icon name={a.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetRowTitle, { color: colors.foreground }]}>{a.label}</Text>
                <Text style={[styles.sheetRowSub, { color: colors.mutedForeground }]}>{a.sub}</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity onPress={onClose} style={[styles.sheetCancel, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.sheetCancelText, { color: colors.foreground }]}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Compact Tools Row ───────────────────────────────────────────────────────

function ToolsRow() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.toolsRowContent}
      style={styles.toolsRowScroll}
    >
      {TOOLS.map((t) => (
        <TouchableOpacity
          key={t.label}
          style={[styles.toolPill, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push(t.route as any)}
          activeOpacity={0.75}
        >
          <View style={[styles.toolPillIcon, { backgroundColor: t.color + "22" }]}>
            <Icon name={t.icon as any} size={16} color={t.color} />
          </View>
          <Text style={[styles.toolPillLabel, { color: colors.foreground }]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Feed Header (inside FlatList ListHeaderComponent) ───────────────────────

function FeedHeader({
  displayName,
  profile,
  streak,
  xp,
  onPressPlus,
}: {
  displayName: string;
  profile: any;
  streak: number;
  xp: number;
  onPressPlus: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <>
      {/* ── Hero gradient header ── */}
      <LinearGradient
        colors={[colors.purpleEnd, colors.purpleStart]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.heroRow}>
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile" as any)}>
            <UserAvatar photoURL={profile?.photoURL} displayName={displayName} size={44} />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Text style={styles.heroGreeting} numberOfLines={1}>
              {greeting(displayName)}
            </Text>
            <Text style={styles.heroSub}>Ready to study today?</Text>
          </View>
          {/* Credits pill */}
          <CreditBalancePill />
          {/* Create "+" button */}
          <TouchableOpacity
            onPress={onPressPlus}
            style={styles.plusBtn}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LinearGradient
              colors={[colors.purpleStart, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.plusGradient}
            >
              <Text style={styles.plusText}>+</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statVal}>{streak}</Text>
            <Text style={styles.statLbl}>streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statPill}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statVal}>{xp.toLocaleString()}</Text>
            <Text style={styles.statLbl}>XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statPill}>
            <Icon name="trophy" size={15} color="#F59E0B" />
            <Text style={styles.statVal}>{Math.floor(xp / 100)}</Text>
            <Text style={styles.statLbl}>treasures</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Compact tools row ── */}
      <ToolsRow />

      {/* ── Feed section label ── */}
      <View style={[styles.feedLabelRow, { borderBottomColor: colors.border }]}>
        <Icon name="rss" size={14} color={colors.primary} />
        <Text style={[styles.feedLabel, { color: colors.foreground }]}>Community Feed</Text>
      </View>
    </>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();

  const [posts, setPosts]             = useState<Post[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Start false so onEndReached cannot trigger loadMore before the first page has landed.
  const [hasMore, setHasMore]         = useState(false);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [attempt, setAttempt]         = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

  // Cursor is the document ID of the last post on the current page, returned by the API.
  const cursorRef = useRef<string | null>(null);

  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const displayName = profile?.displayName || user?.displayName || "Learner";
  const streak = (profile as any)?.streak ?? 0;
  const xp = profile?.xp ?? 0;

  const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";

  // ── API fetch — ordered by createdAt desc, document-ID cursor ───────────
  // `cursor` is the document ID of the last post on the previous page.
  // The server resolves it to a DocumentSnapshot for startAfter(), which handles
  // duplicate createdAt timestamps correctly without a composite index.
  // Throws a tagged error { stale: true } when the server returns 410 (cursor
  // document was deleted), so callers can reset and reload from page 1.
  const fetchPage = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`${API_BASE}/api/posts?${params}`);
    if (res.status === 410) {
      // Cursor document was deleted — callers must reset and reload page 1.
      throw Object.assign(new Error("stale_cursor"), { stale: true });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const raw: any[] = json.posts ?? [];
    const fetched: Post[] = raw
      .map((p) => { try { return normalizePost(p.id ?? "", p); } catch { return null; } })
      .filter((p): p is Post => p !== null);
    return { fetched, hasMore: !!json.hasMore, nextCursor: json.nextCursor as string | null };
  }, [API_BASE]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    cursorRef.current = null;

    fetchPage()
      .then(({ fetched, hasMore: more, nextCursor }) => {
        if (!cancelled) {
          setPosts(fetched);
          setHasMore(more);
          cursorRef.current = nextCursor ?? null;
          setLoading(false);
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          setLoadError(e?.message ?? "Couldn't load posts");
          setLoading(false);
        }
      });

    const timeout = setTimeout(() => {
      if (!cancelled) { setLoadError("Timed out loading feed"); setLoading(false); }
    }, 10000);

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [attempt]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setLoadError(null);
    cursorRef.current = null;
    try {
      const { fetched, hasMore: more, nextCursor } = await fetchPage();
      setPosts(fetched);
      setHasMore(more);
      cursorRef.current = nextCursor ?? null;
    } catch (e: any) {
      setLoadError(e?.message ?? "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    // Guard: do not paginate until the first page has fully landed,
    // and do not fire if there are no more pages or a load is in flight.
    if (!hasMore || loadingMore || loading) return;
    // No cursor means we are at the start — do not append a duplicate page 1.
    if (!cursorRef.current) { setHasMore(false); return; }
    setLoadingMore(true);
    try {
      const { fetched, hasMore: more, nextCursor } = await fetchPage(cursorRef.current);
      if (!fetched.length) { setHasMore(false); return; }
      cursorRef.current = nextCursor ?? null;
      setPosts((prev) => [...prev, ...fetched]);
      setHasMore(more);
    } catch (e: any) {
      if (e?.stale) {
        // Cursor document was deleted — reset and reload from page 1.
        cursorRef.current = null;
        setAttempt((a) => a + 1);
      }
      // Other network failures: silent — user can pull-to-refresh.
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────
  const renderPost = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} />,
    []
  );

  const ListEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyWrap}>
        {loadError ? (
          <>
            <Icon name="wifi-off" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Couldn't load feed
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {loadError}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => setAttempt((n) => n + 1)}
            >
              <Text style={styles.retryBtnText}>Try again</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Icon name="rss" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No posts yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Be the first to post something!
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => setMenuVisible(true)}
            >
              <Text style={styles.retryBtnText}>Create a Post</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const ListFooter = () => {
    if (loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    if (loadingMore) {
      return (
        <View style={styles.loadMoreWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (!hasMore && posts.length > 0) {
      return (
        <View style={styles.endWrap}>
          <Text style={[styles.endText, { color: colors.mutedForeground }]}>
            You've seen everything! ✨
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: botPad }}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListHeaderComponent={
          <FeedHeader
            displayName={displayName}
            profile={profile}
            streak={streak}
            xp={xp}
            onPressPlus={() => setMenuVisible(true)}
          />
        }
        ListEmptyComponent={<ListEmpty />}
        ListFooterComponent={<ListFooter />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={10}
      />

      {/* Create menu bottom sheet */}
      <CreateMenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Hero header
  hero: { paddingHorizontal: 18, paddingBottom: 20 },
  heroRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 0 },
  heroGreeting: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },
  heroSub: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },

  // Create "+" button in header
  plusBtn: { marginLeft: 10 },
  plusGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  plusText: { color: "#fff", fontSize: 22, lineHeight: 26, fontWeight: "300", marginTop: -1 },

  // Stats row
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  statPill: { flex: 1, alignItems: "center", gap: 2 },
  statEmoji: { fontSize: 14 },
  statVal: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  statLbl: { color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", fontSize: 10 },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.2)" },

  // Compact tools row
  toolsRowScroll: { flexGrow: 0 },
  toolsRowContent: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  toolPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  toolPillIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  toolPillLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },

  // Feed section label
  feedLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  feedLabel: { fontFamily: "Inter_700Bold", fontSize: 15 },

  // Empty / footer states
  emptyWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  retryBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  loadingWrap: { paddingVertical: 40, alignItems: "center" },
  loadMoreWrap: { paddingVertical: 16, alignItems: "center" },
  endWrap: { paddingVertical: 20, alignItems: "center" },
  endText: { fontFamily: "Inter_400Regular", fontSize: 13 },

  // Create menu sheet
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 16, paddingHorizontal: 4 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sheetRowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  sheetRowSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  sheetCancel: {
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  sheetCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
