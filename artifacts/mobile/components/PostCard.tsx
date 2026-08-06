import { Icon } from "@/components/Icon";
import { PressableScale } from "@/components/PressableScale";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
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

export type ReactionKey = "like" | "insightful" | "congrats";

export interface PostReactions {
  like: string[];
  insightful: string[];
  congrats: string[];
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  type: "note" | "question" | "tip" | "poll" | "code" | "progress";
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
  reactions?: PostReactions;
  bestAnswerId?: string;
  studyProgress?: {
    duration: string;
    completed: string;
    nextStep: string;
  };
}

interface PersonSummary {
  uid: string;
  displayName: string;
  photoURL?: string;
}

interface PeopleGroup {
  label: string;
  ids: string[];
}

async function fetchPeople(ids: string[]): Promise<PersonSummary[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))].slice(0, 100);
  const people = await Promise.all(
    uniqueIds.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, "profiles", uid));
        const data = snap.data() ?? {};
        return {
          uid,
          displayName: data.displayName || data.name || data.userName || "Study User",
          photoURL: data.photoURL || data.avatar || undefined,
        };
      } catch {
        return { uid, displayName: "Study User" };
      }
    }),
  );
  return people;
}

function PeopleModal({
  visible,
  title,
  ids,
  groups,
  onClose,
}: {
  visible: boolean;
  title: string;
  ids: string[];
  groups?: PeopleGroup[];
  onClose: () => void;
}) {
  const colors = useColors();
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const idsKey = ids.join("|");

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    fetchPeople(ids)
      .then((result) => {
        if (!cancelled) setPeople(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, idsKey]);

  const peopleById = new Map(people.map((person) => [person.uid, person]));
  const renderPerson = (uid: string) => {
    const person = peopleById.get(uid);
    return (
      <View key={uid} style={styles.personRow}>
        <UserAvatar
          photoURL={person?.photoURL}
          displayName={person?.displayName || "Study User"}
          size={40}
        />
        <Text style={[styles.personName, { color: colors.foreground }]}>
          {person?.displayName || "Study User"}
        </Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.peopleOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.peopleSheet, { backgroundColor: colors.card }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{title}</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
                {ids.length} {ids.length === 1 ? "person" : "people"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
              <Icon name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.peopleEmpty}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : ids.length === 0 ? (
            <View style={styles.peopleEmpty}>
              <Icon name="users" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyPeopleText, { color: colors.mutedForeground }]}>
                No one yet
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.peopleList}
            >
              {groups
                ? groups.map((group) => (
                    <View key={group.label} style={styles.peopleGroup}>
                      <Text style={[styles.groupLabel, { color: colors.primary }]}>
                        {group.label}
                      </Text>
                      {group.ids.length > 0 ? (
                        group.ids.map(renderPerson)
                      ) : (
                        <Text style={[styles.noGroupVotes, { color: colors.mutedForeground }]}>
                          No votes yet
                        </Text>
                      )}
                    </View>
                  ))
                : ids.map(renderPerson)}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
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
  let type: "note" | "question" | "tip" | "poll" | "code" | "progress" = "note";
  if (rawType === "poll" || (hasValue(data.poll) && typeof data.poll === "object" && data.poll.options) || (hasValue(data.pollData) && typeof data.pollData === "object" && data.pollData.options)) type = "poll";
  else if (rawType === "code" || (hasValue(data.code) && typeof data.code === "object" && data.code.content) || hasValue(data.codeBlock) || hasValue(data.codeSnippet)) type = "code";
  else if (rawType === "progress") type = "progress";
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
    reactions: {
      like: Array.isArray(data.reactions?.like) ? data.reactions.like : (Array.isArray(data.likes) ? data.likes : []),
      insightful: Array.isArray(data.reactions?.insightful) ? data.reactions.insightful : [],
      congrats: Array.isArray(data.reactions?.congrats) ? data.reactions.congrats : [],
    },
    bestAnswerId: typeof data.bestAnswerId === "string" ? data.bestAnswerId : undefined,
    studyProgress: data.studyProgress && typeof data.studyProgress === "object"
      ? {
          duration: String(data.studyProgress.duration ?? ""),
          completed: String(data.studyProgress.completed ?? ""),
          nextStep: String(data.studyProgress.nextStep ?? ""),
        }
      : undefined,
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
  progress: { label: "Study log", color: "#38BDF8" },
};

const REACTIONS: Array<{ key: ReactionKey; emoji: string; label: string }> = [
  { key: "like", emoji: "👍", label: "Like" },
  { key: "insightful", emoji: "💡", label: "Insightful" },
  { key: "congrats", emoji: "🎉", label: "Congrats" },
];

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

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
  const { getToken } = useClerkAuth();
  const [localPoll, setLocalPoll] = useState(post.poll);
  const [votersVisible, setVotersVisible] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voterGroups, setVoterGroups] = useState<PeopleGroup[]>([]);
  const totalVotes = localPoll?.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0) || 0;

  useEffect(() => {
    setLocalPoll(post.poll);
  }, [post.poll]);

  if (!localPoll || !localPoll.options.length) return null;

  const handleVote = async (optionIndex: number) => {
    if (!user || voting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const ref = doc(db, "community_posts", post.id);
    const uid = user.uid;
    const previousPoll = localPoll;
    setVoting(true);

    try {
      let nextPoll: PollData | null = null;
      const clerkToken = await getToken().catch(() => null);

      if (API_BASE && clerkToken) {
        const response = await fetch(`${API_BASE}/api/posts/${post.id}/vote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${clerkToken}`,
          },
          body: JSON.stringify({ optionIndex }),
        });
        if (response.ok) {
          const result = await response.json();
          nextPoll = result.poll;
        } else if (response.status !== 404 && response.status !== 503) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || "Vote could not be saved.");
        }
      }

      // Keep a direct Firestore fallback for environments where the API is unavailable.
      if (!nextPoll) {
        nextPoll = await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref);
          const data = snapshot.data() ?? {};
          const storedPoll = data.poll ?? data.pollData ?? {};
          const storedOptions = Array.isArray(storedPoll.options) ? storedPoll.options : [];
          const options = storedOptions.map((option: any) => ({
            text: option.text ?? option.label ?? option.name ?? "Option",
            votes: Array.isArray(option.votes) ? [...option.votes] : [],
          }));
          if (optionIndex < 0 || optionIndex >= options.length) {
            throw new Error("This poll option is no longer available.");
          }

          const alreadyVotedIndex = options.findIndex((option: PollOption) =>
            option.votes.includes(uid),
          );
          if (alreadyVotedIndex === optionIndex) {
            options[optionIndex].votes = options[optionIndex].votes.filter((id: string) => id !== uid);
          } else {
            if (alreadyVotedIndex >= 0) {
              options[alreadyVotedIndex].votes = options[alreadyVotedIndex].votes.filter(
                (id: string) => id !== uid,
              );
            }
            options[optionIndex].votes = [...options[optionIndex].votes, uid];
          }

          const result = {
            question: storedPoll.question ?? storedPoll.title ?? localPoll.question,
            options,
          };
          transaction.update(ref, { poll: result });
          return result;
        });
      }

      setLocalPoll(nextPoll);
    } catch (e: any) {
      setLocalPoll(previousPoll);
      Alert.alert("Vote not saved", e?.message || "Please check your connection and try again.");
    } finally {
      setVoting(false);
    }
  };

  const openVoters = () => {
    setVoterGroups(
      localPoll.options.map((option) => ({
        label: option.text,
        ids: option.votes ?? [],
      })),
    );
    setVotersVisible(true);
  };

  const voterIds = [...new Set(localPoll.options.flatMap((option) => option.votes ?? []))];

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
            disabled={voting}
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
      <TouchableOpacity style={styles.viewPeopleButton} onPress={openVoters} activeOpacity={0.75}>
        <Icon name="users" size={15} color={colors.primary} />
        <Text style={[styles.viewPeopleText, { color: colors.primary }]}>
          See who voted · {voterIds.length}
        </Text>
      </TouchableOpacity>
      <PeopleModal
        visible={votersVisible}
        title="Poll voters"
        ids={voterIds}
        groups={voterGroups}
        onClose={() => setVotersVisible(false)}
      />
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
  const { getToken } = useClerkAuth();
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
  const [saved, setSaved] = useState(user ? savedBy.includes(user.uid) : false);
  const [reactionState, setReactionState] = useState<PostReactions>(post.reactions ?? {
    like: likes,
    insightful: [],
    congrats: [],
  });
  const [deleted, setDeleted] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const activeReaction = user
    ? (Object.keys(reactionState) as ReactionKey[]).find((k) => reactionState[k].includes(user.uid))
    : undefined;
  const totalReactions = REACTIONS.reduce((sum, r) => sum + reactionState[r.key].length, 0);

  const handleLikeTap = () => {
    if (!user) {
      Alert.alert("Sign in to react", "Create an account or sign in to react to posts.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleReaction("like");
  };

  const handleLikeLongPress = () => {
    if (!user) {
      Alert.alert("Sign in to react", "Create an account or sign in to react to posts.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPickerVisible(true);
  };

  const imageSource = post.imageUrl || (post.mediaType === "image" ? post.mediaUrl : undefined);
  const videoSource = post.videoUrl || (post.mediaType === "video" ? post.mediaUrl : undefined);

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

  const handleReaction = async (reaction: ReactionKey) => {
    if (!user) {
      Alert.alert("Sign in to react", "Create an account or sign in to support study posts.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const previous = reactionState;
    const current = (Object.keys(previous) as ReactionKey[]).find((key) =>
      previous[key].includes(user.uid),
    );
    const next: PostReactions = {
      like: previous.like.filter((id) => id !== user.uid),
      insightful: previous.insightful.filter((id) => id !== user.uid),
      congrats: previous.congrats.filter((id) => id !== user.uid),
    };
    if (current !== reaction) next[reaction] = [...next[reaction], user.uid];
    setReactionState(next);

    try {
      const clerkToken = await getToken().catch(() => null);
      if (API_BASE && clerkToken) {
        const response = await fetch(`${API_BASE}/api/posts/${post.id}/reaction`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clerkToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reaction }),
        });
        if (response.ok) {
          const result = await response.json();
          setReactionState(result.reactions);
          return;
        }
        if (response.status !== 404 && response.status !== 503) {
          throw new Error("Reaction could not be saved.");
        }
      }

      await runTransaction(db, async (transaction) => {
        const ref = doc(db, "community_posts", post.id);
        const snapshot = await transaction.get(ref);
        const data = snapshot.data() ?? {};
        const raw = data.reactions ?? {};
        const stored: PostReactions = {
          like: Array.isArray(raw.like) ? [...raw.like] : (Array.isArray(data.likes) ? [...data.likes] : []),
          insightful: Array.isArray(raw.insightful) ? [...raw.insightful] : [],
          congrats: Array.isArray(raw.congrats) ? [...raw.congrats] : [],
        };
        const already = (Object.keys(stored) as ReactionKey[]).find((key) => stored[key].includes(user.uid));
        (Object.keys(stored) as ReactionKey[]).forEach((key) => {
          stored[key] = stored[key].filter((id) => id !== user.uid);
        });
        if (already !== reaction) stored[reaction].push(user.uid);
        transaction.update(ref, { reactions: stored, likes: stored.like });
        setReactionState(stored);
      });
    } catch (error) {
      setReactionState(previous);
      Alert.alert("Reaction not saved", "Please check your connection and try again.");
    }
  };

  const performSave = async (collectionName: string) => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bookmarkScale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );
    try {
      const token = await getToken().catch(() => null);
      if (API_BASE && token) {
        const response = await fetch(`${API_BASE}/api/posts/${post.id}/save`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ collection: collectionName }),
        });
        if (response.ok) {
          const result = await response.json();
          setSaved(!!result.saved);
          return;
        }
        if (response.status !== 404 && response.status !== 503) {
          throw new Error("Save could not be updated.");
        }
      }

      const ref = doc(db, "community_posts", post.id);
      if (saved) {
        setSaved(false);
        await updateDoc(ref, { savedBy: arrayRemove(user.uid) });
      } else {
        setSaved(true);
        await updateDoc(ref, {
          savedBy: arrayUnion(user.uid),
          [`savedCollections.${user.uid}`]: collectionName,
        });
      }
    } catch (error: any) {
      setSaved(saved);
      Alert.alert("Save not updated", error?.message || "Please check your connection and try again.");
    }
  };

  const handleSave = () => {
    if (!user) {
      Alert.alert("Sign in to save", "Create an account or sign in to save study posts.");
      return;
    }
    if (saved) {
      performSave("Read later");
      return;
    }
    Alert.alert("Save to collection", "Choose where to keep this post.", [
      { text: "Read later", onPress: () => performSave("Read later") },
      { text: "Exam revision", onPress: () => performSave("Exam revision") },
      { text: "Important formulas", onPress: () => performSave("Important formulas") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${displayName || post.authorName}'s study post`,
        message: `${displayName || post.authorName} shared a study ${typeConfig.label.toLowerCase()}:\n\n${post.content || post.poll?.question || "Check out this post on ImproKinz."}`,
      });
    } catch (e) {
      Alert.alert("Sharing unavailable", "This post could not be shared right now.");
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
      {post.type === "progress" && post.studyProgress && (
        <View style={[styles.progressBox, { backgroundColor: colors.secondary + "80", borderColor: colors.border }]}>
          <Text style={[styles.progressTitle, { color: colors.primary }]}>Study progress</Text>
          <View style={styles.progressGrid}>
            <View style={styles.progressMetric}>
              <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>TIME</Text>
              <Text style={[styles.progressValue, { color: colors.foreground }]}>{post.studyProgress.duration}</Text>
            </View>
            <View style={styles.progressMetric}>
              <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>COMPLETED</Text>
              <Text style={[styles.progressValue, { color: colors.foreground }]}>{post.studyProgress.completed}</Text>
            </View>
            <View style={styles.progressMetric}>
              <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>NEXT</Text>
              <Text style={[styles.progressValue, { color: colors.foreground }]}>{post.studyProgress.nextStep}</Text>
            </View>
          </View>
        </View>
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

      {totalReactions > 0 && (
        <View style={styles.reactionTally}>
          <View style={styles.reactionTallyEmojis}>
            {REACTIONS.filter((r) => reactionState[r.key].length > 0).map((r) => (
              <Text key={r.key} style={styles.reactionTallyEmoji}>{r.emoji}</Text>
            ))}
          </View>
          <Text style={[styles.reactionTallyCount, { color: colors.mutedForeground }]}>{totalReactions}</Text>
        </View>
      )}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Actions */}
      <View style={styles.actions}>
        {/* Like — tap for Like, long-press for reaction picker */}
        <TouchableOpacity
          style={styles.action}
          onPress={handleLikeTap}
          onLongPress={handleLikeLongPress}
          delayLongPress={350}
          activeOpacity={0.7}
        >
          {activeReaction === "like" ? (
            // Filled heart when "Like" is active
            <Icon name="heart" size={20} color={colors.primary} />
          ) : activeReaction ? (
            // Emoji for Insightful / Congrats
            <Text style={styles.activeReactionEmoji}>
              {REACTIONS.find((r) => r.key === activeReaction)?.emoji}
            </Text>
          ) : (
            <Icon name="heart-outline" size={20} color={colors.mutedForeground} />
          )}
          <Text style={[styles.actionText, { color: activeReaction ? colors.primary : colors.mutedForeground }]}>
            {activeReaction ? REACTIONS.find((r) => r.key === activeReaction)?.label : "Like"}
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
        <TouchableOpacity style={styles.action} onPress={handleShare} activeOpacity={0.7}>
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

      {/* LinkedIn-style reaction picker */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          onPress={() => setPickerVisible(false)}
          activeOpacity={1}
        >
          <View style={[styles.pickerBubble, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: "#000" }]}>
            {REACTIONS.map((reaction) => {
              const active = activeReaction === reaction.key;
              return (
                <TouchableOpacity
                  key={reaction.key}
                  style={[styles.pickerOption, active && { backgroundColor: colors.primary + "18" }]}
                  onPress={() => { setPickerVisible(false); handleReaction(reaction.key); }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.pickerEmoji}>{reaction.emoji}</Text>
                  <Text style={[styles.pickerLabel, { color: active ? colors.primary : colors.mutedForeground }]}>
                    {reaction.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 12,
    marginVertical: 5,
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
    padding: 12,
    paddingBottom: 8,
  },
  authorRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  authorInfo: { marginLeft: 10 },
  authorName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  time: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  content: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 23,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  subject: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  divider: { height: 1, marginHorizontal: 14, marginTop: 6 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 5, minWidth: 0 },
  actionText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  // Reaction tally (compact summary above divider)
  reactionTally: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
  },
  reactionTallyEmojis: { flexDirection: "row", gap: -2 },
  reactionTallyEmoji: { fontSize: 13 },
  reactionTallyCount: { fontFamily: "Inter_400Regular", fontSize: 12 },

  // Active reaction emoji in action bar
  activeReactionEmoji: { fontSize: 18 },

  // Reaction picker modal
  pickerBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 80,
    paddingHorizontal: 16,
  },
  pickerBubble: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  pickerOption: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  pickerEmoji: { fontSize: 26 },
  pickerLabel: { fontFamily: "Inter_500Medium", fontSize: 10 },
  progressBox: {
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  progressTitle: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 8 },
  progressGrid: { flexDirection: "row", gap: 8 },
  progressMetric: { flex: 1, gap: 2 },
  progressLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, letterSpacing: 0.5 },
  progressValue: { fontFamily: "Inter_500Medium", fontSize: 12 },

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
  viewPeopleButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  viewPeopleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  peopleOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(4, 2, 18, 0.62)",
  },
  peopleSheet: {
    maxHeight: "78%",
    minHeight: 260,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#6B5FA0",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2D265A",
  },
  sheetTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  sheetSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 3,
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF0D",
    alignItems: "center",
    justifyContent: "center",
  },
  peopleList: {
    paddingVertical: 12,
    gap: 4,
  },
  peopleGroup: {
    gap: 2,
    marginBottom: 14,
  },
  groupLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  personName: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  noGroupVotes: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    paddingVertical: 6,
  },
  peopleEmpty: {
    flex: 1,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyPeopleText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
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
