import { Icon } from "@/components/Icon";
import { PressableScale } from "@/components/PressableScale";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { useUserPhoto } from "@/hooks/useUserPhotoCache";
import { UserAvatar } from "./UserAvatar";

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  createdAt: number;
  replyToId?: string;
  replyToName?: string;
}

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
  commentsList?: PostComment[];
  createdAt: number;
  subject?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  imageUrl?: string;
  videoUrl?: string;
}

interface Props {
  post: Post;
  onRefresh?: () => void;
  onDelete?: (postId: string) => void;
}

const TYPE_CONFIG = {
  note:     { label: "Note",     color: "#4F46E5" },
  question: { label: "Question", color: "#F59E0B" },
  tip:      { label: "Tip",      color: "#10B981" },
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

function VideoPlayer({ uri, width, height }: { uri: string; width: number; height: number }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  return (
    <VideoView player={player} style={{ width, height }} nativeControls contentFit="contain" />
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PostCard({ post, onRefresh, onDelete }: Props) {
  const colors = useColors();
  const { user, profile } = useAuth();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const imageWidth = screenWidth - 34;
  const IMAGE_HEIGHT = 220;

  const isOwnPost = post.authorId === user?.uid;
  const liveOtherPhoto = useUserPhoto(post.authorId, post.authorPhoto);
  const displayPhoto = isOwnPost ? (profile?.photoURL ?? post.authorPhoto) : liveOtherPhoto;

  const likes = Array.isArray(post.likes) ? post.likes : [];
  const savedBy = Array.isArray(post.savedBy) ? post.savedBy : [];
  const [liked, setLiked] = useState(user ? likes.includes(user.uid) : false);
  const [saved, setSaved] = useState(user ? savedBy.includes(user.uid) : false);
  const [likeCount, setLikeCount] = useState(likes.length);
  const [deleted, setDeleted] = useState(false);

  const imageSource = post.imageUrl || (post.mediaType === "image" ? post.mediaUrl : undefined);
  const videoSource = post.videoUrl || (post.mediaType === "video" ? post.mediaUrl : undefined);

  // Animated heart
  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  // Animated bookmark
  const bookmarkScale = useSharedValue(1);
  const bookmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  const handleDeletePost = () => {
    Alert.alert("Delete post", "Permanently delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "community_posts", post.id));
            setDeleted(true);
            onDelete?.(post.id);
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Could not delete post.");
          }
        },
      },
    ]);
  };

  const handleLike = () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    heartScale.value = withSequence(
      withSpring(1.35, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );
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

  const handleSave = () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bookmarkScale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );
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

  if (deleted) return null;

  return (
    <PressableScale
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      scaleTo={0.985}
      onPress={() => router.push(`/post/${post.id}` as any)}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push(`/user/${post.authorId}` as any)}
          style={styles.authorRow}
        >
          <UserAvatar photoURL={displayPhoto} displayName={post.authorName} size={38} />
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: colors.foreground }]}>
              {post.authorName}
            </Text>
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {timeAgo(post.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + "20" }]}>
            <Text style={[styles.typeText, { color: typeConfig.color }]}>
              {typeConfig.label}
            </Text>
          </View>
          {isOwnPost && (
            <TouchableOpacity
              onPress={handleDeletePost}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="trash-2" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Text content */}
      <Text style={[styles.content, { color: colors.foreground }]}>{post.content}</Text>
      {!!post.subject && (
        <Text style={[styles.subject, { color: colors.primary }]}>#{post.subject}</Text>
      )}

      {/* Image */}
      {!!imageSource && (
        <Image
          source={{ uri: imageSource }}
          style={{ width: imageWidth, height: IMAGE_HEIGHT }}
          resizeMode="cover"
        />
      )}

      {/* Video */}
      {!!videoSource && !imageSource && (
        <VideoPlayer uri={videoSource} width={imageWidth} height={IMAGE_HEIGHT} />
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Actions */}
      <View style={styles.actions}>
        {/* Like */}
        <TouchableOpacity style={styles.action} onPress={handleLike} activeOpacity={0.7}>
          <Animated.View style={heartStyle}>
            <Icon
              name={liked ? "heart" : "heart-outline"}
              size={20}
              color={liked ? "#EF4444" : colors.mutedForeground}
            />
          </Animated.View>
          <Text style={[styles.actionText, { color: liked ? "#EF4444" : colors.mutedForeground }]}>
            {likeCount}
          </Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          style={styles.action}
          onPress={() => router.push(`/post/${post.id}` as any)}
          activeOpacity={0.7}
        >
          <Icon name="message-circle" size={20} color={colors.mutedForeground} />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
            {post.commentCount ?? 0}
          </Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity style={styles.action} onPress={handleSave} activeOpacity={0.7}>
          <Animated.View style={bookmarkStyle}>
            <Icon
              name={saved ? "bookmark" : "bookmark-outline"}
              size={20}
              color={saved ? colors.primary : colors.mutedForeground}
            />
          </Animated.View>
          <Text style={[styles.actionText, { color: saved ? colors.primary : colors.mutedForeground }]}>
            {saved ? "Saved" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </PressableScale>
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
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
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
  authorName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  time: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  content: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 23,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  subject: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  divider: { height: 1, marginHorizontal: 14, marginTop: 6 },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 24,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
