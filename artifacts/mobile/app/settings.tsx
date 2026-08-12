import { Icon } from "@/components/Icon";
import { useRouter } from "expo-router";
import { doc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { useUser } from "@clerk/clerk-expo";

const ALL_SUBJECTS = [
  "Math", "Science", "History", "English", "Physics",
  "Chemistry", "Biology", "Computer Science", "Economics", "Art",
  "Literature", "Geography", "Psychology", "Music", "Other",
];

const STUDY_GOALS = [
  "Ace my exams", "Build a habit", "Learn a new skill",
  "Improve grades", "Prep for college", "Personal growth",
];

const LEVELS = ["High School", "Undergraduate", "Graduate", "Self-taught", "Professional"];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, user, logOut, refreshProfile } = useAuth();
  const { isConfigured, isSubscribed } = useSubscription();
  const { isDark, toggleTheme } = useTheme();
  const { user: clerkUser } = useUser();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setBio(profile.bio || "");
      setSelectedSubjects(profile.subjects || []);
      setSelectedGoal((profile as any).studyGoal || "");
      setSelectedLevel((profile as any).level || "");
    }
  }, [profile?.uid]);

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
    setSaved(false);
  };

  const selectGoal = (g: string) => {
    setSelectedGoal((prev) => (prev === g ? "" : g));
    setSaved(false);
  };

  const selectLevel = (l: string) => {
    setSelectedLevel((prev) => (prev === l ? "" : l));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      Alert.alert("Name required", "Please enter your display name.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        subjects: selectedSubjects,
        studyGoal: selectedGoal,
        level: selectedLevel,
        updatedAt: serverTimestamp(),
      };
      // Write to 'profiles' — same collection the web app uses
      await setDoc(doc(db, "profiles", user.uid), payload, { merge: true });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account, profile, and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              // Remove Firestore profile
              if (user?.uid) {
                await deleteDoc(doc(db, "profiles", user.uid)).catch(() => {});
              }
              // Delete Clerk account (also invalidates session)
              await clerkUser?.delete();
              // Sign out local state
              await logOut().catch(() => {});
              router.replace("/auth");
            } catch (e: any) {
              Alert.alert(
                "Delete failed",
                e?.message || "Could not delete account. Please contact support@improkinz.com.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const S = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: insets.top + 8,
      paddingBottom: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    saveBtn: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: saved ? "#22C55E" : colors.primary,
    },
    saveBtnText: {
      color: "#fff",
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
    },
    content: { paddingHorizontal: 16, paddingBottom: insets.bottom + 40 },
    sectionTitle: {
      fontSize: 12,
      letterSpacing: 1,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      marginTop: 24,
      marginBottom: 10,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    field: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    fieldLabel: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      marginBottom: 4,
    },
    input: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      paddingVertical: 0,
    },
    bioInput: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      minHeight: 72,
      textAlignVertical: "top",
      paddingVertical: 2,
    },
    fieldDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 14 },
    charCount: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "right",
      marginTop: 4,
      marginRight: 14,
      marginBottom: 6,
    },
    chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 14 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    chipText: { fontSize: 13, fontFamily: "Inter_400Regular" },
    themeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    themeLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    themeLabel: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground },
    toggle: {
      width: 46,
      height: 26,
      borderRadius: 13,
      justifyContent: "center",
      paddingHorizontal: 2,
    },
    toggleKnob: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#fff",
    },
  });

  return (
    <KeyboardAvoidingView
      style={S.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Settings</Text>
        <TouchableOpacity style={S.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={S.saveBtnText}>{saved ? "Saved ✓" : "Save"}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        <View style={S.content}>

          {/* Profile info */}
          <Text style={S.sectionTitle}>PROFILE</Text>
          <View style={S.card}>
            <View style={S.field}>
              <Text style={S.fieldLabel}>DISPLAY NAME</Text>
              <TextInput
                style={S.input}
                value={displayName}
                onChangeText={(t) => { setDisplayName(t); setSaved(false); }}
                placeholder="Your name"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                maxLength={40}
              />
            </View>
            <View style={S.fieldDivider} />
            <View style={S.field}>
              <Text style={S.fieldLabel}>BIO</Text>
              <TextInput
                style={S.bioInput}
                value={bio}
                onChangeText={(t) => { setBio(t); setSaved(false); }}
                placeholder="Tell others about yourself..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={160}
              />
            </View>
            <Text style={S.charCount}>{bio.length}/160</Text>
          </View>

          {/* Subjects */}
          <Text style={S.sectionTitle}>MY SUBJECTS</Text>
          <View style={S.card}>
            <View style={S.chipWrap}>
              {ALL_SUBJECTS.map((s) => {
                const active = selectedSubjects.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      S.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.muted,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => toggleSubject(s)}
                  >
                    <Text style={[S.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Study level */}
          <Text style={S.sectionTitle}>STUDY LEVEL</Text>
          <View style={S.card}>
            <View style={S.chipWrap}>
              {LEVELS.map((l) => {
                const active = selectedLevel === l;
                return (
                  <TouchableOpacity
                    key={l}
                    style={[
                      S.chip,
                      {
                        backgroundColor: active ? colors.accent : colors.muted,
                        borderColor: active ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => selectLevel(l)}
                  >
                    <Text style={[S.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>
                      {l}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Study goal */}
          <Text style={S.sectionTitle}>STUDY GOAL</Text>
          <View style={S.card}>
            <View style={S.chipWrap}>
              {STUDY_GOALS.map((g) => {
                const active = selectedGoal === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[
                      S.chip,
                      {
                        backgroundColor: active ? colors.accent : colors.muted,
                        borderColor: active ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => selectGoal(g)}
                  >
                    <Text style={[S.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Appearance */}
          <Text style={S.sectionTitle}>MEMBERSHIP</Text>
          <View style={S.card}>
            <TouchableOpacity
              style={S.themeRow}
              onPress={() => router.push("/paywall")}
              disabled={!isConfigured}
            >
              <View style={S.themeLeft}>
                <Icon name="award" size={20} color={colors.primary} />
                <View>
                  <Text style={S.themeLabel}>
                    {isSubscribed ? "ImproKinz Premium" : "Upgrade to Premium"}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
                    {isSubscribed ? "Ad-free study experience" : "Unlock unlimited study tools"}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Appearance */}
          <Text style={S.sectionTitle}>APPEARANCE</Text>
          <View style={S.card}>
            <TouchableOpacity style={S.themeRow} onPress={toggleTheme}>
              <View style={S.themeLeft}>
                <Icon
                  name={isDark ? "moon" : "sun"}
                  size={20}
                  color={colors.primary}
                />
                <Text style={S.themeLabel}>
                  {isDark ? "Dark Mode" : "Light Mode"}
                </Text>
              </View>
              {/* Simple toggle pill */}
              <View style={[S.toggle, { backgroundColor: isDark ? colors.primary : colors.muted }]}>
                <View
                  style={[
                    S.toggleKnob,
                    { alignSelf: isDark ? "flex-end" : "flex-start" },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Legal */}
          <Text style={S.sectionTitle}>LEGAL</Text>
          <View style={S.card}>
            <TouchableOpacity style={S.themeRow} onPress={() => router.push("/privacy" as any)}>
              <View style={S.themeLeft}>
                <Icon name="shield" size={20} color={colors.primary} />
                <Text style={S.themeLabel}>Privacy Policy</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
            <TouchableOpacity style={S.themeRow} onPress={() => router.push("/terms" as any)}>
              <View style={S.themeLeft}>
                <Icon name="file-text" size={20} color={colors.primary} />
                <Text style={S.themeLabel}>Terms of Service</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          <Text style={[S.sectionTitle, { color: "#EF4444" }]}>DANGER ZONE</Text>
          <View style={[S.card, { borderColor: "#EF444433", borderWidth: 1 }]}>
            <TouchableOpacity style={S.themeRow} onPress={handleDeleteAccount} disabled={deleting}>
              <View style={S.themeLeft}>
                <Icon name="trash-2" size={20} color="#EF4444" />
                <View>
                  <Text style={[S.themeLabel, { color: "#EF4444" }]}>
                    {deleting ? "Deleting…" : "Delete Account"}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
                    Permanently removes your account and all data
                  </Text>
                </View>
              </View>
              {deleting
                ? <ActivityIndicator size="small" color="#EF4444" />
                : <Icon name="chevron-right" size={20} color={colors.mutedForeground} />}
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
