import { Icon } from "@/components/Icon";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

async function imageToBase64(uri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 900 } }],
    { compress: 0.55, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!manipulated.base64) throw new Error("Image conversion failed.");
  return `data:image/jpeg;base64,${manipulated.base64}`;
}

async function uploadVideoToCloudinary(
  uri: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  // Simulate progress (FileSystem.uploadAsync doesn't expose upload progress)
  let fakeProgress = 0;
  const progressInterval = setInterval(() => {
    fakeProgress = Math.min(fakeProgress + 6, 88);
    onProgress?.(fakeProgress);
  }, 700);

  try {
    const result = await FileSystem.uploadAsync(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      uri,
      {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
        parameters: { upload_preset: UPLOAD_PRESET },
      }
    );
    clearInterval(progressInterval);
    const data = JSON.parse(result.body);
    if (result.status !== 200) {
      throw new Error(`Upload failed: ${result.status} ${result.body}`);
    }
    onProgress?.(100);
    return data.secure_url as string;
  } catch (e) {
    clearInterval(progressInterval);
    throw e;
  }
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  const [mediaMode, setMediaMode] = useState<MediaMode>("none");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoThumb, setVideoThumb] = useState<string | null>(null);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setMediaMode("image");
        setError("");
      } else {
        setMediaMode("none");
      }
    } catch {
      setError("Could not open image picker.");
      setMediaMode("none");
    }
  };

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow access to your media library.");
        setMediaMode("none");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 0.8,
        videoMaxDuration: 60,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setVideoUri(asset.uri);
        setVideoThumb(asset.uri);
        setMediaMode("video");
        setError("");
      } else {
        setMediaMode("none");
      }
    } catch {
      setError("Could not open video picker.");
      setMediaMode("none");
    }
  };

  const clearMedia = () => {
    setMediaMode("none");
    setImageUri(null);
    setVideoUri(null);
    setVideoThumb(null);
    setUploadProgress(0);
  };

  const handlePost = async () => {
    setError("");
    if (!user) { setError("You must be signed in to post."); return; }
    if (!content.trim()) { setError("Please write something first."); return; }

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

    if (mediaMode === "video" && videoUri) {
      setProcessing(true);
      setUploadProgress(0);
      try {
        videoUrl = await uploadVideoToCloudinary(videoUri, (pct) => setUploadProgress(pct));
      } catch (e: any) {
        setProcessing(false);
        setSubmitting(false);
        const msg = e?.message ?? "";
        if (msg.includes("cloud_name is disabled")) {
          setError("Your Cloudinary account isn't activated yet. Please log in to cloudinary.com and complete any pending verification steps, then try again.");
        } else if (msg.includes("401")) {
          setError("Cloudinary authentication failed. Check your cloud name and upload preset are correct.");
        } else {
          setError("Video upload failed: " + msg);
        }
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

        {/* Media picker buttons — only when no media selected */}
        {mediaMode === "none" && (
          <View style={styles.mediaRow}>
            <TouchableOpacity
              style={[styles.mediaBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={pickImage}
            >
              <Icon name="image" size={20} color={colors.primary} />
              <Text style={[styles.mediaBtnText, { color: colors.foreground }]}>Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mediaBtn, { backgroundColor: colors.muted, borderColor: "#A855F755" }]}
              onPress={() => { setMediaMode("video"); pickVideo(); }}
            >
              <Icon name="video-camera" size={20} color="#A855F7" />
              <Text style={[styles.mediaBtnText, { color: colors.foreground }]}>Video</Text>
              <Text style={[styles.mediaBtnSub, { color: colors.mutedForeground }]}>up to 60s</Text>
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
          </View>
        )}

        {/* Video preview */}
        {mediaMode === "video" && (
          <View style={styles.previewWrap}>
            {processing ? (
              <View style={styles.videoUploadOverlay}>
                <ActivityIndicator color="#A855F7" size="large" />
                <Text style={styles.processingText}>
                  {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : "Preparing video..."}
                </Text>
                {uploadProgress > 0 && (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${uploadProgress}%` as any, backgroundColor: "#A855F7" }]} />
                  </View>
                )}
              </View>
            ) : videoUri ? (
              <>
                {/* Show first-frame thumbnail — Video element for native preview */}
                <View style={styles.videoThumbWrap}>
                  <Image
                    source={{ uri: videoUri }}
                    style={styles.mediaPreview}
                    resizeMode="cover"
                  />
                  <View style={styles.videoPlayBadge}>
                    <Icon name="play" size={20} color="#fff" />
                    <Text style={styles.videoReadyText}>Video ready</Text>
                  </View>
                </View>
              </>
            ) : (
              <TouchableOpacity style={styles.rePickBtn} onPress={pickVideo}>
                <Icon name="video-camera" size={22} color="#A855F7" />
                <Text style={[styles.mediaBtnText, { color: colors.foreground }]}>Choose Video</Text>
              </TouchableOpacity>
            )}
            {!processing && (
              <TouchableOpacity style={styles.removeMedia} onPress={clearMedia}>
                <Icon name="x-circle" size={26} color="#EF4444" />
              </TouchableOpacity>
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
  mediaBtnSub: { fontSize: 11 },

  previewWrap: { borderRadius: 14, overflow: "hidden", minHeight: 200, backgroundColor: "#00000022", alignItems: "center", justifyContent: "center" },
  mediaPreview: { width: "100%", height: 220 },
  videoThumbWrap: { width: "100%", height: 220 },
  processingOverlay: { padding: 32, alignItems: "center", gap: 12, width: "100%" },
  videoUploadOverlay: { padding: 32, alignItems: "center", gap: 12, width: "100%" },
  processingText: { color: "#F59E0B", fontWeight: "600", fontSize: 14 },
  progressBar: { width: "80%", height: 6, backgroundColor: "#2D2080", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  videoPlayBadge: { position: "absolute", bottom: 10, left: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(168,85,247,0.85)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  videoReadyText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  removeMedia: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 14, zIndex: 20 },
  rePickBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 24 },

  subjectChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  subjectText: { fontSize: 13 },
  xpNote: { padding: 12, borderRadius: 10, alignItems: "center" },
  xpNoteText: { fontSize: 13, fontWeight: "600" },
});
