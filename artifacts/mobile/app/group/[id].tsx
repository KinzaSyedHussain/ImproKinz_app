import { Icon } from "@/components/Icon";
import { UserAvatar } from "@/components/UserAvatar";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { db } from "@/lib/firebase";
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  increment,
  updateDoc,
} from "firebase/firestore";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { StudyGroup } from "@/app/(tabs)/groups";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  type: string;
  likes: string[];
  createdAt: any;
  pinned?: boolean;
}

interface MemberProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  isMod: boolean;
  isCreator: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: any): string {
  let ms = Date.now();
  if (ts && typeof ts.toMillis === "function") ms = ts.toMillis();
  else if (ts && typeof ts === "object" && "_seconds" in ts) ms = ts._seconds * 1000;
  else if (typeof ts === "number") ms = ts;
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Group Post Card ──────────────────────────────────────────────────────────

function GroupPostCard({
  post,
  groupId,
  currentUid,
  isManager,
  isAdmin,
  isPinned,
  colors,
  onDelete,
  onPin,
  onReport,
}: {
  post: GroupPost;
  groupId: string;
  currentUid: string;
  isManager: boolean;
  isAdmin: boolean;
  isPinned: boolean;
  colors: any;
  onDelete: (postId: string) => void;
  onPin: (postId: string) => void;
  onReport: (postId: string) => void;
}) {
  const [liked, setLiked] = useState(post.likes?.includes(currentUid) ?? false);
  const [likeCount, setLikeCount] = useState(post.likes?.length ?? 0);
  const [liking, setLiking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLike = async () => {
    if (!currentUid || liking) return;
    setLiking(true);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));
    try {
      await updateDoc(doc(db, "groups", groupId, "posts", post.id), {
        likes: newLiked ? arrayUnion(currentUid) : arrayRemove(currentUid),
      });
    } catch {
      setLiked(!newLiked);
      setLikeCount((c) => c + (newLiked ? -1 : 1));
    } finally {
      setLiking(false);
    }
  };

  const handleLongPress = () => setMenuOpen(true);

  return (
    <Pressable
      style={[
        styles.postCard,
        { backgroundColor: colors.card, borderColor: isPinned ? colors.primary + "88" : colors.border },
      ]}
      onLongPress={handleLongPress}
      delayLongPress={400}
    >
      {isPinned && (
        <View style={styles.pinnedBadge}>
          <Icon name="pin" size={10} color={colors.primary} />
          <Text style={[styles.pinnedText, { color: colors.primary }]}>Pinned</Text>
        </View>
      )}

      <View style={styles.postHeader}>
        <UserAvatar
          photoURL={post.authorPhoto}
          displayName={post.authorName}
          size={36}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.postAuthor, { color: colors.foreground }]}>{post.authorName}</Text>
          <Text style={[styles.postTime, { color: colors.mutedForeground }]}>{timeAgo(post.createdAt)}</Text>
        </View>
        <TouchableOpacity onPress={() => setMenuOpen(true)}>
          <Icon name="more-horizontal" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.postContent, { color: colors.foreground }]}>{post.content}</Text>

      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionRow} onPress={handleLike}>
          <Icon
            name={liked ? "heart" : "heart"}
            size={16}
            color={liked ? "#EF4444" : colors.mutedForeground}
          />
          <Text style={[styles.actionText, { color: liked ? "#EF4444" : colors.mutedForeground }]}>
            {likeCount > 0 ? likeCount : "Like"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Context menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuSheet, { backgroundColor: colors.card }]}>
            <View style={styles.menuHandle} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuOpen(false); onReport(post.id); }}
            >
              <Icon name="flag" size={18} color={colors.destructive} />
              <Text style={[styles.menuItemText, { color: colors.destructive }]}>Report Post</Text>
            </TouchableOpacity>
            {(isManager || isAdmin) && (
              <>
                <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                {isManager && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { setMenuOpen(false); onPin(post.id); }}
                  >
                    <Icon name="pin" size={18} color={colors.primary} />
                    <Text style={[styles.menuItemText, { color: colors.primary }]}>
                      {isPinned ? "Unpin Post" : "Pin Post"}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setMenuOpen(false); onDelete(post.id); }}
                >
                  <Icon name="trash-2" size={18} color={colors.destructive} />
                  <Text style={[styles.menuItemText, { color: colors.destructive }]}>Delete Post</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  currentUid,
  isManager,
  isGroupCreator,
  colors,
  onRemove,
  onBan,
  onAppoint,
}: {
  member: MemberProfile;
  currentUid: string;
  isManager: boolean;
  isGroupCreator: boolean;
  colors: any;
  onRemove: (uid: string) => void;
  onBan: (uid: string) => void;
  onAppoint: (uid: string) => void;
}) {
  const isMe = member.uid === currentUid;

  return (
    <View style={[styles.memberRow, { borderBottomColor: colors.border }]}>
      <UserAvatar photoURL={member.photoURL} displayName={member.displayName} size={40} />
      <View style={{ flex: 1 }}>
        <View style={styles.memberNameRow}>
          <Text style={[styles.memberName, { color: colors.foreground }]}>{member.displayName}</Text>
          {member.isCreator && (
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + "33" }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>Creator</Text>
            </View>
          )}
          {member.isMod && !member.isCreator && (
            <View style={[styles.roleBadge, { backgroundColor: colors.accent + "33" }]}>
              <Text style={[styles.roleText, { color: colors.accent }]}>Mod</Text>
            </View>
          )}
        </View>
      </View>
      {isManager && !isMe && !member.isCreator && (
        <TouchableOpacity
          onPress={() =>
            Alert.alert(member.displayName, "Manage this member", [
              { text: "Cancel", style: "cancel" },
              !member.isMod
                ? { text: "Appoint Moderator", onPress: () => onAppoint(member.uid) }
                : { text: "Remove Moderator", onPress: () => onAppoint(member.uid) },
              { text: "Remove from Group", style: "destructive", onPress: () => onRemove(member.uid) },
              isGroupCreator
                ? { text: "Ban Member", style: "destructive", onPress: () => onBan(member.uid) }
                : null,
            ].filter(Boolean) as any[])
          }
        >
          <Icon name="more-horizontal" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Create Post Modal ────────────────────────────────────────────────────────

function CreatePostModal({
  visible,
  groupId,
  currentUid,
  authorName,
  authorPhoto,
  colors,
  onClose,
  onCreated,
  getToken,
}: {
  visible: boolean;
  groupId: string;
  currentUid: string;
  authorName: string;
  authorPhoto: string;
  colors: any;
  onClose: () => void;
  onCreated: (post: GroupPost) => void;
  getToken: () => Promise<string | null>;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !currentUid) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/groups/${groupId}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: content.trim(), authorName, authorPhoto }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const { postId } = await res.json();
      const newPost: GroupPost = {
        id: postId,
        authorId: currentUid,
        authorName,
        authorPhoto,
        content: content.trim(),
        type: "note",
        likes: [],
        createdAt: Date.now(),
        pinned: false,
      };
      onCreated(newPost);
      setContent("");
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.menuOverlay} onPress={onClose} />
        <View style={[styles.createSheet, { backgroundColor: colors.card }]}>
          <View style={styles.menuHandle} />
          <View style={styles.createHeader}>
            <Text style={[styles.createTitle, { color: colors.foreground }]}>New Post</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[
              styles.createInput,
              { color: colors.foreground, borderColor: colors.border },
            ]}
            placeholder="Share something with the group…"
            placeholderTextColor={colors.mutedForeground}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            autoFocus
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.createSubmit,
              { backgroundColor: content.trim() ? colors.accent : colors.muted },
            ]}
            onPress={handleSubmit}
            disabled={submitting || !content.trim()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createSubmitText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const REPORT_REASONS = ["Spam", "Harassment", "Misinformation", "Off-topic", "Inappropriate content"];

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId, getToken } = useClerkAuth();
  const { profile, isAdmin } = useAuth();
  const [reportGroupVisible, setReportGroupVisible] = useState(false);

  // ── API helper (manager/admin writes go through server-side auth) ───────────
  const apiCall = useCallback(
    async (path: string, method: string = "POST") => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [getToken],
  );

  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "about" | "members">("posts");
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberUid, setAddMemberUid] = useState("");
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  const currentUid = userId ?? "";

  // ── Load group from server (field-projected, membership-aware) ──────────────
  const fetchGroup = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/groups/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) { setPermissionDenied(true); return; }
      if (res.status === 404) { setGroup(null); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGroup(data.group as StudyGroup);
      setPermissionDenied(false);
    } catch (e) {
      console.warn("fetchGroup error:", e);
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  // ── Load posts from server (membership enforced server-side) ─────────────────
  const fetchPosts = useCallback(async () => {
    if (!id) return;
    setLoadingPosts(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/groups/${id}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch (e) {
      console.warn("fetchGroupPosts error:", e);
    } finally {
      setLoadingPosts(false);
    }
  }, [id, getToken]);

  useEffect(() => {
    if (tab === "posts" && group) fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, group?.id]);

  // ── Load members ─────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    if (!group || !group.members?.length) return;
    setLoadingMembers(true);
    try {
      const profiles = await Promise.all(
        group.members.slice(0, 50).map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, "profiles", uid));
            const data = snap.data() ?? {};
            return {
              uid,
              displayName: data.displayName || data.name || "Study User",
              photoURL: data.photoURL || undefined,
              isMod: group.moderators?.includes(uid) ?? false,
              isCreator: group.createdBy === uid,
            } as MemberProfile;
          } catch {
            return { uid, displayName: "Study User", isMod: false, isCreator: false };
          }
        }),
      );
      // Sort: creator first, then mods, then members
      profiles.sort((a, b) => {
        if (a.isCreator) return -1;
        if (b.isCreator) return 1;
        if (a.isMod && !b.isMod) return -1;
        if (!a.isMod && b.isMod) return 1;
        return 0;
      });
      setMembers(profiles);
    } catch (e) {
      console.warn("fetchMembers error:", e);
    } finally {
      setLoadingMembers(false);
    }
  }, [group]);

  useEffect(() => {
    if (tab === "members") fetchMembers();
  }, [tab, fetchMembers]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const isMember = group?.members?.includes(currentUid) ?? false;
  const isManager =
    !!currentUid &&
    !!group &&
    (group.createdBy === currentUid || (group.moderators?.includes(currentUid) ?? false));
  const isCreator = group?.createdBy === currentUid;

  // ── Join / Leave ──────────────────────────────────────────────────────────
  const toggleJoin = async () => {
    if (!group || !currentUid || joining) return;
    // Private groups are invite-only — members can leave, but non-members cannot self-join
    if (!isMember && group.isPublic === false) {
      Alert.alert(
        "Private Group",
        "This group is invite-only. Ask the creator or a moderator to add you.",
      );
      return;
    }
    setJoining(true);
    try {
      const ref = doc(db, "groups", group.id);
      if (isMember) {
        await updateDoc(ref, {
          members: arrayRemove(currentUid),
          memberCount: increment(-1),
        });
        // Re-fetch so UI reflects non-member state immediately
        await fetchGroup();
      } else {
        if (group.bannedUsers?.includes(currentUid)) {
          Alert.alert("Banned", "You have been banned from this group.");
          return;
        }
        await updateDoc(ref, {
          members: arrayUnion(currentUid),
          memberCount: increment(1),
        });
        // Re-fetch full group (now as member) and load posts
        await fetchGroup();
        fetchPosts();
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message);
    } finally {
      setJoining(false);
    }
  };

  // ── Manager actions ───────────────────────────────────────────────────────
  // All manager writes go through the API server, which validates the Clerk JWT
  // and checks group roles server-side before performing any Firestore write.

  const handleDeletePost = (postId: string) => {
    Alert.alert("Delete Post", "Remove this post from the group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // Admins use the admin endpoint; managers use the manager endpoint
            const path = isAdmin
              ? `/admin/groups/${id}/posts/${postId}`
              : `/groups/${id}/posts/${postId}`;
            await apiCall(path, "DELETE");
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            fetchGroup(); // Refresh postCount display
          } catch (e: any) {
            Alert.alert("Error", e?.message);
          }
        },
      },
    ]);
  };

  const handlePin = async (postId: string) => {
    if (!group) return;
    try {
      await apiCall(`/groups/${group.id}/posts/${postId}/pin`, "POST");
      // Re-fetch group to update pinnedPostIds (no longer using onSnapshot)
      fetchGroup();
    } catch (e: any) {
      Alert.alert("Error", e?.message);
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!group) return;
    try {
      await apiCall(`/groups/${group.id}/members/${uid}`, "DELETE");
      setMembers((prev) => prev.filter((m) => m.uid !== uid));
      fetchGroup(); // Refresh memberCount
    } catch (e: any) {
      Alert.alert("Error", e?.message);
    }
  };

  const handleBanMember = async (uid: string) => {
    if (!group) return;
    try {
      await apiCall(`/groups/${group.id}/members/${uid}/ban`, "POST");
      setMembers((prev) => prev.filter((m) => m.uid !== uid));
      fetchGroup(); // Refresh bannedUsers + memberCount
    } catch (e: any) {
      Alert.alert("Error", e?.message);
    }
  };

  const handleAppoint = async (uid: string) => {
    if (!group) return;
    try {
      await apiCall(`/groups/${group.id}/members/${uid}/mod`, "PATCH");
      fetchGroup(); // Refresh group data so moderators[] reflects the change
    } catch (e: any) {
      Alert.alert("Error", e?.message);
    }
  };

  // ── Report flow (post & group) ────────────────────────────────────────────
  const submitReport = async (
    targetType: "post" | "group",
    targetId: string,
    reason: string,
  ) => {
    if (!currentUid) return;
    setReportSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetType, targetId, reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      Alert.alert("Reported", "Thank you. Our team will review this.");
      setReportPostId(null);
      setReportGroupVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message);
    } finally {
      setReportSubmitting(false);
    }
  };

  // ── Add Member (manager only) ─────────────────────────────────────────────
  const handleAddMember = async () => {
    const uid = addMemberUid.trim();
    if (!uid || !group) return;
    setAddMemberLoading(true);
    try {
      await apiCall(`/groups/${group.id}/members`, "POST");
      // Re-fetch members to reflect change
      await fetchMembers();
      setAddMemberUid("");
      setShowAddMember(false);
      Alert.alert("Added", "User has been added to the group.");
    } catch (e: any) {
      Alert.alert("Error", e?.message);
    } finally {
      setAddMemberLoading(false);
    }
  };

  // Overriding apiCall body to include targetUid
  const addMemberCall = async () => {
    if (!group) return;
    const uid = addMemberUid.trim();
    if (!uid) return;
    setAddMemberLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/groups/${group.id}/members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetUid: uid }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      await fetchMembers();
      setAddMemberUid("");
      setShowAddMember(false);
      Alert.alert("Added", "User has been added to the group.");
    } catch (e: any) {
      Alert.alert("Error", e?.message);
    } finally {
      setAddMemberLoading(false);
    }
  };

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Firestore permission-denied (private group, non-member)
  if (permissionDenied) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.privateHeader,
            { paddingTop: insets.top + 10, backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Icon name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.privateBody}>
          <Icon name="lock" size={52} color={colors.mutedForeground} />
          <Text style={[styles.notFoundText, { color: colors.foreground, marginTop: 16 }]}>
            Private Group
          </Text>
          <Text style={[styles.privateDesc, { color: colors.mutedForeground }]}>
            This group is invite-only. Ask the creator or a moderator to add you.
          </Text>
          <TouchableOpacity
            style={[styles.backBtn2, { borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backBtn2Text, { color: colors.foreground }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Icon name="users-round" size={48} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Group not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Private group gate — bypass for admins (server already authorized them)
  const isMemberCheck = group.members?.includes(currentUid) ?? false;
  if (group.isPublic === false && !isMemberCheck && !isAdmin) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.privateHeader,
            { paddingTop: insets.top + 10, backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Icon name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.privateBody}>
          <Icon name="lock" size={52} color={colors.mutedForeground} />
          <Text style={[styles.notFoundText, { color: colors.foreground, marginTop: 16 }]}>
            Private Group
          </Text>
          <Text style={[styles.privateDesc, { color: colors.mutedForeground }]}>
            This group is invite-only. Ask the creator or a moderator to add you.
          </Text>
          <TouchableOpacity
            style={[styles.backBtn2, { borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backBtn2Text, { color: colors.foreground }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const pinnedPostIds = group.pinnedPostIds ?? [];

  // Sort posts: pinned first
  const sortedPosts = [...posts].sort((a, b) => {
    const aP = pinnedPostIds.includes(a.id) ? 0 : 1;
    const bP = pinnedPostIds.includes(b.id) ? 0 : 1;
    return aP - bP;
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[colors.purpleStart, colors.background]}
        style={[styles.header, { paddingTop: insets.top + 4 }]}
      >
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Icon name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {isManager && (
              <View style={[styles.managerBadge, { backgroundColor: colors.primary + "33" }]}>
                <Icon name="shield-check" size={12} color={colors.primary} />
                <Text style={[styles.managerText, { color: colors.primary }]}>Manager</Text>
              </View>
            )}
            {/* Group-level action menu — report visible to all non-manager members */}
            {isMember && !isManager && (
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => setReportGroupVisible(true)}
              >
                <Icon name="flag" size={18} color="#ffffff99" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.groupInfoRow}>
          <View style={[styles.iconBlock, { backgroundColor: group.iconColor + "33" }]}>
            <Text style={[styles.iconInitials, { color: group.iconColor }]}>
              {getInitials(group.name)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={[styles.groupMeta, { color: "#ffffff99" }]}>
              {group.memberCount || 0} members
              {group.tags?.length > 0 ? ` · ${group.tags.slice(0, 2).join(", ")}` : ""}
            </Text>
          </View>
          <TouchableOpacity
            onPress={toggleJoin}
            disabled={joining}
            style={[
              styles.joinBtn,
              isMember
                ? { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "#ffffff66" }
                : { backgroundColor: colors.primary },
            ]}
          >
            {joining ? (
              <ActivityIndicator size="small" color={isMember ? "#fff" : colors.primaryForeground} />
            ) : (
              <Text
                style={[styles.joinBtnText, { color: isMember ? "#fff" : colors.primaryForeground }]}
              >
                {isMember ? "Joined" : "Join"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View style={styles.tabRow}>
          {(["posts", "about", "members"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t)}
            >
              <Text
                style={[styles.tabLabel, { color: tab === t ? colors.primary : "#ffffff88" }]}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "members" ? ` (${group.memberCount || 0})` : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* ── Tab Content ── */}
      {tab === "posts" && (
        <FlatList
          data={sortedPosts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() =>
            isMember ? (
              <TouchableOpacity
                style={[styles.createPostBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowCreatePost(true)}
              >
                <Icon name="edit-3" size={16} color={colors.mutedForeground} />
                <Text style={[styles.createPostText, { color: colors.mutedForeground }]}>
                  Share something with the group…
                </Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item: post }) => (
            <GroupPostCard
              post={post}
              groupId={id as string}
              currentUid={currentUid}
              isManager={isManager}
              isAdmin={isAdmin}
              isPinned={pinnedPostIds.includes(post.id)}
              colors={colors}
              onDelete={handleDeletePost}
              onPin={handlePin}
              onReport={(postId) => setReportPostId(postId)}
            />
          )}
          ListEmptyComponent={() =>
            loadingPosts ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.emptyState}>
                <Icon name="message-square" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No posts yet</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {isMember ? "Be the first to post!" : "Join the group to post."}
                </Text>
              </View>
            )
          }
        />
      )}

      {tab === "about" && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.aboutSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>About</Text>
            <Text style={[styles.aboutText, { color: colors.foreground }]}>
              {group.description || "No description yet."}
            </Text>
          </View>

          {group.tags?.length > 0 && (
            <View style={[styles.aboutSection, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
              <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>Topics</Text>
              <View style={styles.tagsRow}>
                {group.tags.map((tag) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: colors.accent + "22", borderColor: colors.accent + "44" }]}>
                    <Text style={[styles.tagText, { color: colors.accent }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.aboutSection, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
            <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>
                  {group.memberCount || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Members</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>
                  {group.postCount || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.foreground }]}>
                  {group.isPublic !== false ? "Public" : "Private"}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Visibility</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {tab === "members" && (
        <FlatList
          data={loadingMembers ? [] : members}
          keyExtractor={(m) => m.uid}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() =>
            isManager ? (
              <TouchableOpacity
                style={[
                  styles.addMemberBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => setShowAddMember(true)}
              >
                <Icon name="user-plus" size={16} color={colors.accent} />
                <Text style={[styles.addMemberText, { color: colors.accent }]}>
                  Add Member by User ID
                </Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={() =>
            loadingMembers ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : null
          }
          renderItem={({ item: member }) => (
            <MemberRow
              member={member}
              currentUid={currentUid}
              isManager={isManager}
              isGroupCreator={isCreator}
              colors={colors}
              onRemove={handleRemoveMember}
              onBan={handleBanMember}
              onAppoint={handleAppoint}
            />
          )}
        />
      )}

      {/* Create Post FAB */}
      {tab === "posts" && isMember && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent, bottom: insets.bottom + 24 }]}
          onPress={() => setShowCreatePost(true)}
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreatePost}
        groupId={id as string}
        currentUid={currentUid}
        authorName={profile?.displayName || "Study User"}
        authorPhoto={profile?.photoURL || ""}
        colors={colors}
        onClose={() => setShowCreatePost(false)}
        onCreated={(post) => setPosts((prev) => [post, ...prev])}
        getToken={getToken}
      />

      {/* Add Member Modal (manager only — for private groups) */}
      <Modal
        visible={showAddMember}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMember(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.menuOverlay} onPress={() => setShowAddMember(false)} />
          <View style={[styles.createSheet, { backgroundColor: colors.card }]}>
            <View style={styles.menuHandle} />
            <View style={styles.createHeader}>
              <Text style={[styles.createTitle, { color: colors.foreground }]}>Add Member</Text>
              <TouchableOpacity onPress={() => setShowAddMember(false)}>
                <Icon name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.addMemberHint, { color: colors.mutedForeground }]}>
              Enter the Clerk user ID of the person you want to add. They can find it in their profile.
            </Text>
            <TextInput
              style={[
                styles.createInput,
                { color: colors.foreground, borderColor: colors.border },
              ]}
              placeholder="user_2abc123..."
              placeholderTextColor={colors.mutedForeground}
              value={addMemberUid}
              onChangeText={setAddMemberUid}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[
                styles.createSubmit,
                { backgroundColor: addMemberUid.trim() ? colors.accent : colors.muted },
              ]}
              onPress={addMemberCall}
              disabled={addMemberLoading || !addMemberUid.trim()}
            >
              {addMemberLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createSubmitText}>Add to Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={!!reportPostId}
        transparent
        animationType="slide"
        onRequestClose={() => setReportPostId(null)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setReportPostId(null)} />
        <View style={[styles.reportSheet, { backgroundColor: colors.card }]}>
          <View style={styles.menuHandle} />
          <Text style={[styles.reportTitle, { color: colors.foreground }]}>Report Post</Text>
          <Text style={[styles.reportSub, { color: colors.mutedForeground }]}>
            Why are you reporting this post?
          </Text>
          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[styles.reportOption, { borderColor: colors.border }]}
              onPress={() => submitReport("post", reportPostId!, reason)}
              disabled={reportSubmitting}
            >
              <Text style={[styles.reportOptionText, { color: colors.foreground }]}>{reason}</Text>
              {reportSubmitting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.reportCancel}
            onPress={() => setReportPostId(null)}
          >
            <Text style={[styles.reportCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Report Group Modal */}
      <Modal
        visible={reportGroupVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportGroupVisible(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setReportGroupVisible(false)} />
        <View style={[styles.reportSheet, { backgroundColor: colors.card }]}>
          <View style={styles.menuHandle} />
          <Text style={[styles.reportTitle, { color: colors.foreground }]}>Report Group</Text>
          <Text style={[styles.reportSub, { color: colors.mutedForeground }]}>
            Why are you reporting this group?
          </Text>
          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[styles.reportOption, { borderColor: colors.border }]}
              onPress={() => submitReport("group", id as string, reason)}
              disabled={reportSubmitting}
            >
              <Text style={[styles.reportOptionText, { color: colors.foreground }]}>{reason}</Text>
              {reportSubmitting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.reportCancel}
            onPress={() => setReportGroupVisible(false)}
          >
            <Text style={[styles.reportCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 0 },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  managerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  managerText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  groupInfoRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  iconBlock: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconInitials: { fontFamily: "Inter_700Bold", fontSize: 20 },
  groupName: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },
  groupMeta: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  joinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexShrink: 0,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  joinBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ffffff22" },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  // Post card
  postCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  pinnedBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  pinnedText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  postAuthor: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  postTime: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  postContent: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22, marginBottom: 12 },
  postActions: { flexDirection: "row", gap: 20 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  // Member row
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  memberName: { fontFamily: "Inter_500Medium", fontSize: 15 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  // About tab
  aboutSection: { borderRadius: 14, borderWidth: 1, padding: 16 },
  aboutLabel: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  aboutText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  statsRow: { flexDirection: "row" },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  // Create post
  createPostBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  createPostText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  // Empty state
  emptyState: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  // FAB
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  // Modals
  menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  menuSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    gap: 4,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ffffff33",
    alignSelf: "center",
    marginBottom: 16,
  },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  menuItemText: { fontFamily: "Inter_500Medium", fontSize: 16 },
  menuDivider: { height: 1 },
  // Create post modal
  createSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  createHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  createTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  createInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },
  createSubmit: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  createSubmitText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  // Report modal
  reportSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  reportTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 6 },
  reportSub: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 16 },
  reportOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  reportOptionText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  reportCancel: { paddingVertical: 14, alignItems: "center", marginTop: 8 },
  reportCancelText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  // Not found / private
  notFoundText: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 8 },
  privateHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  privateBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  privateDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 8,
  },
  backBtn2: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 20,
    borderWidth: 1,
  },
  backBtn2Text: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  reportGroupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  reportGroupText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  addMemberBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  addMemberText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  addMemberHint: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 12 },
});
