import { Icon } from "@/components/Icon";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { Post, PostCard, PostComment, normalizePost } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ─── flat list item types ────────────────────────────────────────────────────
type CommentItem =
  | { kind: "top"; comment: PostComment; replyCount: number }
  | { kind: "view-replies"; parentId: string; count: number }
  | { kind: "reply"; comment: PostComment; parentId: string };

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
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  // Reply state — now carries parentId for threading
  const [replyingTo, setReplyingTo] = useState<{ name: string; commentId: string } | null>(null);

  const inputRef = useRef<TextInput>(null);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  useEffect(() => {
    if (!id) return;
    const postId = Array.isArray(id) ? id[0] : id;
    const unsub = onSnapshot(
      doc(db, "community_posts", postId),
      (snap) => {
        if (snap.exists()) {
          setPost(normalizePost(snap.id, snap.data()));
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

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const handleReply = (authorName: string, commentId: string) => {
    setReplyingTo({ name: authorName, commentId });
    setText("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setText("");
  };

  const handleDelete = async (comment: PostComment) => {
    const postId = Array.isArray(id) ? id[0] : id;
    if (!postId) return;
    Alert.alert("Delete comment", "Remove this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "community_posts", postId), {
              commentsList: arrayRemove(comment),
              commentCount: Math.max(0, (post?.commentsList?.length ?? 1) - 1),
            });
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Could not delete comment.");
          }
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Not signed in", "You must be signed in to comment.");
      return;
    }
    if (!text.trim()) return;

    const postId = Array.isArray(id) ? id[0] : id;
    if (!postId) return;

    setSubmitting(true);
    setError("");

    const authorName = profile?.displayName || user.displayName || "Learner";
    const authorPhoto = profile?.photoURL || user.photoURL || "";

    const newComment: PostComment = {
      id: `${user.uid}_${Date.now()}`,
      authorId: user.uid,
      authorName,
      authorPhoto,
      text: replyingTo ? `@${replyingTo.name} ${text.trim()}` : text.trim(),
      createdAt: Date.now(),
      ...(replyingTo ? { replyToId: replyingTo.commentId, replyToName: replyingTo.name } : {}),
    };

    try {
      await updateDoc(doc(db, "community_posts", postId), {
        commentsList: arrayUnion(newComment),
        commentCount: (post?.commentsList?.length ?? 0) + 1,
      });
      addXP(5).catch(() => {});
      setText("");
      setReplyingTo(null);
      // Auto-expand the parent thread
      if (newComment.replyToId) {
        setExpandedReplies((prev) => new Set(prev).add(newComment.replyToId!));
      }
    } catch (e: any) {
      console.warn("Comment submit error:", e?.code, e?.message);
      const msg =
        e?.code === "permission-denied"
          ? "Firestore rules are blocking this write."
          : e?.message || "Unknown error.";
      Alert.alert("Comment failed", msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Build threaded flat list ─────────────────────────────────────────────
  const allComments = [...(post?.commentsList ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  const topLevel = allComments.filter((c) => !c.replyToId);
  const repliesMap: Record<string, PostComment[]> = {};
  allComments.filter((c) => c.replyToId).forEach((c) => {
    if (!repliesMap[c.replyToId!]) repliesMap[c.replyToId!] = [];
    repliesMap[c.replyToId!].push(c);
  });

  const listItems: CommentItem[] = [];
  topLevel.forEach((c) => {
    const replies = repliesMap[c.id] ?? [];
    listItems.push({ kind: "top", comment: c, replyCount: replies.length });
    if (replies.length > 0) {
      if (expandedReplies.has(c.id)) {
        replies.forEach((r) => listItems.push({ kind: "reply", comment: r, parentId: c.id }));
        // "Hide replies" row
        listItems.push({ kind: "view-replies", parentId: c.id, count: -1 });
      } else {
        listItems.push({ kind: "view-replies", parentId: c.id, count: replies.length });
      }
    }
  });

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
            <Icon name="arrow-left" size={22} color={colors.foreground} />
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

  const renderItem = ({ item }: { item: CommentItem }) => {
    // ── "View / hide replies" row — Facebook style ────────────────────────
    if (item.kind === "view-replies") {
      const hide = item.count === -1;
      return (
        <TouchableOpacity
          style={styles.viewRepliesRow}
          onPress={() => toggleReplies(item.parentId)}
          activeOpacity={0.7}
        >
          {/* Left connector: avatar column indent + horizontal dash */}
          <View style={styles.replyConnectorWrap}>
            <View style={[styles.replyConnectorLine, { backgroundColor: colors.border }]} />
          </View>
          <View style={[styles.viewRepliesPill, { borderColor: colors.primary + "44", backgroundColor: colors.primary + "14" }]}>
            <Icon
              name={hide ? "chevron-up" : "chevron-down"}
              size={13}
              color={colors.primary}
            />
            <Text style={[styles.viewRepliesText, { color: colors.primary }]}>
              {hide ? "Hide replies" : `View ${item.count} ${item.count === 1 ? "reply" : "replies"}`}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    const { comment } = item;
    const isReply = item.kind === "reply";
    const isOwn = comment.authorId === user?.uid;

    // parse text: if starts with @Name strip prefix to show separately
    const hasPrefix = comment.text.startsWith("@");
    const prefixWord = hasPrefix ? comment.text.split(" ")[0] : "";
    const restText = hasPrefix ? comment.text.split(" ").slice(1).join(" ") : comment.text;

    return (
      <View style={[styles.commentRow, isReply && styles.commentRowReply]}>
        {/* Left vertical thread line for replies */}
        {isReply && (
          <View style={styles.replyThreadCol}>
            <View style={[styles.replyThreadLine, { backgroundColor: colors.border }]} />
          </View>
        )}

        <UserAvatar photoURL={comment.authorPhoto} displayName={comment.authorName} size={isReply ? 28 : 34} />

        <View style={{ flex: 1 }}>
          <View style={[styles.bubble, { backgroundColor: isReply ? colors.muted + "88" : colors.muted, borderColor: colors.border, borderWidth: isReply ? 1 : 0 }]}>
            <View style={styles.bubbleTop}>
              <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{comment.authorName}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>{timeAgo(comment.createdAt)}</Text>
                {isOwn && (
                  <TouchableOpacity onPress={() => handleDelete(comment)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Icon name="trash-2" size={13} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {hasPrefix ? (
              <Text style={[styles.commentText, { color: colors.foreground }]}>
                <Text style={{ color: colors.primary, fontWeight: "600" }}>{prefixWord} </Text>
                {restText}
              </Text>
            ) : (
              <Text style={[styles.commentText, { color: colors.foreground }]}>{comment.text}</Text>
            )}
          </View>

          {/* Reply button — only on top-level comments */}
          {!isReply && (
            <TouchableOpacity
              style={styles.replyBtn}
              onPress={() => handleReply(comment.authorName, comment.id)}
            >
              <Icon name="corner-down-right" size={12} color={colors.mutedForeground} />
              <Text style={[styles.replyBtnText, { color: colors.mutedForeground }]}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Post</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={listItems}
        keyExtractor={(item) =>
          item.kind === "view-replies"
            ? `vr-${item.parentId}`
            : item.kind === "reply"
            ? `reply-${item.comment.id}`
            : `top-${item.comment.id}`
        }
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <PostCard post={post} onDelete={() => router.back()} />

            {!!error && (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={15} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={[styles.commentsHeader, { borderBottomColor: colors.border }]}>
              <Icon name="message-circle" size={16} color={colors.primary} />
              <Text style={[styles.commentsTitle, { color: colors.foreground }]}>
                Comments ({topLevel.length})
              </Text>
            </View>

            {topLevel.length === 0 && (
              <Text style={[styles.emptyComments, { color: colors.mutedForeground }]}>
                No comments yet — be the first!
              </Text>
            )}
          </View>
        }
        renderItem={renderItem}
      />

      {/* Replying-to banner */}
      {!!replyingTo && (
        <View style={[styles.replyBanner, { backgroundColor: colors.secondary, borderTopColor: colors.border }]}>
          <Icon name="corner-down-right" size={13} color={colors.primary} />
          <Text style={[styles.replyBannerText, { color: colors.primary }]}>
            Replying to <Text style={{ fontWeight: "700" }}>@{replyingTo.name}</Text>
          </Text>
          <TouchableOpacity onPress={cancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      )}

      {/* Comment input */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        <UserAvatar photoURL={profile?.photoURL} displayName={profile?.displayName} size={34} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
          placeholder={replyingTo ? `Replying to @${replyingTo.name}...` : "Write a comment..."}
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
            : <Icon name="send" size={16} color={text.trim() ? "#fff" : colors.mutedForeground} />}
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
  headerTitle: { fontSize: 18 },
  videoWrap: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 14,
    overflow: "hidden",
  },
  video: { width: "100%", height: 220 },
  commentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginTop: 8,
  },
  commentsTitle: { fontSize: 15, fontWeight: "600" },
  emptyComments: { textAlign: "center", paddingVertical: 24, fontSize: 14 },
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
  errorText: { color: "#EF4444", fontSize: 13, flex: 1, lineHeight: 18 },

  // ── comment rows ──────────────────────────────────────────────────────────
  commentRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
    alignItems: "flex-start",
  },
  commentRowReply: {
    paddingLeft: 28,
    paddingTop: 4,
  },

  // ── left thread line for replies ──────────────────────────────────────────
  replyThreadCol: {
    width: 18,
    alignItems: "center",
    alignSelf: "stretch",
    paddingTop: 2,
  },
  replyThreadLine: {
    width: 2,
    flex: 1,
    borderRadius: 2,
    minHeight: 28,
  },

  bubble: { flex: 1, borderRadius: 14, padding: 10 },
  bubbleTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4, alignItems: "center" },
  commentAuthor: { fontSize: 13, fontWeight: "600" },
  commentTime: { fontSize: 11 },
  commentText: { fontSize: 14, lineHeight: 20 },

  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 2,
  },
  replyBtnText: { fontSize: 12 },

  // ── "View X replies" — Facebook style ────────────────────────────────────
  viewRepliesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 28,
    paddingRight: 16,
    paddingVertical: 6,
    marginBottom: 2,
  },
  replyConnectorWrap: {
    width: 34,
    height: 1.5,
  },
  replyConnectorLine: {
    flex: 1,
    height: 1.5,
    borderRadius: 2,
  },
  viewRepliesPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  viewRepliesText: { fontSize: 13, fontWeight: "600" },

  // ── reply banner + input ──────────────────────────────────────────────────
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  replyBannerText: { flex: 1, fontSize: 13 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
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
