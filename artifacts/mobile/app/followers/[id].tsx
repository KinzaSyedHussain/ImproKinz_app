import { Icon } from "@/components/Icon";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface UserItem {
  uid: string;
  displayName: string;
  photoURL: string;
  bio?: string;
  followers?: string[];
  following?: string[];
}

export default function FollowersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { user, refreshProfile } = useAuth();

  const [tab, setTab] = useState<"followers" | "following">(
    initialTab === "following" ? "following" : "followers"
  );
  const [ownerProfile, setOwnerProfile] = useState<UserItem | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});
  const [loadingUids, setLoadingUids] = useState<Set<string>>(new Set());

  const targetId = Array.isArray(id) ? id[0] : id ?? "";
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const fetchUsers = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const ownerSnap = await getDoc(doc(db, "profiles", targetId));
      if (!ownerSnap.exists()) { setLoading(false); return; }
      const owner = { uid: ownerSnap.id, ...ownerSnap.data() } as UserItem;
      setOwnerProfile(owner);

      let list: UserItem[] = [];

      if (tab === "followers") {
        // Query all users who have targetId in their own following array
        const followerSnap = await getDocs(
          query(collection(db, "profiles"), where("following", "array-contains", targetId))
        );
        list = followerSnap.docs.map((s) => ({ uid: s.id, ...s.data() } as UserItem));
        // Update owner's follower count from query result
        setOwnerProfile((p) => p ? { ...p, followers: list.map((u) => u.uid) } : p);
      } else {
        // Following: read the owner's own following array, then fetch each user doc
        const uids: string[] = owner.following ?? [];
        if (uids.length > 0) {
          const snaps = await Promise.all(uids.map((uid) => getDoc(doc(db, "profiles", uid))));
          list = snaps.filter((s) => s.exists()).map((s) => ({ uid: s.id, ...s.data() } as UserItem));
        }
      }

      setUsers(list);

      // isFollowing for each item = check MY own following array
      if (user) {
        const mySnap = await getDoc(doc(db, "profiles", user.uid));
        const myFollowing: string[] = mySnap.exists() ? (mySnap.data()["following"] ?? []) : [];
        const state: Record<string, boolean> = {};
        list.forEach((u) => { state[u.uid] = myFollowing.includes(u.uid); });
        setFollowingState(state);
      }
    } catch (e) {
      console.warn("fetchUsers error:", e);
    } finally {
      setLoading(false);
    }
  }, [targetId, tab, user]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleFollow = async (item: UserItem) => {
    if (!user) return;
    const isFollowing = followingState[item.uid];

    const doUnfollow = async () => {
      setLoadingUids((prev) => new Set(prev).add(item.uid));
      try {
        // Only write to OWN document
        await updateDoc(doc(db, "profiles", user.uid), { following: arrayRemove(item.uid) });
        setFollowingState((prev) => ({ ...prev, [item.uid]: false }));
        refreshProfile().catch(() => {});
      } catch (e) { console.warn("unfollow error:", e); }
      finally { setLoadingUids((prev) => { const n = new Set(prev); n.delete(item.uid); return n; }); }
    };

    if (isFollowing) {
      Alert.alert(
        `Unfollow ${item.displayName}?`,
        "You will no longer see their posts in your feed.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Unfollow", style: "destructive", onPress: doUnfollow },
        ]
      );
    } else {
      setLoadingUids((prev) => new Set(prev).add(item.uid));
      try {
        // Only write to OWN document
        await updateDoc(doc(db, "profiles", user.uid), { following: arrayUnion(item.uid) });
        setFollowingState((prev) => ({ ...prev, [item.uid]: true }));
        refreshProfile().catch(() => {});
      } catch (e) { console.warn("follow error:", e); }
      finally { setLoadingUids((prev) => { const n = new Set(prev); n.delete(item.uid); return n; }); }
    }
  };

  const renderItem = ({ item }: { item: UserItem }) => {
    const isMe = item.uid === user?.uid;
    const isFollowing = followingState[item.uid] ?? false;
    const busy = loadingUids.has(item.uid);

    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={() => router.push(`/user/${item.uid}`)}
        activeOpacity={0.7}
      >
        <UserAvatar photoURL={item.photoURL} displayName={item.displayName} size={48} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.rowName, { color: colors.foreground }]}>{item.displayName}</Text>
          {item.bio ? (
            <Text style={[styles.rowBio, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.bio}
            </Text>
          ) : null}
          <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
            {item.followers?.length ?? 0} followers
          </Text>
        </View>
        {!isMe && user && (
          <TouchableOpacity
            onPress={() => handleFollow(item)}
            disabled={busy}
            style={[
              styles.followBtn,
              isFollowing
                ? { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border }
                : { backgroundColor: colors.primary },
            ]}
          >
            {busy
              ? <ActivityIndicator size="small" color={isFollowing ? colors.mutedForeground : "#fff"} />
              : <Text style={[styles.followBtnText, { color: isFollowing ? colors.mutedForeground : "#fff" }]}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {ownerProfile?.displayName || "User"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["followers", "following"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "followers"
                ? `Followers (${ownerProfile?.followers?.length ?? 0})`
                : `Following (${ownerProfile?.following?.length ?? 0})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="users" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {tab === "followers" ? "No followers yet" : "Not following anyone yet"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 14, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowName: { fontSize: 15, fontWeight: "600", marginBottom: 1 },
  rowBio: { fontSize: 12, marginBottom: 2 },
  rowMeta: { fontSize: 12 },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnText: { fontSize: 13, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
