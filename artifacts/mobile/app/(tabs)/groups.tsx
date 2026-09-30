import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { db } from "@/lib/firebase";
import {
  arrayRemove,
  arrayUnion,
  doc,
  increment,
  updateDoc,
} from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── API base ──────────────────────────────────────────────────────────────────
// FIX: the old code hardcoded `https://` for the fallback AND for the
// EXPO_PUBLIC_DOMAIN branch. That's wrong for local dev:
//   - "localhost" on a phone/simulator refers to the device itself, not your
//     dev machine, so http://localhost:8080 will always ERR_CONNECTION_REFUSED
//     there even if your backend is running fine on your laptop.
//   - Local dev servers are almost never serving HTTPS, so forcing https://
//     on EXPO_PUBLIC_DOMAIN breaks that path too if it's just an IP:port.
//
// Set EXPO_PUBLIC_DOMAIN in your .env, e.g.:
//   EXPO_PUBLIC_DOMAIN=192.168.1.23:8080      (LAN IP, for physical devices)
//   EXPO_PUBLIC_DOMAIN=localhost:8080          (simulator only, same machine)
//   EXPO_PUBLIC_DOMAIN=your-api.example.com    (production, gets https://)
//
// Restart with `npx expo start -c` after changing env vars — Expo only reads
// EXPO_PUBLIC_* at bundle time, not at runtime.

function resolveApiBase(): string {
  // Use an explicitly configured API URL if available.
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  // Support EXPO_PUBLIC_DOMAIN if your project uses it.
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();

  if (domain) {
    if (/^https?:\/\//i.test(domain)) {
      return domain.replace(/\/+$/, "");
    }

    const isLocal =
      domain.startsWith("localhost") ||
      domain.startsWith("127.0.0.1") ||
      /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(domain);

    return `${isLocal ? "http" : "https"}://${domain}`.replace(/\/+$/, "");
  }

  // Local development backend.
  return "http://localhost:3001";
}

const API_BASE = resolveApiBase();

if (__DEV__) {
  console.log("[GroupsScreen] API_BASE:", API_BASE);
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  iconColor: string;
  tags: string[];
  createdBy: string;
  createdAt: any;
  memberCount: number;
  postCount: number;
  members: string[];
  moderators: string[];
  bannedUsers: string[];
  pinnedPostIds: string[];
  isPublic: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMembers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k members`;
  return `${n} member${n !== 1 ? "s" : ""}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ── GroupCard ─────────────────────────────────────────────────────────────────
function GroupCard({
  group,
  colors,
  joined,
  onToggleJoin,
  onPress,
  joining,
}: {
  group: StudyGroup;
  colors: any;
  joined: boolean;
  onToggleJoin: () => void;
  onPress: () => void;
  joining: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.groupCardRow}>
        <View style={[styles.groupIcon, { backgroundColor: group.iconColor + "33" }]}>
          <Text style={[styles.groupInitials, { color: group.iconColor }]}>
            {getInitials(group.name)}
          </Text>
        </View>

        <View style={styles.groupInfo}>
          <Text style={[styles.groupName, { color: colors.foreground }]}>{group.name}</Text>
          <Text style={[styles.groupDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {group.description}
          </Text>
          <View style={styles.groupMeta}>
            <Icon name="users" size={11} color={colors.mutedForeground} />
            <Text style={[styles.groupMetaText, { color: colors.mutedForeground }]}>
              {formatMembers(group.memberCount || 0)}
            </Text>
            {group.tags?.length > 0 && (
              <>
                <Text style={[styles.groupMetaDot, { color: colors.mutedForeground }]}>·</Text>
                <Text style={[styles.groupMetaText, { color: colors.mutedForeground }]}>
                  {group.tags.slice(0, 2).join(", ")}
                </Text>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={onToggleJoin}
          disabled={joining}
          style={[
            styles.joinBtn,
            joined
              ? { backgroundColor: "transparent", borderColor: colors.border, borderWidth: 1 }
              : { backgroundColor: colors.accent },
          ]}
        >
          {joining ? (
            <ActivityIndicator size="small" color={joined ? colors.mutedForeground : "#fff"} />
          ) : (
            <Text style={[styles.joinBtnText, { color: joined ? colors.mutedForeground : "#fff" }]}>
              {joined ? "Joined" : "Join"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function GroupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId, getToken } = useClerkAuth();

  const [publicGroups, setPublicGroups] = useState<StudyGroup[]>([]);
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [joining, setJoining] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const currentUid = userId ?? "";

  // ── Bulletproof fetch with timeout to prevent infinite hanging ─────────────
  const fetchGroups = useCallback(async () => {
    // Helper to abort fetch if it takes longer than 8 seconds
    const fetchWithTimeout = (url: string, options?: RequestInit, timeout = 8000) => {
      return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Network timeout")), timeout))
      ]);
    };

    try {
      const publicRes = await fetchWithTimeout(`${API_BASE}/api/groups/public`) as Response;
      const publicData = publicRes.ok ? await publicRes.json() : { groups: [] };

      let mineData: { groups: StudyGroup[] } = { groups: [] };
      if (currentUid) {
        try {
          const token = await getToken();
          if (token) {
            const mineRes = await fetchWithTimeout(`${API_BASE}/api/groups/mine`, {
              headers: { Authorization: `Bearer ${token}` },
            }) as Response;
            if (mineRes.ok) mineData = await mineRes.json();
          }
        } catch (tokenError) {
          console.warn("Token fetch failed, continuing with public groups only:", tokenError);
        }
      }

      setPublicGroups(publicData.groups ?? []);
      setMyGroups(mineData.groups ?? []);
      setLoadError(null);
    } catch (e: any) {
      console.warn("fetchGroups error (falling back to empty state):", e);
      setPublicGroups([]);
      setMyGroups([]);
      // Surface a hint in dev so this doesn't look like a silent empty state.
      setLoadError(
        __DEV__
          ? `Couldn't reach ${API_BASE}. Is the backend running and is EXPO_PUBLIC_DOMAIN set correctly?`
          : "Couldn't load groups. Check your connection and try again."
      );
    }
  }, [currentUid, getToken]);

  useEffect(() => {
    setLoading(true);
    let isMounted = true;
    fetchGroups().finally(() => {
      if (isMounted) setLoading(false); // ✅ GUARANTEED to turn off loading
    });
    return () => { isMounted = false; };
  }, [fetchGroups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  };

  // ── Optimistic join/leave ──────────────────────────────────────────────────
  const toggleJoin = async (group: StudyGroup) => {
    if (!currentUid || joining[group.id]) return;
    const joined = group.members?.includes(currentUid) || myGroups.some((g) => g.id === group.id);

    setJoining((prev) => ({ ...prev, [group.id]: true }));
    try {
      const ref = doc(db, "groups", group.id);
      if (joined) {
        await updateDoc(ref, {
          members: arrayRemove(currentUid),
          memberCount: increment(-1),
        });
        setMyGroups((prev) => prev.filter((g) => g.id !== group.id));
        setPublicGroups((prev) =>
          prev.map((g) =>
            g.id === group.id
              ? {
                  ...g,
                  members: (g.members || []).filter((m) => m !== currentUid),
                  memberCount: Math.max(0, g.memberCount - 1),
                }
              : g
          )
        );
      } else {
        await updateDoc(ref, {
          members: arrayUnion(currentUid),
          memberCount: increment(1),
        });
        const updatedGroup = {
          ...group,
          members: [...(group.members || []), currentUid],
          memberCount: group.memberCount + 1,
        };
        setMyGroups((prev) => {
          if (prev.some((g) => g.id === group.id)) return prev;
          return [updatedGroup, ...prev];
        });
        setPublicGroups((prev) =>
          prev.map((g) => (g.id === group.id ? updatedGroup : g))
        );
      }
    } catch (e) {
      console.warn("toggleJoin error:", e);
    } finally {
      setJoining((prev) => ({ ...prev, [group.id]: false }));
    }
  };

  // ── Computed lists ─────────────────────────────────────────────────────────
  const memberIds = new Set([
    ...myGroups.map((g) => g.id),
    ...publicGroups.filter((g) => g.members?.includes(currentUid)).map((g) => g.id),
  ]);

  const filtered = publicGroups.filter(
    (g) =>
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.purpleStart, colors.background]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Study Groups</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Your communities, your subjects
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/create-group")}
          >
            <Icon name="plus" size={16} color={colors.primaryForeground} />
            <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>Create</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Icon name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search groups…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Icon name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {__DEV__ && loadError && (
        <View style={styles.devErrorBanner}>
          <Icon name="alert-triangle" size={14} color="#fff" />
          <Text style={styles.devErrorText}>{loadError}</Text>
        </View>
      )}

      <FlatList
        data={search ? filtered : publicGroups}
        keyExtractor={(g) => g.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={{
          paddingBottom: 100 + insets.bottom,
          paddingHorizontal: 16,
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            {!search && myGroups.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Groups</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.joinedRow}
                >
                  {myGroups.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.joinedChip, { backgroundColor: colors.card, borderColor: g.iconColor + "88" }]}
                      onPress={() => router.push(`/group/${g.id}` as any)}
                    >
                      <View style={[styles.chipDot, { backgroundColor: g.iconColor }]} />
                      <Text style={[styles.joinedLabel, { color: colors.foreground }]}>{g.name}</Text>
                      {!g.isPublic && <Icon name="lock" size={10} color={colors.mutedForeground} />}
                      <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>
              {search ? `Results for "${search}"` : "Explore Communities"}
            </Text>
          </>
        )}
        renderItem={({ item: group }) => (
          <GroupCard
            group={group}
            colors={colors}
            joined={memberIds.has(group.id)}
            onToggleJoin={() => toggleJoin(group)}
            onPress={() => router.push(`/group/${group.id}` as any)}
            joining={joining[group.id] ?? false}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Icon name="users-round" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {search ? "No groups found" : "No groups yet"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "Try a different search term" : "Create the first study group!"}
            </Text>
            {!search && (
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/create-group")}
              >
                <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>
                  Create a Group
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  createBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, padding: 0 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  joinedRow: { gap: 10, paddingBottom: 4, paddingTop: 8 },
  joinedChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5 },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  joinedLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  activeDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 2 },
  groupCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  groupCardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  groupIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  groupInitials: { fontFamily: "Inter_700Bold", fontSize: 18 },
  groupInfo: { flex: 1, gap: 3 },
  groupName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  groupDesc: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  groupMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  groupMetaText: { fontFamily: "Inter_400Regular", fontSize: 11 },
  groupMetaDot: { fontFamily: "Inter_400Regular", fontSize: 11 },
  joinBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, flexShrink: 0, minWidth: 64, alignItems: "center", justifyContent: "center" },
  joinBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  empty: { alignItems: "center", gap: 12, paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  emptyBtn: { marginTop: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  devErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#dc2626",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  devErrorText: { color: "#fff", fontSize: 12, flex: 1 },
});