import { Feather } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "./UserAvatar";

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  createdAt: number;
}

interface Props {
  postId: string;
  visible: boolean;
  onClose: () => void;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function CommentSheet({ postId, visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, profile, addXP } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    const q = query(
      collection(db, "community_posts", postId, "comments"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data: Comment[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Comment, "id">),
        createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
      }));
      setComments(data);
    });
    return unsub;
  }, [postId, visible]);

  const handleSubmit = async () => {
    if (!user || !profile || !text.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "community_posts", postId, "comments"), {
        authorId: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "community_posts", postId), {
        commentCount: increment(1),
      });
      await addXP(5);
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Comments</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <UserAvatar
                photoURL={item.authorPhoto}
                displayName={item.authorName}
                size={34}
              />
              <View style={[styles.bubble, { backgroundColor: colors.muted }]}>
                <Text style={[styles.commentAuthor, { color: colors.foreground }]}>
                  {item.authorName}
                </Text>
                <Text style={[styles.commentText, { color: colors.foreground }]}>
                  {item.text}
                </Text>
                <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>
                  {timeAgo(item.createdAt)}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No comments yet. Be the first!
              </Text>
            </View>
          }
        />

        <View
          style={[
            styles.inputRow,
            {
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 8,
              backgroundColor: colors.card,
            },
          ]}
        >
          <UserAvatar
            photoURL={profile?.photoURL}
            displayName={profile?.displayName}
            size={34}
          />
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { backgroundColor: colors.muted, color: colors.foreground },
            ]}
            placeholder="Write a comment..."
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: text.trim() ? colors.primary : colors.muted },
            ]}
            onPress={handleSubmit}
            disabled={!text.trim() || submitting}
          >
            <Feather name="send" size={16} color={text.trim() ? "#fff" : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontFamily: undefined, fontSize: 18 },
  list: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  comment: { flexDirection: "row", gap: 10, marginBottom: 12 },
  bubble: { flex: 1, borderRadius: 12, padding: 10, gap: 3 },
  commentAuthor: { fontFamily: undefined, fontSize: 13 },
  commentText: { fontFamily: undefined, fontSize: 14, lineHeight: 20 },
  commentTime: { fontFamily: undefined, fontSize: 11 },
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontFamily: undefined, fontSize: 14 },
  inputRow: {
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
