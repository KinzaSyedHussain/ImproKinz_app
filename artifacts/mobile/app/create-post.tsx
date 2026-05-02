import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

const POST_TYPES = [
  { value: "note", label: "Study Note", icon: "file-text", color: "#4F46E5" },
  { value: "question", label: "Question", icon: "help-circle", color: "#F59E0B" },
  { value: "tip", label: "Study Tip", icon: "zap", color: "#10B981" },
] as const;

const SUBJECTS = [
  "Math", "Science", "History", "English", "Physics",
  "Chemistry", "Biology", "Computer Science", "Economics", "Other",
];

export default function CreatePostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, addXP } = useAuth();
  const [content, setContent] = useState("");
  const [type, setType] = useState<"note" | "question" | "tip">("note");
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePost = async () => {
    if (!user || !profile || !content.trim()) {
      Alert.alert("Error", "Please write something first");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "posts"), {
        authorId: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: content.trim(),
        type,
        subject: subject || null,
        likes: [],
        savedBy: [],
        commentCount: 0,
        createdAt: serverTimestamp(),
      });
      await addXP(10);
      router.back();
    } catch (e: any) {
      Alert.alert("Error", "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Create Post
        </Text>
        <TouchableOpacity
          onPress={handlePost}
          disabled={!content.trim() || submitting}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.postBtn,
              { opacity: !content.trim() || submitting ? 0.5 : 1 },
            ]}
          >
            <Text style={styles.postBtnText}>
              {submitting ? "Posting..." : "Post"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            POST TYPE
          </Text>
          <View style={styles.typeRow}>
            {POST_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: type === t.value ? t.color : colors.muted,
                    borderColor: type === t.value ? t.color : colors.border,
                  },
                ]}
                onPress={() => setType(t.value)}
              >
                <Feather
                  name={t.icon as any}
                  size={14}
                  color={type === t.value ? "#fff" : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    {
                      color: type === t.value ? "#fff" : colors.mutedForeground,
                    },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TextInput
          style={[
            styles.contentInput,
            { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
          ]}
          placeholder="Share your study notes, ask a question, or give a tip..."
          placeholderTextColor={colors.mutedForeground}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          autoFocus
        />

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            SUBJECT (optional)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {SUBJECTS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.subjectChip,
                  {
                    backgroundColor:
                      subject === s ? colors.primary : colors.muted,
                    borderColor:
                      subject === s ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSubject(subject === s ? "" : s)}
              >
                <Text
                  style={[
                    styles.subjectText,
                    { color: subject === s ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View
          style={[styles.xpNote, { backgroundColor: colors.secondary }]}
        >
          <Text style={[styles.xpNoteText, { color: colors.primary }]}>
            ★ You'll earn +10 XP for sharing this post!
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  postBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  postBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  scrollContent: { padding: 16, gap: 16 },
  section: { gap: 10 },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
  },
  typeRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeChipText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  contentInput: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 160,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
  },
  subjectChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  subjectText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  xpNote: {
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  xpNoteText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
