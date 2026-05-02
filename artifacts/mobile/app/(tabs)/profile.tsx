import { Icon } from "@/components/Icon";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { doc, setDoc } from "firebase/firestore";
import { useTheme } from "@/context/ThemeContext";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { Post, PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { XPStreakBadge } from "@/components/XPStreakBadge";

const ALL_SUBJECTS = [
  "Math", "Science", "History", "English", "Physics",
  "Chemistry", "Biology", "Computer Science", "Economics", "Art",
  "Literature", "Geography", "Psychology", "Music", "Other",
];

const STUDY_GOALS = [
  "Ace my exams", "Build a habit", "Learn a new skill",
  "Improve grades", "Prep for college", "Personal growth",
];

async function pickAndConvertToBase64(
  options: ImagePicker.ImagePickerOptions,
  maxWidth: number,
  maxHeight: number
): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]?.uri) return null;
  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: maxWidth, height: maxHeight } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!manipulated.base64) throw new Error("Image conversion failed.");
  return `data:image/jpeg;base64,${manipulated.base64}`;
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, user, refreshProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [tab, setTab] = useState<"posts" | "saved">("posts");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Inline edit state
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameText, setNameText] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Subject & goal selection
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState("");
  const [subjectsChanged, setSubjectsChanged] = useState(false);

  useEffect(() => {
    if (profile) {
      setBioText(profile.bio || "");
      setNameText(profile.displayName || "");
      setSelectedSubjects(profile.subjects || []);
      setSelectedGoal((profile as any).studyGoal || "");
    }
  }, [profile?.uid]);

  useEffect(() => {
    if (!user) return;
    const fetchPosts = async () => {
      try {
        const toPost = (d: any): Post => ({
          id: d.id,
          ...(d.data() as Omit<Post, "id">),
          createdAt: d.data()["createdAt"]?.toMillis?.() ?? Date.now(),
        });
        const sort = (arr: Post[]) => arr.sort((a, b) => b.createdAt - a.createdAt);
        const [snap, savedSnap] = await Promise.all([
          getDocs(query(collection(db, "community_posts"), where("authorId", "==", user.uid))),
          getDocs(query(collection(db, "community_posts"), where("savedBy", "array-contains", user.uid))),
        ]);
        setPosts(sort(snap.docs.map(toPost)));
        setSavedPosts(sort(savedSnap.docs.map(toPost)));
      } catch (e) {
        console.warn("fetchPosts error:", e);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchPosts();
  }, [user]);

  const pickAvatar = async () => {
    if (!user || uploadingAvatar) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await pickAndConvertToBase64(
        { mediaTypes: ["images"] as any, allowsEditing: true, aspect: [1, 1], quality: 1 },
        300, 300
      );
      if (dataUrl) {
        await setDoc(doc(db, "users", user.uid), { photoURL: dataUrl }, { merge: true });
        await refreshProfile();
      }
    } catch (e: any) {
      Alert.alert("Photo failed", e?.message || "Could not process photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickBanner = async () => {
    if (!user || uploadingBanner) return;
    setUploadingBanner(true);
    try {
      const dataUrl = await pickAndConvertToBase64(
        { mediaTypes: ["images"] as any, allowsEditing: true, aspect: [16, 9], quality: 1 },
        900, 400
      );
      if (dataUrl) {
        await setDoc(doc(db, "users", user.uid), { bannerUrl: dataUrl }, { merge: true });
        await refreshProfile();
      }
    } catch (e: any) {
      Alert.alert("Banner failed", e?.message || "Could not process banner.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const saveProfileField = async (fields: Record<string, any>) => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await setDoc(doc(db, "users", user.uid), fields, { merge: true });
      await refreshProfile();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Could not save. Try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleSubject = async (s: string) => {
    const next = selectedSubjects.includes(s)
      ? selectedSubjects.filter((x) => x !== s)
      : [...selectedSubjects, s];
    setSelectedSubjects(next);
    setSubjectsChanged(true);
    await saveProfileField({ subjects: next });
  };

  const selectGoal = async (g: string) => {
    const next = selectedGoal === g ? "" : g;
    setSelectedGoal(next);
    await saveProfileField({ studyGoal: next });
  };

  const topPad = insets.top;
  const botPad = 70 + insets.bottom;
  const BANNER_HEIGHT = 160;
  const displayPosts = tab === "posts" ? posts : savedPosts;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        data={displayPosts}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: botPad }}
        ListHeaderComponent={
          <View>
            {/* ── Banner ── */}
            <View style={{ height: BANNER_HEIGHT + topPad, position: "relative" }}>
              <View style={{ height: BANNER_HEIGHT + topPad, overflow: "hidden" }}>
                {profile?.bannerUrl ? (
                  <Image
                    source={{ uri: profile.bannerUrl }}
                    style={[StyleSheet.absoluteFill, { marginTop: topPad }]}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.purpleStart, colors.purpleEnd]}
                    style={[StyleSheet.absoluteFill, { marginTop: topPad }]}
                  />
                )}
              </View>

              {/* Theme toggle — top right */}
              <TouchableOpacity
                style={[styles.cornerBtn, { top: topPad + 10, right: 12 }]}
                onPress={toggleTheme}
              >
                <Icon name={isDark ? "sun" : "moon"} size={16} color="#fff" />
              </TouchableOpacity>

              {/* Banner camera — bottom right of banner */}
              <TouchableOpacity
                style={[styles.cornerBtn, { bottom: 10, right: 12 }]}
                onPress={pickBanner}
                disabled={uploadingBanner}
              >
                {uploadingBanner
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Icon name="camera" size={15} color="#fff" />}
              </TouchableOpacity>

              {/* Avatar — bottom left overlapping banner */}
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={pickAvatar}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <View style={[styles.avatarRing, { borderColor: colors.card, backgroundColor: colors.muted }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  <>
                    <View style={[styles.avatarRing, { borderColor: colors.card }]}>
                      <UserAvatar
                        photoURL={profile?.photoURL}
                        displayName={profile?.displayName}
                        size={80}
                      />
                    </View>
                    <View style={[styles.editAvatarBadge, { backgroundColor: colors.primary }]}>
                      <Icon name="camera" size={10} color="#fff" />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* ── Info block ── */}
            <View style={[styles.infoBlock, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              {/* Name row */}
              <View style={styles.nameRow}>
                {editingName ? (
                  <TextInput
                    style={[styles.nameInput, { color: colors.foreground, borderBottomColor: colors.primary }]}
                    value={nameText}
                    onChangeText={setNameText}
                    autoFocus
                    returnKeyType="done"
                    onBlur={async () => {
                      setEditingName(false);
                      if (nameText.trim() && nameText !== profile?.displayName) {
                        await saveProfileField({ displayName: nameText.trim() });
                      }
                    }}
                    onSubmitEditing={async () => {
                      setEditingName(false);
                      if (nameText.trim() && nameText !== profile?.displayName) {
                        await saveProfileField({ displayName: nameText.trim() });
                      }
                    }}
                  />
                ) : (
                  <TouchableOpacity onPress={() => setEditingName(true)} style={styles.nameTouch}>
                    <Text style={[styles.name, { color: colors.foreground }]}>
                      {profile?.displayName || "Tap to set name"}
                    </Text>
                    <Icon name="edit-2" size={13} color={colors.mutedForeground} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.email, { color: colors.mutedForeground }]}>{profile?.email || ""}</Text>

              {/* Bio */}
              {editingBio ? (
                <View style={[styles.bioEditWrap, { borderColor: colors.primary, backgroundColor: colors.muted }]}>
                  <TextInput
                    style={[styles.bioInput, { color: colors.foreground }]}
                    value={bioText}
                    onChangeText={setBioText}
                    multiline
                    autoFocus
                    placeholder="Write your bio..."
                    placeholderTextColor={colors.mutedForeground}
                    maxLength={160}
                  />
                  <View style={styles.bioActions}>
                    <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{bioText.length}/160</Text>
                    <TouchableOpacity
                      style={[styles.saveBioBtn, { backgroundColor: colors.primary }]}
                      onPress={async () => {
                        setEditingBio(false);
                        await saveProfileField({ bio: bioText.trim() });
                      }}
                    >
                      {savingProfile
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.saveBioText}>Save</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setEditingBio(true)} style={styles.bioTouch}>
                  <Text style={[styles.bioDisplay, { color: profile?.bio ? colors.foreground : colors.mutedForeground }]}>
                    {profile?.bio || "Tap to add a bio..."}
                  </Text>
                  <Icon name="edit-2" size={11} color={colors.mutedForeground} style={{ marginLeft: 4, marginTop: 2 }} />
                </TouchableOpacity>
              )}
            </View>

            {/* ── XP / Streak ── */}
            <View style={{ paddingVertical: 12 }}>
              {profile && <XPStreakBadge xp={profile.xp} streak={profile.streak} />}
            </View>

            {/* ── My Subjects ── */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Icon name="book-open" size={15} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Subjects</Text>
              </View>
              <View style={styles.chipWrap}>
                {ALL_SUBJECTS.map((s) => {
                  const active = selectedSubjects.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, { backgroundColor: active ? colors.primary : colors.muted, borderColor: active ? colors.primary : colors.border }]}
                      onPress={() => toggleSubject(s)}
                    >
                      <Text style={[styles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Study Goal ── */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Icon name="target" size={15} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Study Goal</Text>
              </View>
              <View style={styles.chipWrap}>
                {STUDY_GOALS.map((g) => {
                  const active = selectedGoal === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.chip, { backgroundColor: active ? colors.accent : colors.muted, borderColor: active ? colors.accent : colors.border }]}
                      onPress={() => selectGoal(g)}
                    >
                      <Text style={[styles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>{g}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Posts / Saved tabs ── */}
            <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
              {(["posts", "saved"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                  onPress={() => setTab(t)}
                >
                  <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
                    {t === "posts" ? "My Posts" : "Saved"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loadingPosts && <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />}
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} />}
        ListEmptyComponent={
          !loadingPosts ? (
            <View style={styles.empty}>
              <Icon
                name={tab === "posts" ? "file-text" : "bookmark"}
                size={36}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {tab === "posts" ? "No posts yet" : "No saved posts"}
              </Text>
            </View>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cornerBtn: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: { position: "absolute", bottom: -40, left: 16 },
  avatarRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, overflow: "hidden" },
  editAvatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBlock: {
    marginTop: 48,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  nameRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  nameTouch: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 20, fontWeight: "700", fontFamily: undefined },
  nameInput: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: undefined,
    flex: 1,
    borderBottomWidth: 1.5,
    paddingVertical: 2,
  },
  email: { fontSize: 12, fontFamily: undefined, marginBottom: 8, opacity: 0.7 },
  bioTouch: { flexDirection: "row", alignItems: "flex-start" },
  bioDisplay: { fontSize: 14, lineHeight: 20, fontFamily: undefined, flex: 1 },
  bioEditWrap: { borderWidth: 1.5, borderRadius: 10, padding: 10, marginTop: 4 },
  bioInput: { fontSize: 14, lineHeight: 20, fontFamily: undefined, minHeight: 60 },
  bioActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  charCount: { fontSize: 11, fontFamily: undefined },
  saveBioBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14 },
  saveBioText: { color: "#fff", fontSize: 13, fontFamily: undefined, fontWeight: "600" },
  section: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "600", fontFamily: undefined },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: undefined },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabLabel: { fontFamily: undefined, fontSize: 14 },
  empty: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { fontFamily: undefined, fontSize: 14 },
});
