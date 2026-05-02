import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
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
import { Post, PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  createdAt: number;
}

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
  const [postLoading, setPostLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const inputRef = useRef<TextInput>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  // Load post
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
      setPostLoading(false);
    });
  }, [id]);

  // Live comments — no orderBy (avoids Firestore composite index requirement)
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "community_posts", id, "comments"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: Comment[] = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Comment, "id">),
            createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
          }))
          .sort((a, b) => a.createdAt - b.createdAt);
        setComments(data);
      },
      (err) => {
        if (err.code === "permission-denied") {
          setCommentError(
            "Comments are blocked by Firestore rules. In Firebase Console → Firestore → Rules, add:\n\nmatch /community_posts/{p}/comments/{c} {\n  allow read: true;\n  allow create: if request.auth != null;\n}"
          );
        } else {
          console.warn("Comments error:", err);
        }
      }
    );
    return unsub;
  }, [id]);

  const handleSubmit = async () => {
    if (!user || !profile || !text.trim() || !id) return;
    setSubmitting(true);
    setCommentError("");
    try {
      await addDoc(collection(db, "community_posts", id, "comments"), {
        authorId: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL ?? null,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "community_posts", id), {
        commentCount: increment(1),
      });
      addXP(5).catch(() => {});
      setText("");
    } catch (e: any) {
      if (e?.code === "permission-denied") {
        setCommentError(
          "Firestore rules are blocking comments. Open Firebase Console → Firestore Database → Rules and allow write access to the comments subcollection."
        );
      } else {
        setCommentError(e?.message || "Failed to post comment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (postLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <Text style={[{ color: colors.mutedForeground, fontSize: 16 }]}>Post not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Post</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Feed: post + comments */}
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListHeaderComponent={
          <View>
            {/* Post card */}
            <PostCard post={post} />

            {/* Comments heading */}
            <View style={[styles.commentsHeader, { borderBottomColor: colors.border }]}>
              <Feather name="message-circle" size={16} color={colors.primary} />
              <Text style={[styles.commentsTitle, { color: colors.foreground }]}>
                Comments ({comments.length})
              </Text>
            </View>

            {/* Firestore rules error */}
            {!!commentError && (
              <View style={styles.errorBox}>
                <Feather name="alert-triangle" size={15} color="#F59E0B" />
                <Text style={styles.errorText}>{commentError}</Text>
              </View>
            )}

            {comments.length === 0 && !commentError && (
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

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
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
          style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.muted }]}
          onPress={handleSubmit}
          disabled={!text.trim() || submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Feather name="send" size={16} color={text.trim() ? "#fff" : colors.mutedForeground} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
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
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.4)",
  },
  errorText: { color: "#F59E0B", fontSize: 12, flex: 1, lineHeight: 18, fontFamily: undefined },
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
