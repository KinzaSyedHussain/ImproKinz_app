import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

const ICON_COLORS = [
  "#7C3AED", // purple
  "#2563EB", // blue
  "#16A34A", // green
  "#DC2626", // red
  "#F59E0B", // amber
  "#0891B2", // cyan
];

const ALL_TAGS = [
  "Math", "Science", "Biology", "Physics", "Chemistry", "History",
  "English", "Languages", "Computer Science", "Exam Prep", "Literature",
  "Economics", "Psychology", "Art", "Music", "General",
];

export default function CreateGroupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useClerkAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconColor, setIconColor] = useState(ICON_COLORS[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function getInitials(n: string) {
    return n
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  }

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async () => {
    const trimName = name.trim();
    const trimDesc = description.trim();
    if (!trimName) {
      Alert.alert("Name required", "Please enter a group name.");
      return;
    }
    if (!userId) {
      Alert.alert("Not signed in", "Please sign in to create a group.");
      return;
    }
    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "groups"), {
        name: trimName,
        description: trimDesc,
        iconColor,
        tags,
        isPublic,
        createdBy: userId,
        createdAt: serverTimestamp(),
        memberCount: 1,
        postCount: 0,
        members: [userId],
        moderators: [userId],
        bannedUsers: [],
        pinnedPostIds: [],
      });
      router.replace(`/group/${docRef.id}` as any);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create group. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Group</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || !name.trim()}
          style={[
            styles.submitBtn,
            { backgroundColor: name.trim() ? colors.primary : colors.muted },
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Preview */}
        <View style={styles.previewRow}>
          <View style={[styles.previewIcon, { backgroundColor: iconColor + "33" }]}>
            <Text style={[styles.previewInitials, { color: iconColor }]}>
              {getInitials(name || "Group")}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewName, { color: colors.foreground }]}>
              {name || "Group name"}
            </Text>
            <Text style={[styles.previewDesc, { color: colors.mutedForeground }]}>
              {description || "Description"}
            </Text>
          </View>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Group Name *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. AP Calculus Study Squad"
            placeholderTextColor={colors.mutedForeground}
            maxLength={60}
          />
          <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
            {name.length}/60
          </Text>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
          <TextInput
            style={[
              styles.textarea,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="What will your group focus on?"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
            {description.length}/200
          </Text>
        </View>

        {/* Icon Color */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Icon Color</Text>
          <View style={styles.colorRow}>
            {ICON_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  iconColor === c && styles.colorSelected,
                ]}
                onPress={() => setIconColor(c)}
              >
                {iconColor === c && <Icon name="check" size={14} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tags */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Tags (optional)</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Select subjects this group covers
          </Text>
          <View style={styles.tagsWrap}>
            {ALL_TAGS.map((tag) => {
              const selected = tags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagChip,
                    selected
                      ? { backgroundColor: colors.accent, borderColor: colors.accent }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text
                    style={[styles.tagText, { color: selected ? "#fff" : colors.mutedForeground }]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Visibility */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Visibility</Text>
          <View style={styles.visRow}>
            {[
              { v: true, label: "Public", icon: "globe" },
              { v: false, label: "Private", icon: "lock" },
            ].map(({ v, label, icon }) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.visBtn,
                  isPublic === v
                    ? { backgroundColor: colors.accent, borderColor: colors.accent }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => setIsPublic(v)}
              >
                <Icon name={icon} size={15} color={isPublic === v ? "#fff" : colors.mutedForeground} />
                <Text
                  style={[
                    styles.visBtnText,
                    { color: isPublic === v ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  submitBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 70, alignItems: "center" },
  submitBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  scroll: { paddingHorizontal: 16, paddingTop: 20, gap: 4 },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    marginBottom: 8,
  },
  previewIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  previewInitials: { fontFamily: "Inter_700Bold", fontSize: 22 },
  previewName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  previewDesc: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  field: { marginBottom: 20 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 8 },
  hint: { fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 10, marginTop: -4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right", marginTop: 4 },
  colorRow: { flexDirection: "row", gap: 12 },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSelected: { borderWidth: 3, borderColor: "#fff" },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  visRow: { flexDirection: "row", gap: 12 },
  visBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  visBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
