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

async function imageToBase64(uri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 900 } }],
    { compress: 0.55, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!manipulated.base64) throw new Error("Image conversion failed.");
  return `data:image/jpeg;base64,${manipulated.base64}`;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

type MediaMode = "none" | "image" | "video";

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

  const [mediaMode, setMediaMode] = useState<MediaMode>("none");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoLink, setVideoLink] = useState("");

  const ytId = extractYouTubeId(videoLink);
  const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

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

  const clearMedia = () => {
    setMediaMode("none");
    setImageUri(null);
    setVideoLink("");
  };

  const handlePost = async () => {
    setError("");
    if (!user) { setError("You must be signed in to post."); return; }
    if (!content.trim()) { setError("Please write something first."); return; }
    if (mediaMode === "video" && videoLink && !ytId) {
      setError("Please enter a valid YouTube URL."); return;
    }

    setSubmitting(true);
    let imageUrl: string | null = null;
    let videoUrl: string | null = null;

    if (mediaMode === "image" && imageUri) {
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

    if (mediaMode === "video" && ytId) {
      videoUrl = `https://www.youtube.com/watch?v=${ytId}`;
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
        videoUrl,
        mediaUrl: null,
        mediaType: imageUrl ? "image" : videoUrl ? "video" : null,
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

        {/* Media type selector — shown when no media chosen yet */}
        {mediaMode === "none" && (
          <View style={styles.mediaRow}>
            <TouchableOpacity
              style={[styles.mediaBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => { setMediaMode("image"); pickImage(); }}
            >
              <Icon name="image" size={20} color={colors.primary} />
              <Text style={[styles.mediaBtnText, { color: colors.foreground }]}>Add Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mediaBtn, { backgroundColor: colors.muted, borderColor: "#EF4444" + "55" }]}
              onPress={() => setMediaMode("video")}
            >
              <Icon name="youtube" size={20} color="#EF4444" />
              <Text style={[styles.mediaBtnText, { color: colors.foreground }]}>Add Video</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Image preview */}
        {mediaMode === "image" && (
          <View style={styles.previewWrap}>
            {processing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator color="#F59E0B" size="large" />
                <Text style={styles.processingText}>Compressing image...</Text>
              </View>
            )}
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.mediaPreview} resizeMode="cover" />
            )}
            <TouchableOpacity style={styles.removeMedia} onPress={clearMedia}>
              <Icon name="x-circle" size={26} color="#EF4444" />
            </TouchableOpacity>
            {!imageUri && !processing && (
              <TouchableOpacity style={styles.rePickBtn} onPress={pickImage}>
                <Icon name="image" size={18} color={colors.primary} />
                <Text style={[styles.mediaBtnText, { color: colors.foreground }]}>Choose Image</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* YouTube video input */}
        {mediaMode === "video" && (
          <View style={[styles.videoInputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.videoInputHeader}>
              <Icon name="youtube" size={18} color="#EF4444" />
              <Text style={[styles.videoInputTitle, { color: colors.foreground }]}>YouTube Video</Text>
              <TouchableOpacity onPress={clearMedia} style={{ marginLeft: "auto" }}>
                <Icon name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={[styles.linkInputWrap, { backgroundColor: colors.muted, borderColor: ytId ? "#10B981" : colors.border }]}>
              <Icon name="link" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.linkInput, { color: colors.foreground }]}
                placeholder="Paste YouTube URL..."
                placeholderTextColor={colors.mutedForeground}
                value={videoLink}
                onChangeText={setVideoLink}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {!!ytId && <Icon name="check-circle" size={16} color="#10B981" />}
            </View>

            {/* Thumbnail preview */}
            {ytThumb && (
              <View style={styles.thumbWrap}>
                <Image source={{ uri: ytThumb }} style={styles.ytThumb} resizeMode="cover" />
                <View style={styles.playOverlay}>
                  <View style={styles.playBtn}>
                    <Icon name="play" size={22} color="#fff" />
                  </View>
                </View>
                <View style={[styles.ytBadge, { backgroundColor: "#EF444488" }]}>
                  <Icon name="youtube" size={12} color="#fff" />
                  <Text style={styles.ytBadgeText}>YouTube</Text>
                </View>
              </View>
            )}

            {!!videoLink && !ytId && (
              <Text style={styles.ytHint}>Enter a valid YouTube link (youtube.com or youtu.be)</Text>
            )}
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

  mediaRow: { flexDirection: "row", gap: 12 },
  mediaBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: "dashed" },
  mediaBtnText: { fontSize: 14, fontWeight: "600" },

  previewWrap: { borderRadius: 14, overflow: "hidden", minHeight: 180, backgroundColor: "#00000022", alignItems: "center", justifyContent: "center" },
  mediaPreview: { width: "100%", height: 220 },
  processingOverlay: { position: "absolute", inset: 0, zIndex: 10, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", gap: 10 },
  processingText: { color: "#F59E0B", fontWeight: "600", fontSize: 14 },
  removeMedia: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 14, zIndex: 20 },
  rePickBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 20 },

  videoInputCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  videoInputHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  videoInputTitle: { fontSize: 15, fontWeight: "600" },
  linkInputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 11 },
  linkInput: { flex: 1, fontSize: 14 },

  thumbWrap: { borderRadius: 12, overflow: "hidden", height: 180 },
  ytThumb: { width: "100%", height: "100%" },
  playOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" },
  playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(239,68,68,0.88)", alignItems: "center", justifyContent: "center" },
  ytBadge: { position: "absolute", bottom: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ytBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  ytHint: { color: "#EF4444", fontSize: 12 },

  subjectChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  subjectText: { fontSize: 13 },
  xpNote: { padding: 12, borderRadius: 10, alignItems: "center" },
  xpNoteText: { fontSize: 13, fontWeight: "600" },
});
