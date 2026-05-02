import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
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
import { db, storage } from "@/lib/firebase";
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

export default function CreatePostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, addXP } = useAuth();
  const [content, setContent] = useState("");
  const [type, setType] = useState<"note" | "question" | "tip">("note");
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setMediaUri(result.assets[0].uri);
        setMediaType("image");
        setError("");
      }
    } catch {
      setError("Could not open image picker");
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 0.8,
        videoMaxDuration: 120,
      });
      if (!result.canceled && result.assets[0]) {
        setMediaUri(result.assets[0].uri);
        setMediaType("video");
        setError("");
      }
    } catch {
      setError("Could not open video picker");
    }
  };

  const uploadMedia = async (uri: string, mType: "image" | "video"): Promise<string> => {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const ext = mType === "image" ? "jpg" : "mp4";
    const storageRef = ref(storage, `posts/${user!.uid}/${Date.now()}.${ext}`);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  const handlePost = async () => {
    setError("");
    if (!user) { setError("You must be signed in to post"); return; }
    if (!content.trim()) { setError("Please write something first"); return; }

    setSubmitting(true);
    let mediaUrl: string | null = null;

    if (mediaUri && mediaType) {
      setUploading(true);
      try {
        mediaUrl = await uploadMedia(mediaUri, mediaType);
      } catch (e) {
        console.warn("Media upload failed:", e);
        // Continue posting without media
      }
      setUploading(false);
    }

    try {
      const authorName = profile?.displayName || user.displayName || "Learner";
      const authorPhoto = profile?.photoURL || user.photoURL ||
        `https://ui-avatars.com/api/?background=F59E0B&color=0D0B2B&name=${encodeURIComponent(authorName)}`;

      await addDoc(collection(db, "community_posts"), {
        authorId: user.uid,
        authorName,
        authorPhoto,
        content: content.trim(),
        type,
        subject: subject || null,
        mediaUrl,
        mediaType: mediaUrl ? mediaType : null,
        likes: [],
        savedBy: [],
        commentCount: 0,
        createdAt: serverTimestamp(),
      });
      addXP(10).catch(console.warn);
      router.back();
    } catch (e: any) {
      console.error("Post error:", e);
      const code = e?.code || "";
      if (code.includes("permission-denied")) {
        setError("Permission denied — go to Firebase Console → Firestore Database → Rules and set allow read, write: if true; for testing.");
      } else {
        setError(e?.message || "Failed to post. Make sure Firestore is set up.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 12 : 0);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Post</Text>
        <TouchableOpacity onPress={handlePost} disabled={!content.trim() || submitting}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.postBtn, { opacity: !content.trim() || submitting ? 0.5 : 1 }]}
          >
            {submitting ? <ActivityIndicator size="small" color="#0D0B2B" /> : <Text style={styles.postBtnText}>Post ✦</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {!!error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={15} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>POST TYPE</Text>
          <View style={styles.typeRow}>
            {POST_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeChip, { backgroundColor: type === t.value ? colors.primary : colors.muted, borderColor: type === t.value ? colors.primary : colors.border }]}
                onPress={() => setType(t.value)}
              >
                <Feather name={t.icon as any} size={14} color={type === t.value ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.typeChipText, { color: type === t.value ? colors.primaryForeground : colors.mutedForeground }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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

        {/* Media buttons */}
        <View style={styles.mediaRow}>
          <TouchableOpacity style={[styles.mediaBtn, { backgroundColor: colors.muted, borderColor: colors.border }]} onPress={pickImage}>
            <Feather name="image" size={18} color={colors.primary} />
            <Text style={[styles.mediaBtnText, { color: colors.mutedForeground }]}>Add Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mediaBtn, { backgroundColor: colors.muted, borderColor: colors.border }]} onPress={pickVideo}>
            <Feather name="video" size={18} color={colors.accent} />
            <Text style={[styles.mediaBtnText, { color: colors.mutedForeground }]}>Add Video</Text>
          </TouchableOpacity>
        </View>

        {/* Image preview */}
        {mediaUri && mediaType === "image" && (
          <View style={styles.previewWrap}>
            <Image source={{ uri: mediaUri }} style={styles.imagePreview} resizeMode="cover" />
            <TouchableOpacity style={styles.removeMedia} onPress={() => { setMediaUri(null); setMediaType(null); }}>
              <Feather name="x-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Video preview */}
        {mediaUri && mediaType === "video" && (
          <View style={[styles.videoPreview, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="film" size={28} color={colors.accent} />
            <Text style={[styles.videoText, { color: colors.foreground }]}>Video ready to upload</Text>
            <TouchableOpacity onPress={() => { setMediaUri(null); setMediaType(null); }}>
              <Feather name="x-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {uploading && (
          <View style={[styles.uploadRow, { backgroundColor: colors.muted }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.uploadText, { color: colors.mutedForeground }]}>Uploading media...</Text>
          </View>
        )}

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
  mediaRow: { flexDirection: "row", gap: 12 },
  mediaBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  mediaBtnText: { fontSize: 14 },
  previewWrap: { borderRadius: 12, overflow: "hidden" },
  imagePreview: { width: "100%", height: 200, borderRadius: 12 },
  removeMedia: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12 },
  videoPreview: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  videoText: { flex: 1, fontSize: 14 },
  uploadRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10 },
  uploadText: { fontSize: 13 },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  subjectText: { fontSize: 13 },
  xpNote: { padding: 12, borderRadius: 10, alignItems: "center" },
  xpNoteText: { fontSize: 13, fontWeight: "600" },
});
