import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { Post, PostCard } from "@/components/PostCard";
import { CommentSheet } from "@/components/CommentSheet";

export default function PostDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(true);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "community_posts", id)).then((snap) => {
      if (snap.exists()) {
        setPost({
          id: snap.id,
          ...(snap.data() as Omit<Post, "id">),
          createdAt: snap.data()["createdAt"]?.toMillis?.() ?? Date.now(),
        });
      }
      setLoading(false);
    });
  }, [id]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Post</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : post ? (
        <>
          <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
            <PostCard post={post} />
          </ScrollView>
          <CommentSheet
            postId={post.id}
            visible={showComments}
            onClose={() => { setShowComments(false); router.back(); }}
          />
        </>
      ) : (
        <View style={styles.center}>
          <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Post not found</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: undefined, fontSize: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontFamily: undefined, fontSize: 16 },
});
