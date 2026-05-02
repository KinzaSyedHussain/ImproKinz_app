import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  arrayRemove,
  arrayUnion,
  doc,
  increment,
  updateDoc,
} from "firebase/firestore";
import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "./UserAvatar";

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  type: "note" | "question" | "tip";
  likes: string[];
  savedBy: string[];
  commentCount: number;
  createdAt: number;
  subject?: string;
  // media — app writes mediaUrl/mediaType; website writes imageUrl / videoUrl
  mediaUrl?: string;
  mediaType?: "image" | "video";
  imageUrl?: string;
  videoUrl?: string;
}

interface Props {
  post: Post;
  onRefresh?: () => void;
}

const TYPE_CONFIG = {
  note: { label: "Note", color: "#4F46E5" },
  question: { label: "Question", color: "#F59E0B" },
  tip: { label: "Tip", color: "#10B981" },
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

export function PostCard({ post, onRefresh }: Props) {
  const colors = useColors();
  const { user } = useAuth();
  const router = useRouter();

  // Defensive defaults — old posts from the website may not have these arrays
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const savedBy = Array.isArray(post.savedBy) ? post.savedBy : [];
  const [liked, setLiked] = useState(user ? likes.includes(user.uid) : false);
  const [saved, setSaved] = useState(user ? savedBy.includes(user.uid) : false);
  const [likeCount, setLikeCount] = useState(likes.length);

  // Resolve media — support both field naming conventions
  const imageSource = post.imageUrl || (post.mediaType === "image" ? post.mediaUrl : undefined);
  const videoSource = post.videoUrl || (post.mediaType === "video" ? post.mediaUrl : undefined);

  const handleLike = async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ref = doc(db, "community_posts", post.id);
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      updateDoc(ref, { likes: arrayRemove(user.uid) }).catch(() => {});
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      updateDoc(ref, { likes: arrayUnion(user.uid) }).catch(() => {});
    }
  };

  const handleSave = async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ref = doc(db, "community_posts", post.id);
    if (saved) {
      setSaved(false);
      updateDoc(ref, { savedBy: arrayRemove(user.uid) }).catch(() => {});
    } else {
      setSaved(true);
      updateDoc(ref, { savedBy: arrayUnion(user.uid) }).catch(() => {});
    }
  };

  const typeConfig = TYPE_CONFIG[post.type] || TYPE_CONFIG.note;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push(`/user/${post.authorId}` as any)}
          style={styles.authorRow}
        >
          <UserAvatar
            photoURL={post.authorPhoto}
            displayName={post.authorName}
            size={38}
          />
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: colors.foreground }]}>
              {post.authorName}
            </Text>
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {timeAgo(post.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + "18" }]}>
          <Text style={[styles.typeText, { color: typeConfig.color }]}>
            {typeConfig.label}
          </Text>
        </View>
      </View>

      {/* Content */}
      <TouchableOpacity
        onPress={() => router.push(`/post/${post.id}` as any)}
        activeOpacity={0.8}
      >
        <Text style={[styles.content, { color: colors.foreground }]}>
          {post.content}
        </Text>
        {post.subject ? (
          <Text style={[styles.subject, { color: colors.primary }]}>
            #{post.subject}
          </Text>
        ) : null}
      </TouchableOpacity>

      {/* Image media */}
      {!!imageSource && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push(`/post/${post.id}` as any)}
        >
          <Image
            source={{ uri: imageSource }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {/* Video placeholder — tapping navigates to post detail */}
      {!!videoSource && !imageSource && (
        <TouchableOpacity
          style={[styles.videoPlaceholder, { backgroundColor: colors.muted, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => router.push(`/post/${post.id}` as any)}
        >
          <View style={styles.playBtn}>
            <Feather name="play" size={28} color="#fff" />
          </View>
          <Text style={[styles.videoLabel, { color: colors.mutedForeground }]}>Tap to watch video</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={handleLike}>
          <Feather
            name="heart"
            size={18}
            color={liked ? "#EF4444" : colors.mutedForeground}
          />
          <Text style={[styles.actionText, { color: liked ? "#EF4444" : colors.mutedForeground }]}>
            {likeCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.action}
          onPress={() => router.push(`/post/${post.id}` as any)}
        >
          <Feather name="message-circle" size={18} color={colors.mutedForeground} />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
            {post.commentCount ?? 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={handleSave}>
          <Feather
            name="bookmark"
            size={18}
            color={saved ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.actionText, { color: saved ? colors.primary : colors.mutedForeground }]}>
            {saved ? "Saved" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    paddingBottom: 10,
  },
  authorRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  authorInfo: { marginLeft: 10 },
  authorName: { fontFamily: undefined, fontSize: 14, fontWeight: "600" },
  time: { fontFamily: undefined, fontSize: 12, marginTop: 1 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeText: { fontFamily: undefined, fontSize: 11, fontWeight: "600" },
  content: {
    fontFamily: undefined,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  subject: {
    fontFamily: undefined,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  mediaImage: {
    width: "100%",
    height: 220,
  },
  videoPlaceholder: {
    height: 160,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoLabel: { fontFamily: undefined, fontSize: 13 },
  divider: { height: 1, marginHorizontal: 14 },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 24,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontFamily: undefined, fontSize: 13 },
});
