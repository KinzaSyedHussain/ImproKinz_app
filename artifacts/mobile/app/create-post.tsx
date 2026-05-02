import { Icon } from "@/components/Icon";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  { value: "note", label: "Study Note", icon: "file-text" },
  { value: "question", label: "Question", icon: "help-circle" },
  { value: "tip", label: "Study Tip", icon: "zap" },
] as const;

const SUBJECTS = [
  "Math", "Science", "History", "English", "Physics",
  "Chemistry", "Biology", "Computer Science", "Economics", "Other",
];

// Compress image and return base64 data URL — no Firebase Storage needed
async function imageToBase64(uri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 900 } }],
    { compress: 0.55, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!manipulated.base64) throw new Error("Image conversion failed.");
  return `data:image/jpeg;base64,${manipulated.base64}`;
}

export default function CreatePostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, addXP } = useAuth();

  const [content, setContent] = useState("");
  const [type, setType] = useState<"note" | "question" | "tip">("note");
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setError("");
      }
    } catch {
      setError("Could not open image picker.");
    }
  };

  const handlePost = async () => {
    setError("");
    if (!user) { setError("You must be signed in to post."); return; }
    if (!content.trim()) { setError("Please write something first."); return; }

    setSubmitting(true);
    let imageUrl: string | null = null;

    if (imageUri) {
      setProcessing(true);
      try {
        imageUrl = await imageToBase64(imageUri);
      } catch (e: any) {
        setProcessing(false);
        setSubmitting(false);
        setError("Image processing failed: " + (e?.message ?? "unknown error"));
        return;
      }
      setProcessing(false);
    }

    try {
      const authorName = profile?.displayName || user.displayName || "Learner";
      const rawPhoto = profile?.photoURL || user.photoURL || "";
      const authorPhoto = rawPhoto.startsWith("data:")
        ? `https://ui-avatars.com/api/?background=F59E0B&color=0D0B2B&name=${encodeURIComponent(authorName)}`
        : rawPhoto || `https://ui-avatars.com/api/?background=F59E0B&color=0D0B2B&name=${encodeURIComponent(authorName)}`;

      await addDoc(collection(db, "community_posts"), {
        authorId: user.uid,
        authorName,
        authorPhoto,
        content: content.trim(),
        type,
        subject: subject || null,
        imageUrl,
        mediaUrl: null,
        mediaType: imageUrl ? "image" : null,
        likes: [],
        savedBy: [],
        commentCount: 0,
        createdAt: serverTimestamp(),
      });

      addXP(10).catch(console.warn);
      router.back();
    } catch (e: any) {
      const code = e?.code || "";
      if (code.includes("permission-denied")) {
        setError("Permission denied — update your Firestore rules to allow writes.");
      } else {
        setError(e?.message || "Failed to post. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 12 : 0);
  const isPosting = submitting || processing;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Post</Text>
        <TouchableOpacity onPress={handlePost} disabled={!content.trim() || isPosting}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.postBtn, { opacity: !content.trim() || isPosting ? 0.5 : 1 }]}
          >
            {isPosting
              ? <ActivityIndicator size="small" color="#0D0B2B" />
              : <Text style={styles.postBtnText}>Post ✦</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {!!error && (
          <View style={styles.errorBox}>
            <Icon name="alert-circle" size={15} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Post type */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>POST TYPE</Text>
          <View style={styles.typeRow}>
            {POST_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeChip, { backgroundColor: type === t.value ? colors.primary : colors.muted, borderColor: type === t.value ? colors.primary : colors.border }]}
                onPress={() => setType(t.value)}
              >
                <Icon name={t.icon as any} size={14} color={type === t.value ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.typeChipText, { color: type === t.value ? colors.primaryForeground : colors.mutedForeground }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content */}
        <TextInput
          style={[styles.contentInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          placeholder="Share your knowledge treasure..."
          placeholderTextColor={colors.mutedForeground}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          autoFocus
        />

        {/* Add photo button */}
        {!imageUri && (
          <TouchableOpacity
            style={[styles.photoBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={pickImage}
          >
            <Icon name="image" size={20} color={colors.primary} />
            <Text style={[styles.photoBtnText, { color: colors.foreground }]}>Add Photo</Text>
            <Text style={[styles.photoBtnSub, { color: colors.mutedForeground }]}>Stored directly — no Storage needed</Text>
          </TouchableOpacity>
        )}

        {/* Image preview */}
        {!!imageUri && (
          <View style={styles.previewWrap}>
            {processing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator color="#F59E0B" size="large" />
                <Text style={styles.processingText}>Compressing image...</Text>
              </View>
            )}
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
            <TouchableOpacity style={styles.removeMedia} onPress={() => setImageUri(null)}>
              <Icon name="x-circle" size={26} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Subject */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>SUBJECT (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {SUBJECTS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.subjectChip, { backgroundColor: subject === s ? colors.primary : colors.muted, borderColor: subject === s ? colors.primary : colors.border }]}
                onPress={() => setSubject(subject === s ? "" : s)}
              >
                <Text style={[styles.subjectText, { color: subject === s ? colors.primaryForeground : colors.mutedForeground }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.xpNote, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.xpNoteText, { color: colors.primary }]}>✦ Earn +10 XP for sharing your knowledge!</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  postBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, minWidth: 64, alignItems: "center", justifyContent: "center" },
  postBtnText: { color: "#0D0B2B", fontSize: 14, fontWeight: "700" },
  scrollContent: { padding: 16, gap: 16 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, backgroundColor: "rgba(239,68,68,0.12)", borderWidth: 1, borderColor: "rgba(239,68,68,0.35)" },
  errorText: { color: "#EF4444", fontSize: 13, flex: 1, lineHeight: 18 },
  section: { gap: 10 },
  label: { fontSize: 11, letterSpacing: 1, fontWeight: "600" },
  typeRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  typeChipText: { fontSize: 13 },
  contentInput: { borderRadius: 16, borderWidth: 1, padding: 16, minHeight: 140, fontSize: 16, lineHeight: 24 },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: "dashed" },
  photoBtnText: { fontSize: 15, fontWeight: "600", flex: 1 },
  photoBtnSub: { fontSize: 11 },
  previewWrap: { borderRadius: 14, overflow: "hidden", minHeight: 180 },
  imagePreview: { width: "100%", height: 220 },
  processingOverlay: { position: "absolute", inset: 0, zIndex: 10, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", gap: 10 },
  processingText: { color: "#F59E0B", fontWeight: "600", fontSize: 14 },
  removeMedia: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 14 },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  subjectText: { fontSize: 13 },
  xpNote: { padding: 12, borderRadius: 10, alignItems: "center" },
  xpNoteText: { fontSize: 13, fontWeight: "600" },
});
