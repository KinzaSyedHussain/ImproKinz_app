import { Feather } from "@expo/vector-icons";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "@/components/UserAvatar";

interface Notif {
  id: string;
  type: "like" | "comment" | "follow";
  fromId: string;
  fromName: string;
  fromPhoto: string;
  postId?: string;
  read: boolean;
  createdAt: number;
}

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  like: { icon: "heart", color: "#EF4444" },
  comment: { icon: "message-circle", color: "#4F46E5" },
  follow: { icon: "user-plus", color: "#10B981" },
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function getNotifText(n: Notif) {
  if (n.type === "like") return `${n.fromName} liked your post`;
  if (n.type === "comment") return `${n.fromName} commented on your post`;
  if (n.type === "follow") return `${n.fromName} started following you`;
  return "New notification";
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Simple where query — sort client-side to avoid composite index requirement
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Notif, "id">),
            createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
          }))
          .sort((a, b) => b.createdAt - a.createdAt);
        setNotifs(data);
        setLoading(false);
      },
      (err) => {
        console.warn("notifications error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  const markRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Activity</Text>
        <Feather name="bell" size={22} color={colors.foreground} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: botPad }}
          renderItem={({ item }) => {
            const typeInfo = TYPE_ICON[item.type] || TYPE_ICON.like;
            return (
              <TouchableOpacity
                style={[
                  styles.item,
                  {
                    backgroundColor: item.read ? colors.background : colors.secondary,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => markRead(item.id)}
              >
                <View style={styles.avatarWrap}>
                  <UserAvatar
                    photoURL={item.fromPhoto}
                    displayName={item.fromName}
                    size={44}
                  />
                  <View
                    style={[
                      styles.typeIcon,
                      { backgroundColor: typeInfo.color },
                    ]}
                  >
                    <Feather name={typeInfo.icon as any} size={10} color="#fff" />
                  </View>
                </View>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemText, { color: colors.foreground }]}>
                    {getNotifText(item)}
                  </Text>
                  <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
                {!item.read && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="bell-off" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No activity yet
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Interactions with your posts will appear here
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontFamily: undefined, fontSize: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  avatarWrap: { position: "relative" },
  typeIcon: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: { flex: 1 },
  itemText: { fontFamily: undefined, fontSize: 14, lineHeight: 20 },
  itemTime: { fontFamily: undefined, fontSize: 12, marginTop: 3 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: undefined, fontSize: 18 },
  emptySub: { fontFamily: undefined, fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
});
