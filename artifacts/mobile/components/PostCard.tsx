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
import { useUserPhoto, useUserDisplayName } from "@/hooks/useUserPhotoCache";
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

export interface PollOption {
  text: string;
  votes: string[];
}

export interface PollData {
  question: string;
  options: PollOption[];
}

export interface CodeBlock {
  language?: string;
  content: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  type: "note" | "question" | "tip" | "poll" | "code";
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
  poll?: PollData;
  code?: CodeBlock;
}

/**
 * Normalize a raw Firestore post document into the mobile Post shape.
 * Handles field-name variations that may come from the web app or other
 * clients so both platforms read each other's posts correctly.
 */
export function normalizePost(id: string, data: Record<string, any>): Post {
  // ── timestamp ──────────────────────────────────────────────────────
  let createdAt: number = Date.now();
  const rawTs = data.createdAt ?? data.timestamp ?? data.date ?? data.postedAt;
  if (rawTs && typeof rawTs.toMillis === "function") createdAt = rawTs.toMillis();
  else if (rawTs && typeof rawTs === "object" && "_seconds" in rawTs) createdAt = rawTs._seconds * 1000;
  else if (typeof rawTs === "number") createdAt = rawTs;

  // ── media ──────────────────────────────────────────────────────────
  const imageUrl: string | null =
    data.imageUrl ?? data.imageURL ?? data.image ?? data.photo ?? data.photoUrl ?? null;
  const videoUrl: string | null =
    data.videoUrl ?? data.videoURL ?? data.video ?? null;
  const rawMediaType: string | null = data.mediaType ?? null;
  const mediaType: "image" | "video" | undefined =
    rawMediaType === "image" || rawMediaType === "video"
      ? rawMediaType
      : imageUrl
      ? "image"
      : videoUrl
      ? "video"
      : undefined;

  // ── post type ──────────────────────────────────────────────────────
  // Helper: check if a Firestore value is actually present (not null)
  const hasValue = (v: any) => v !== null && v !== undefined && !(typeof v === "object" && "nullValue" in v);
  const rawType = data.type ?? data.postType ?? data.kind ?? "";
  let type: "note" | "question" | "tip" | "poll" | "code" = "note";
  if (rawType === "poll" || (hasValue(data.poll) && typeof data.poll === "object" && data.poll.options) || (hasValue(data.pollData) && typeof data.pollData === "object" && data.pollData.options)) type = "poll";
  else if (rawType === "code" || (hasValue(data.code) && typeof data.code === "object" && data.code.content) || hasValue(data.codeBlock) || hasValue(data.codeSnippet)) type = "code";
  else if (rawType === "note" || rawType === "question" || rawType === "tip") type = rawType;

  // ── poll ───────────────────────────────────────────────────────────
  let poll: PollData | undefined;
  const rawPoll = hasValue(data.poll) ? data.poll : hasValue(data.pollData) ? data.pollData : undefined;
  if (rawPoll && typeof rawPoll === "object" && !("nullValue" in rawPoll)) {
    const opts = Array.isArray(rawPoll.options)
      ? rawPoll.options.map((o: any) => ({
          text: o.text ?? o.label ?? o.name ?? "Option",
          votes: Array.isArray(o.votes) ? o.votes : [],
        }))
      : [];
    poll = {
      question: rawPoll.question ?? rawPoll.title ?? "Poll",
      options: opts,
    };
  } else if (Array.isArray(data.pollOptions) && data.pollOptions.length > 0) {
    // Some web apps store poll as separate fields
    poll = {
      question: data.pollQuestion ?? data.content ?? "Poll",
      options: data.pollOptions.map((o: any) => ({
        text: typeof o === "string" ? o : (o.text ?? "Option"),
        votes: Array.isArray(o.votes) ? o.votes : [],
      })),
    };
  }

  // ── code block ─────────────────────────────────────────────────────
  let code: CodeBlock | undefined;
  const rawCode = hasValue(data.code)
    ? data.code
    : hasValue(data.codeBlock)
    ? data.codeBlock
    : hasValue(data.codeSnippet)
    ? data.codeSnippet
    : undefined;
  if (rawCode && typeof rawCode === "object" && !("nullValue" in rawCode)) {
    code = {
      language: rawCode.language ?? rawCode.lang ?? undefined,
      content: rawCode.content ?? rawCode.code ?? rawCode.text ?? "",
    };
  } else if (typeof rawCode === "string" && rawCode.trim().length > 0) {
    code = { content: rawCode };
  } else if (typeof data.content === "string" && data.content.startsWith("```")) {
    // Markdown-style code block in content
    const match = data.content.match(/```(\w+)?\n?([\s\S]*?)```/);
    if (match) {
      code = { language: match[1] || undefined, content: match[2].trim() };
    }
  }

  return {
    id,
    authorId:    data.authorId    ?? data.userId  ?? data.uid      ?? data.author?.id ?? "",
    authorName:  data.authorName  ?? data.userName ?? data.displayName ?? data.name   ?? (typeof data.author === "string" ? data.author : data.author?.name) ?? "Anonymous",
    authorPhoto: data.authorPhoto ?? data.photoURL ?? data.avatar   ?? data.authorAvatar ?? data.author?.photo ?? "",
    content:     data.content     ?? data.text     ?? data.body     ?? data.message   ?? data.description ?? "",
    type,
    subject:     data.subject     ?? data.category ?? data.tag      ?? data.topic     ?? undefined,
    imageUrl:    imageUrl         ?? undefined,
    videoUrl:    videoUrl         ?? undefined,
    mediaUrl:    data.mediaUrl    ?? imageUrl ?? videoUrl ?? undefined,
    mediaType,
    likes:       Array.isArray(data.likes)   ? data.likes   : [],
    savedBy:     Array.isArray(data.savedBy) ? data.savedBy : [],
    commentCount: typeof data.commentCount === "number"
      ? data.commentCount
      : typeof data.comments === "number"
      ? data.comments
      : 0,
    commentsList: Array.isArray(data.commentsList)
      ? data.commentsList.map((c: any) => ({
          ...c,
          createdAt: typeof c.createdAt === "number" ? c.createdAt : Date.now(),
        }))
      : undefined,
    createdAt,
    poll,
    code,
  };
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
  poll:     { label: "Poll",     color: "#A855F7" },
  code:     { label: "Code",     color: "#10B981" },
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

function InlineVideoPlayer({ uri, width, height }: { uri: string; width: number; height: number }) {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });

  if (!playing) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => setPlaying(true)} style={{ width, height }}>
        <View style={{ width, height, backgroundColor: "#0D0B2B", alignItems: "center", justifyContent: "center" }}>
          <Icon name="video-camera" size={40} color="#A855F7" />
        </View>
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" }]}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(168,85,247,0.9)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="play" size={24} color="#fff" />
          </View>
        </View>
        <View style={{ position: "absolute", bottom: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(168,85,247,0.85)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
          <Icon name="video-camera" size={11} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>Video</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <VideoView
      player={player}
      style={{ width, height }}
      nativeControls
      contentFit="contain"
      onLayout={() => player.play()}
    />
  );
}

function PollView({ post, user }: { post: Post; user: any }) {
  const colors = useColors();
  const [localPoll, setLocalPoll] = useState(post.poll);
  const totalVotes = localPoll?.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0) || 0;

  if (!localPoll || !localPoll.options.length) return null;

  const handleVote = async (optionIndex: number) => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const ref = doc(db, "community_posts", post.id);
    const uid = user.uid;

    // Check if user already voted for any option
    const alreadyVotedIndex = localPoll.options.findIndex((o) => o.votes?.includes(uid));

    let newOptions = [...localPoll.options];

    if (alreadyVotedIndex === optionIndex) {
      // Remove vote from this option
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        votes: newOptions[optionIndex].votes.filter((v) => v !== uid),
      };
    } else {
      // Remove vote from previous option if any
      if (alreadyVotedIndex >= 0) {
        newOptions[alreadyVotedIndex] = {
          ...newOptions[alreadyVotedIndex],
          votes: newOptions[alreadyVotedIndex].votes.filter((v) => v !== uid),
        };
      }
      // Add vote to new option
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        votes: [...(newOptions[optionIndex].votes || []), uid],
      };
    }

    setLocalPoll({ ...localPoll, options: newOptions });

    try {
      await updateDoc(ref, { poll: { ...localPoll, options: newOptions } });
    } catch (e) {
      // Revert on error
      setLocalPoll(post.poll);
    }
  };

  return (
    <View style={styles.pollContainer}>
      {post.content && post.content !== localPoll.question && (
        <Text style={[styles.content, { color: colors.foreground }]}>{post.content}</Text>
      )}
      <Text style={[styles.pollQuestion, { color: colors.foreground }]}>
        {localPoll.question}
      </Text>
      {localPoll.options.map((option, idx) => {
        const votes = option.votes?.length || 0;
        const hasVoted = user ? option.votes?.includes(user.uid) : false;
        const percent = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
        return (
          <TouchableOpacity
            key={idx}
            style={[styles.pollOption, { backgroundColor: hasVoted ? colors.primary + "25" : colors.muted + "80", borderColor: hasVoted ? colors.primary : colors.border }]}
            onPress={() => handleVote(idx)}
            activeOpacity={0.7}
          >
            <View style={styles.pollOptionRow}>
              <Text style={[styles.pollOptionText, { color: colors.foreground }]}>
                {option.text}
              </Text>
              <Text style={[styles.pollVoteText, { color: colors.mutedForeground }]}>
                {votes} vote{votes !== 1 ? "s" : ""}
              </Text>
            </View>
            {totalVotes > 0 && (
              <View style={[styles.pollBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.pollBarFill,
                    {
                      width: `${percent}%` as any,
                      backgroundColor: hasVoted ? colors.primary : colors.accent,
                    },
                  ]}
                />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
      <Text style={[styles.pollTotal, { color: colors.mutedForeground }]}>
        {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
      </Text>
    </View>
  );
}

function CodeBlockView({ code }: { code: CodeBlock }) {
  const colors = useColors();
  return (
    <View style={[styles.codeContainer, { backgroundColor: "#0D0B2B", borderColor: colors.border }]}>
      {code.language && (
        <View style={styles.codeLangBadge}>
          <Text style={styles.codeLangText}>{code.language.toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.codeText} selectable>
        {code.content}
      </Text>
    </View>
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

  // For web posts that don't store authorName, fetch it live from Firestore
  const needsLiveName = !post.authorName || post.authorName === "Anonymous" || post.authorName === "Community member";
  const liveOtherName = useUserDisplayName(
    needsLiveName && !isOwnPost ? post.authorId : "",
    post.authorName
  );
  const displayName = isOwnPost
    ? (profile?.displayName ?? post.authorName)
    : needsLiveName
    ? (liveOtherName ?? post.authorName)
    : post.authorName;

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

  const isPoll = post.type === "poll" || !!post.poll;
  const isCode = post.type === "code" || !!post.code;

  return (
    <PressableScale
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      scaleTo={0.985}
      onPress={() => {
        if (!isPoll) router.push(`/post/${post.id}` as any);
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push(`/user/${post.authorId}` as any)}
          style={styles.authorRow}
        >
          <UserAvatar photoURL={displayPhoto} displayName={displayName || post.authorName} size={38} />
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: colors.foreground }]}>
              {displayName || post.authorName}
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

      {/* Poll */}
      {isPoll && post.poll && (
        <PollView post={post} user={user} />
      )}

      {/* Code block */}
      {isCode && post.code && (
        <CodeBlockView code={post.code} />
      )}

      {/* Text content (only if not purely poll/code) */}
      {(!isPoll || (post.content && post.content !== post.poll?.question)) && !isCode && (
        <Text style={[styles.content, { color: colors.foreground }]}>{post.content}</Text>
      )}
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
        <InlineVideoPlayer uri={videoSource} width={imageWidth} height={IMAGE_HEIGHT} />
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

        {/* Share */}
        <TouchableOpacity style={styles.action} activeOpacity={0.7}>
          <Icon name="share-2" size={20} color={colors.mutedForeground} />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Share</Text>
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

  // Poll styles
  pollContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  pollQuestion: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  pollOption: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  pollOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pollOptionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    flex: 1,
  },
  pollVoteText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  pollBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  pollBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  pollTotal: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },

  // Code block styles
  codeContainer: {
    marginHorizontal: 14,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    paddingTop: 10,
  },
  codeLangBadge: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  codeLangText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#F59E0B",
    letterSpacing: 1,
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 20,
    color: "#4ADE80",
  },
});
