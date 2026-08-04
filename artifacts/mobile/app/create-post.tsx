import { Icon } from "@/components/Icon";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
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
  { value: "progress", label: "Study Log", icon: "activity" },
  { value: "poll", label: "Poll", icon: "bar-chart-2" },
  { value: "code", label: "Code", icon: "code" },
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
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

  // Simulate progress
  let fakeProgress = 0;
  const progressInterval = setInterval(() => {
    fakeProgress = Math.min(fakeProgress + 6, 88);
    onProgress?.(fakeProgress);
  }, 700);

  try {
    if (Platform.OS === "web") {
      // On web: fetch the file as a blob, then upload via fetch with FormData
      const blobRes = await fetch(uri);
      const blob = await blobRes.blob();
      const formData = new FormData();
      formData.append("file", blob, "video.mp4");
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();
      clearInterval(progressInterval);
      if (!res.ok) throw new Error(`Upload failed: ${res.status} ${JSON.stringify(data)}`);
      onProgress?.(100);
      return data.secure_url as string;
    } else {
      // On native: use FileSystem.uploadAsync (properly reads file from device)
      const result = await FileSystem.uploadAsync(endpoint, uri, {
        httpMethod: "POST",
        uploadType: 1, // MULTIPART
        fieldName: "file",
        parameters: { upload_preset: UPLOAD_PRESET },
      });
      clearInterval(progressInterval);
      const data = JSON.parse(result.body);
      if (result.status !== 200) {
        throw new Error(`Upload failed: ${result.status} ${result.body}`);
      }
      onProgress?.(100);
      return data.secure_url as string;
    }
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
  const { getToken, userId: clerkUserId } = useClerkAuth();
  const { user, profile, addXP } = useAuth();

  const [content, setContent] = useState("");
  const [type, setType] = useState<"note" | "question" | "tip" | "poll" | "code" | "progress">("note");
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  const [mediaMode, setMediaMode] = useState<MediaMode>("none");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoThumb, setVideoThumb] = useState<string | null>(null);

  // Poll state
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  // Code block state
  const [codeLanguage, setCodeLanguage] = useState("");
  const [codeContent, setCodeContent] = useState("");
  const [progressDuration, setProgressDuration] = useState("");
  const [progressCompleted, setProgressCompleted] = useState("");
  const [progressNextStep, setProgressNextStep] = useState("");

  const CODE_LANGUAGES = [
    "Python", "JavaScript", "Java", "C++", "C#", "TypeScript",
    "HTML", "CSS", "SQL", "Go", "Rust", "Swift", "Kotlin", "Other",
  ];

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
    const authorId = user?.uid || clerkUserId;
    if (!authorId) {
      setError("Your account is still loading. Please wait a moment and try again.");
      return;
    }

    // Validate based on post type
    if (type === "poll") {
      if (!pollQuestion.trim()) { setError("Please enter a poll question."); return; }
      const validOptions = pollOptions.filter((o) => o.trim());
      if (validOptions.length < 2) { setError("Please add at least 2 poll options."); return; }
    } else if (type === "code") {
      if (!codeContent.trim()) { setError("Please enter your code."); return; }
    } else if (type === "progress") {
      if (!content.trim() || !progressDuration.trim() || !progressCompleted.trim() || !progressNextStep.trim()) {
        setError("Add your update, study time, what you completed, and your next step.");
        return;
      }
    } else {
      if (!content.trim()) { setError("Please write something first."); return; }
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
      const authorName = profile?.displayName || user?.displayName || "Learner";
      const rawPhoto = profile?.photoURL || user?.photoURL || "";
      const authorPhoto = rawPhoto.startsWith("data:")
        ? `https://ui-avatars.com/api/?background=F59E0B&color=0D0B2B&name=${encodeURIComponent(authorName)}`
        : rawPhoto || `https://ui-avatars.com/api/?background=F59E0B&color=0D0B2B&name=${encodeURIComponent(authorName)}`;

      const postData: Record<string, any> = {
        authorId,
        authorName,
        authorPhoto,
        content: type === "poll" ? pollQuestion.trim() : type === "code" ? (codeContent.trim().slice(0, 50) + "...") : content.trim(),
        type,
        subject: subject || null,
        imageUrl,
        videoUrl,
        mediaUrl: null,
        mediaType: imageUrl ? "image" : videoUrl ? "video" : null,
        likes: [],
        savedBy: [],
        commentCount: 0,
      };

      if (type === "progress") {
        postData.studyProgress = {
          duration: progressDuration.trim(),
          completed: progressCompleted.trim(),
          nextStep: progressNextStep.trim(),
        };
      }

      // Add poll data
      if (type === "poll") {
        postData.poll = {
          question: pollQuestion.trim(),
          options: pollOptions
            .filter((o) => o.trim())
            .map((o) => ({ text: o.trim(), votes: [] })),
        };
      }

      // Add code block data
      if (type === "code") {
        postData.code = {
          language: codeLanguage || undefined,
          content: codeContent.trim(),
        };
      }

      const apiBase = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : "";
      const clerkToken = await getToken().catch(() => null);
      let createdThroughApi = false;

      if (apiBase && clerkToken) {
        const response = await fetch(`${apiBase}/api/posts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clerkToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postData),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error || `Post failed (${response.status}).`);
        }
        createdThroughApi = true;
      }

      if (!createdThroughApi && user) {
        await addDoc(collection(db, "community_posts"), {
          ...postData,
          createdAt: serverTimestamp(),
        });
      }

      if (!createdThroughApi && !user) {
        throw new Error(
          "Your account connection is still loading. Please wait a moment and try again.",
        );
      }

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

  const addPollOption = () => {
    if (pollOptions.length < 6) setPollOptions([...pollOptions, ""]);
  };

  const removePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const updatePollOption = (idx: number, value: string) => {
    const next = [...pollOptions];
    next[idx] = value;
    setPollOptions(next);
  };

  const canPost = () => {
    if (type === "poll") return pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2;
    if (type === "code") return codeContent.trim().length > 0;
    if (type === "progress") {
      return content.trim().length > 0
        && progressDuration.trim().length > 0
        && progressCompleted.trim().length > 0
        && progressNextStep.trim().length > 0;
    }
    return content.trim().length > 0;
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
        <TouchableOpacity onPress={handlePost} disabled={!canPost() || isPosting}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.postBtn, { opacity: !canPost() || isPosting ? 0.5 : 1 }]}
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

        {/* Content for regular posts; study logs use the structured editor below. */}
        {type !== "poll" && type !== "code" && type !== "progress" && (
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
        )}

        {/* Poll creation UI */}
        {type === "poll" && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>POLL QUESTION</Text>
            <TextInput
              style={[styles.contentInput, { minHeight: 56, backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Ask a question..."
              placeholderTextColor={colors.mutedForeground}
              value={pollQuestion}
              onChangeText={setPollQuestion}
              multiline={false}
            />
            <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 8 }]}>OPTIONS</Text>
            {pollOptions.map((opt, idx) => (
              <View key={idx} style={styles.pollOptionRow}>
                <TextInput
                  style={[styles.pollOptionInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                  placeholder={`Option ${idx + 1}`}
                  placeholderTextColor={colors.mutedForeground}
                  value={opt}
                  onChangeText={(v) => updatePollOption(idx, v)}
                />
                {pollOptions.length > 2 && (
                  <TouchableOpacity onPress={() => removePollOption(idx)} style={styles.pollRemoveBtn}>
                    <Icon name="x" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {pollOptions.length < 6 && (
              <TouchableOpacity style={styles.addOptionBtn} onPress={addPollOption}>
                <Icon name="plus" size={16} color={colors.primary} />
                <Text style={[styles.addOptionText, { color: colors.primary }]}>Add Option</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Code block creation UI */}
        {type === "code" && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>LANGUAGE (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {CODE_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langChip, { backgroundColor: codeLanguage === lang ? colors.primary : colors.muted, borderColor: codeLanguage === lang ? colors.primary : colors.border }]}
                  onPress={() => setCodeLanguage(codeLanguage === lang ? "" : lang)}
                >
                  <Text style={[styles.langChipText, { color: codeLanguage === lang ? colors.primaryForeground : colors.mutedForeground }]}>{lang}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 8 }]}>CODE</Text>
            <TextInput
              style={[styles.codeInput, { backgroundColor: "#0D0B2B", color: "#4ADE80", borderColor: colors.border }]}
              placeholder="Paste or write your code here..."
              placeholderTextColor="rgba(74,222,128,0.4)"
              value={codeContent}
              onChangeText={setCodeContent}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}

        {type === "progress" && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>STUDY UPDATE</Text>
            <TextInput
              style={[styles.contentInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
              placeholder="What did you study today?"
              placeholderTextColor={colors.mutedForeground}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.progressFormGrid}>
              <TextInput
                style={[styles.progressInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Time e.g. 45 min"
                placeholderTextColor={colors.mutedForeground}
                value={progressDuration}
                onChangeText={setProgressDuration}
              />
              <TextInput
                style={[styles.progressInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Completed"
                placeholderTextColor={colors.mutedForeground}
                value={progressCompleted}
                onChangeText={setProgressCompleted}
              />
            </View>
            <TextInput
              style={[styles.progressInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Next step"
              placeholderTextColor={colors.mutedForeground}
              value={progressNextStep}
              onChangeText={setProgressNextStep}
            />
          </View>
        )}

        {/* Media picker buttons — only when no media selected and not poll/code */}
        {mediaMode === "none" && type !== "poll" && type !== "code" && (
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

  // Poll styles
  pollOptionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  pollOptionInput: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  pollRemoveBtn: { padding: 6 },
  addOptionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, alignSelf: "flex-start" },
  addOptionText: { fontSize: 13, fontWeight: "600" },

  // Code styles
  langChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  langChipText: { fontSize: 12, fontWeight: "500" },
  codeInput: { borderRadius: 16, borderWidth: 1, padding: 16, minHeight: 200, fontSize: 14, lineHeight: 20, fontFamily: "monospace" },
  progressFormGrid: { flexDirection: "row", gap: 10 },
  progressInput: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
});
