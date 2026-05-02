import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  arrayUnion,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Post, PostCard, PostComment } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function PostDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile, addXP } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  // Live-update the post document (comments are stored inside as commentsList)
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(
      doc(db, "community_posts", id),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPost({
            id: snap.id,
            ...(data as Omit<Post, "id">),
            createdAt: data["createdAt"]?.toMillis?.() ?? Date.now(),
            commentsList: (data["commentsList"] ?? []).map((c: any) => ({
              ...c,
              createdAt: typeof c.createdAt === "number" ? c.createdAt : Date.now(),
            })),
          });
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Post snapshot error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [id]);

  const handleSubmit = async () => {
    if (!user || !profile || !text.trim() || !id) return;
    setSubmitting(true);
    setError("");
    const newComment: PostComment = {
      id: `${user.uid}_${Date.now()}`,
      authorId: user.uid,
      authorName: profile.displayName || "Learner",
      authorPhoto: profile.photoURL || "",
      text: text.trim(),
      createdAt: Date.now(),
    };
    try {
      // Store comment inside the post document — uses existing allow update rule
      await updateDoc(doc(db, "community_posts", id), {
        commentsList: arrayUnion(newComment),
        commentCount: (post?.commentsList?.length ?? 0) + 1,
      });
      addXP(5).catch(() => {});
      setText("");
    } catch (e: any) {
      console.warn("Comment error:", e);
      setError(
        e?.code === "permission-denied"
          ? "Permission denied — check your Firestore rules."
          : e?.message || "Failed to post comment."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Post</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>Post not found</Text>
        </View>
      </View>
    );
  }

  // Sort comments newest-last
  const comments = [...(post.commentsList ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Top bar */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Post</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Post + comments list */}
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <PostCard post={post} />

            {/* Error banner */}
            {!!error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={15} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Comments heading */}
            <View style={[styles.commentsHeader, { borderBottomColor: colors.border }]}>
              <Feather name="message-circle" size={16} color={colors.primary} />
              <Text style={[styles.commentsTitle, { color: colors.foreground }]}>
                Comments ({comments.length})
              </Text>
            </View>

            {comments.length === 0 && (
              <Text style={[styles.emptyComments, { color: colors.mutedForeground }]}>
                No comments yet — be the first!
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <UserAvatar photoURL={item.authorPhoto} displayName={item.authorName} size={34} />
            <View style={[styles.bubble, { backgroundColor: colors.muted }]}>
              <View style={styles.bubbleTop}>
                <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{item.authorName}</Text>
                <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Text style={[styles.commentText, { color: colors.foreground }]}>{item.text}</Text>
            </View>
          </View>
        )}
      />

      {/* Comment input */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        <UserAvatar photoURL={profile?.photoURL} displayName={profile?.displayName} size={34} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
          placeholder="Write a comment..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: text.trim() && !submitting ? colors.primary : colors.muted }]}
          onPress={handleSubmit}
          disabled={!text.trim() || submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Feather name="send" size={16} color={text.trim() ? "#fff" : colors.mutedForeground} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: undefined },
  commentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginTop: 8,
  },
  commentsTitle: { fontSize: 15, fontFamily: undefined, fontWeight: "600" },
  emptyComments: { textAlign: "center", paddingVertical: 24, fontSize: 14, fontFamily: undefined },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    margin: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
  },
  errorText: { color: "#EF4444", fontSize: 13, flex: 1, lineHeight: 18, fontFamily: undefined },
  commentRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  bubble: { flex: 1, borderRadius: 14, padding: 10 },
  bubbleTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: "600", fontFamily: undefined },
  commentTime: { fontSize: 11, fontFamily: undefined },
  commentText: { fontSize: 14, lineHeight: 20, fontFamily: undefined },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: undefined,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
