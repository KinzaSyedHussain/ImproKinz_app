import { Icon } from "@/components/Icon";
import { useRouter } from "expo-router";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
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
import { asyncStorage as AsyncStorage } from "@/lib/asyncStorage";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { useUser } from "@clerk/clerk-expo";

const ALL_SUBJECTS = [
  "Math",
  "Science",
  "History",
  "English",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Economics",
  "Art",
  "Literature",
  "Geography",
  "Psychology",
  "Music",
  "Other",
];

const STUDY_GOALS = [
  "Ace my exams",
  "Build a habit",
  "Learn a new skill",
  "Improve grades",
  "Prep for college",
  "Personal growth",
];

const LEVELS = [
  "High School",
  "Undergraduate",
  "Graduate",
  "Self-taught",
  "Professional",
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    profile,
    user,
    logOut,
    refreshProfile,
  } = useAuth();

  const { isSubscribed } = useSubscription();

  const { isDark, toggleTheme } = useTheme();

  const {
    user: clerkUser,
    isLoaded: clerkLoaded,
  } = useUser();

  const [displayName, setDisplayName] =
    useState("");

  const [bio, setBio] = useState("");

  const [selectedSubjects, setSelectedSubjects] =
    useState<string[]>([]);

  const [selectedGoal, setSelectedGoal] =
    useState("");

  const [selectedLevel, setSelectedLevel] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(
        profile.displayName || "",
      );

      setBio(profile.bio || "");

      setSelectedSubjects(
        profile.subjects || [],
      );

      setSelectedGoal(
        (profile as any).studyGoal || "",
      );

      setSelectedLevel(
        (profile as any).level || "",
      );
    }
  }, [profile?.uid]);

  const toggleSubject = (
    subject: string,
  ) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter(
            (item) => item !== subject,
          )
        : [...prev, subject],
    );

    setSaved(false);
  };

  const selectGoal = (goal: string) => {
    setSelectedGoal((prev) =>
      prev === goal ? "" : goal,
    );

    setSaved(false);
  };

  const selectLevel = (level: string) => {
    setSelectedLevel((prev) =>
      prev === level ? "" : level,
    );

    setSaved(false);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!displayName.trim()) {
      Alert.alert(
        "Name required",
        "Please enter your display name.",
      );
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

      await setDoc(
        doc(db, "profiles", user.uid),
        payload,
        { merge: true },
      );

      await refreshProfile();

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2000);
    } catch (error: any) {
      console.error(
        "Save settings error:",
        error,
      );

      Alert.alert(
        "Save failed",
        error?.message ||
          "Could not save your settings. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    if (deleting) return;

    Alert.alert(
      "Delete Account",
      "This will permanently delete your account. This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            if (deleting) return;

            setDeleting(true);

            try {
              if (!clerkLoaded) {
                throw new Error(
                  "Clerk is still loading. Please wait a moment and try again.",
                );
              }

              if (!clerkUser) {
                throw new Error(
                  "Your Clerk session is not available. Please sign out, sign in again, and try deleting your account.",
                );
              }

              console.log(
                "[Delete Account] Clerk user:",
                clerkUser.id,
              );

              try {
                await clerkUser.reload();

                console.log(
                  "[Delete Account] Clerk user/session refreshed.",
                );
              } catch (reloadError: any) {
                console.error(
                  "[Delete Account] Clerk reload failed:",
                  reloadError,
                );

                throw new Error(
                  "Your Clerk session has expired or is no longer valid. Please sign out, sign in again, and then try Delete Account.",
                );
              }

              try {
                await clerkUser.delete();

                console.log(
                  "[Delete Account] Clerk account deleted.",
                );
              } catch (deleteError: any) {
                console.error(
                  "[Delete Account] Clerk delete failed:",
                  deleteError,
                );

                const clerkMessage =
                  deleteError?.errors?.[0]
                    ?.longMessage ||
                  deleteError?.errors?.[0]
                    ?.message ||
                  deleteError?.errors?.[0]
                    ?.code ||
                  deleteError?.message;

                throw new Error(
                  clerkMessage ||
                    "Clerk could not delete the account. Please sign out, sign in again, and try once more.",
                );
              }

              await AsyncStorage.removeItem(
                "pending_onboarding_nickname",
              ).catch((error) => {
                console.warn(
                  "[Delete Account] Could not clear onboarding marker:",
                  error,
                );
              });

              try {
                await logOut();
              } catch (logoutError) {
                console.warn(
                  "[Delete Account] Local logout failed:",
                  logoutError,
                );
              }

              router.replace("/auth");
            } catch (error: any) {
              console.error(
                "[Delete Account] FINAL ERROR:",
                error,
              );

              Alert.alert(
                "Delete failed",
                error?.message ||
                  "The account could not be deleted. Please sign out, sign in again, and try again.",
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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

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

    backBtn: {
      padding: 4,
    },

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
      backgroundColor: saved
        ? "#22C55E"
        : colors.primary,
    },

    saveBtnText: {
      color: "#fff",
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
    },

    content: {
      paddingHorizontal: 16,
      paddingBottom: insets.bottom + 40,
    },

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

    fieldDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 14,
    },

    charCount: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "right",
      marginTop: 4,
      marginRight: 14,
      marginBottom: 6,
    },

    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      padding: 14,
    },

    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },

    chipText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
    },

    themeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 14,
    },

    themeLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    themeLabel: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },

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
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity
          style={S.backBtn}
          onPress={() => router.back()}
        >
          <Icon
            name="arrow-back"
            size={22}
            color={colors.foreground}
          />
        </TouchableOpacity>

        <Text style={S.headerTitle}>
          Settings
        </Text>

        <TouchableOpacity
          style={S.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color="#fff"
            />
          ) : (
            <Text style={S.saveBtnText}>
              {saved ? "Saved ✓" : "Save"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={S.content}>
          {/* Profile */}
          <Text style={S.sectionTitle}>
            PROFILE
          </Text>

          <View style={S.card}>
            <View style={S.field}>
              <Text style={S.fieldLabel}>
                DISPLAY NAME
              </Text>

              <TextInput
                style={S.input}
                value={displayName}
                onChangeText={(text) => {
                  setDisplayName(text);
                  setSaved(false);
                }}
                placeholder="Your name"
                placeholderTextColor={
                  colors.mutedForeground
                }
                returnKeyType="done"
                maxLength={40}
              />
            </View>

            <View style={S.fieldDivider} />

            <View style={S.field}>
              <Text style={S.fieldLabel}>
                BIO
              </Text>

              <TextInput
                style={S.bioInput}
                value={bio}
                onChangeText={(text) => {
                  setBio(text);
                  setSaved(false);
                }}
                placeholder="Tell others about yourself..."
                placeholderTextColor={
                  colors.mutedForeground
                }
                multiline
                maxLength={160}
              />
            </View>

            <Text style={S.charCount}>
              {bio.length}/160
            </Text>
          </View>

          {/* Subjects */}
          <Text style={S.sectionTitle}>
            MY SUBJECTS
          </Text>

          <View style={S.card}>
            <View style={S.chipWrap}>
              {ALL_SUBJECTS.map((subject) => {
                const active =
                  selectedSubjects.includes(
                    subject,
                  );

                return (
                  <TouchableOpacity
                    key={subject}
                    style={[
                      S.chip,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.muted,
                        borderColor: active
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                    onPress={() =>
                      toggleSubject(subject)
                    }
                  >
                    <Text
                      style={[
                        S.chipText,
                        {
                          color: active
                            ? "#fff"
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {subject}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Study level */}
          <Text style={S.sectionTitle}>
            STUDY LEVEL
          </Text>

          <View style={S.card}>
            <View style={S.chipWrap}>
              {LEVELS.map((level) => {
                const active =
                  selectedLevel === level;

                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      S.chip,
                      {
                        backgroundColor: active
                          ? colors.accent
                          : colors.muted,
                        borderColor: active
                          ? colors.accent
                          : colors.border,
                      },
                    ]}
                    onPress={() =>
                      selectLevel(level)
                    }
                  >
                    <Text
                      style={[
                        S.chipText,
                        {
                          color: active
                            ? "#fff"
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Study goal */}
          <Text style={S.sectionTitle}>
            STUDY GOAL
          </Text>

          <View style={S.card}>
            <View style={S.chipWrap}>
              {STUDY_GOALS.map((goal) => {
                const active =
                  selectedGoal === goal;

                return (
                  <TouchableOpacity
                    key={goal}
                    style={[
                      S.chip,
                      {
                        backgroundColor: active
                          ? colors.accent
                          : colors.muted,
                        borderColor: active
                          ? colors.accent
                          : colors.border,
                      },
                    ]}
                    onPress={() =>
                      selectGoal(goal)
                    }
                  >
                    <Text
                      style={[
                        S.chipText,
                        {
                          color: active
                            ? "#fff"
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {goal}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Membership */}
          <Text style={S.sectionTitle}>
            MEMBERSHIP
          </Text>

          <View style={S.card}>
            <TouchableOpacity
              style={S.themeRow}
              onPress={() =>
                router.push("/paywall")
              }
            >
              <View style={S.themeLeft}>
                <Icon
                  name="award"
                  size={20}
                  color={colors.primary}
                />

                <View>
                  <Text style={S.themeLabel}>
                    {isSubscribed
                      ? "ImproKinz Premium"
                      : "Upgrade to Premium"}
                  </Text>

                  <Text
                    style={{
                      color:
                        colors.mutedForeground,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {isSubscribed
                      ? "Ad-free study experience"
                      : "Unlock unlimited study tools"}
                  </Text>
                </View>
              </View>

              <Icon
                name="chevron-right"
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          {/* Appearance */}
          <Text style={S.sectionTitle}>
            APPEARANCE
          </Text>

          <View style={S.card}>
            <TouchableOpacity
              style={S.themeRow}
              onPress={toggleTheme}
            >
              <View style={S.themeLeft}>
                <Icon
                  name={
                    isDark ? "moon" : "sun"
                  }
                  size={20}
                  color={colors.primary}
                />

                <Text style={S.themeLabel}>
                  {isDark
                    ? "Dark Mode"
                    : "Light Mode"}
                </Text>
              </View>

              <View
                style={[
                  S.toggle,
                  {
                    backgroundColor: isDark
                      ? colors.primary
                      : colors.muted,
                  },
                ]}
              >
                <View
                  style={[
                    S.toggleKnob,
                    {
                      alignSelf: isDark
                        ? "flex-end"
                        : "flex-start",
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Legal */}
          <Text style={S.sectionTitle}>
            LEGAL
          </Text>

          <View style={S.card}>
            <TouchableOpacity
              style={S.themeRow}
              onPress={() =>
                router.push(
                  "/privacy" as any,
                )
              }
            >
              <View style={S.themeLeft}>
                <Icon
                  name="shield"
                  size={20}
                  color={colors.primary}
                />

                <Text style={S.themeLabel}>
                  Privacy Policy
                </Text>
              </View>

              <Icon
                name="chevron-right"
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>

            <View
              style={{
                height: 1,
                backgroundColor:
                  colors.border,
                marginHorizontal: 16,
              }}
            />

            <TouchableOpacity
              style={S.themeRow}
              onPress={() =>
                router.push(
                  "/terms" as any,
                )
              }
            >
              <View style={S.themeLeft}>
                <Icon
                  name="file-text"
                  size={20}
                  color={colors.primary}
                />

                <Text style={S.themeLabel}>
                  Terms of Service
                </Text>
              </View>

              <Icon
                name="chevron-right"
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          <Text
            style={[
              S.sectionTitle,
              { color: "#EF4444" },
            ]}
          >
            DANGER ZONE
          </Text>

          <View
            style={[
              S.card,
              {
                borderColor: "#EF444433",
                borderWidth: 1,
              },
            ]}
          >
            <TouchableOpacity
              style={S.themeRow}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              <View style={S.themeLeft}>
                <Icon
                  name="trash-2"
                  size={20}
                  color="#EF4444"
                />

                <View>
                  <Text
                    style={[
                      S.themeLabel,
                      { color: "#EF4444" },
                    ]}
                  >
                    {deleting
                      ? "Deleting…"
                      : "Delete Account"}
                  </Text>

                  <Text
                    style={{
                      color:
                        colors.mutedForeground,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    Permanently removes your
                    account and all data
                  </Text>
                </View>
              </View>

              {deleting ? (
                <ActivityIndicator
                  size="small"
                  color="#EF4444"
                />
              ) : (
                <Icon
                  name="chevron-right"
                  size={20}
                  color={
                    colors.mutedForeground
                  }
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}