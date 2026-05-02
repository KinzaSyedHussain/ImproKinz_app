import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { Post, PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";

interface UserResult {
  uid: string;
  displayName: string;
  photoURL: string;
  xp: number;
  subjects: string[];
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [tab, setTab] = useState<"posts" | "users">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchText.trim()) { setPosts([]); setUsers([]); return; }
    debounceRef.current = setTimeout(() => doSearch(searchText.trim()), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchText, tab]);

  const doSearch = async (q: string) => {
    setLoading(true);
    try {
      if (tab === "posts") {
        const snap = await getDocs(query(
          collection(db, "posts"),
          orderBy("createdAt", "desc"),
          limit(20)
        ));
        const lower = q.toLowerCase();
        const data: Post[] = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Post, "id">),
            createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
          }))
          .filter((p) =>
            p.content.toLowerCase().includes(lower) ||
            (p.subject ?? "").toLowerCase().includes(lower)
          );
        setPosts(data);
      } else {
        const snap = await getDocs(query(collection(db, "users"), limit(30)));
        const lower = q.toLowerCase();
        const data: UserResult[] = snap.docs
          .map((d) => ({ uid: d.id, ...(d.data() as Omit<UserResult, "uid">) }))
          .filter((u) =>
            u.displayName?.toLowerCase().includes(lower) ||
            u.subjects?.some((s) => s.toLowerCase().includes(lower))
          );
        setUsers(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.searchWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search posts, subjects, users..."
            placeholderTextColor={colors.mutedForeground}
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {(["posts", "users"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "posts" ? "Posts" : "Users"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : tab === "posts" ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} />}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: botPad }}
          ListEmptyComponent={
            searchText ? (
              <View style={styles.empty}>
                <Feather name="search" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No posts found</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Feather name="search" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Search for posts and topics</Text>
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={{ padding: 16, paddingBottom: botPad, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/user/${item.uid}` as any)}
            >
              <UserAvatar photoURL={item.photoURL} displayName={item.displayName} size={48} />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.foreground }]}>{item.displayName}</Text>
                <Text style={[styles.userXP, { color: colors.mutedForeground }]}>★ {item.xp?.toLocaleString() ?? 0} XP</Text>
                {item.subjects?.length > 0 ? (
                  <Text style={[styles.userSubjects, { color: colors.primary }]}>
                    {item.subjects.slice(0, 3).join(" · ")}
                  </Text>
                ) : null}
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {searchText ? "No users found" : "Search for students"}
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
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  userCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  userInfo: { flex: 1, gap: 3 },
  userName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  userXP: { fontFamily: "Inter_400Regular", fontSize: 13 },
  userSubjects: { fontFamily: "Inter_500Medium", fontSize: 12 },
});
