import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { useAuth } from "@/context/AuthContext";
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

type OpportunityType = "Hackathon" | "Job" | "Internship";

const TYPES: OpportunityType[] = ["Hackathon", "Job", "Internship"];

const TYPE_COLORS: Record<OpportunityType, string> = {
  Hackathon: "#7C3AED",
  Job: "#D97706",
  Internship: "#0D9488",
};

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

export default function CreateOpportunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useClerkAuth();
  const { profile } = useAuth();

  const [type, setType] = useState<OpportunityType>("Hackathon");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [deadline, setDeadline] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    title.trim().length > 0 &&
    organization.trim().length > 0 &&
    description.trim().length > 0 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/opportunities`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          title: title.trim(),
          organization: organization.trim(),
          deadline: deadline.trim() || "Rolling",
          link: link.trim(),
          description: description.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      router.back();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.message || "Failed to post. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Icon name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Post Opportunity</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[styles.submitBtn, { backgroundColor: canSubmit ? colors.primary : colors.muted }]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type segmented control */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Type</Text>
        <View style={[styles.segmented, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          {TYPES.map((t) => {
            const active = type === t;
            const accent = TYPE_COLORS[t];
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.segmentBtn,
                  active && { backgroundColor: accent + "22", borderRadius: 10 },
                ]}
                onPress={() => setType(t)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? accent : colors.mutedForeground },
                    active && { fontFamily: "Inter_700Bold" },
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Title */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Title *</Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          placeholder="e.g. Software Engineer Intern"
          placeholderTextColor={colors.mutedForeground}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />

        {/* Organization */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Organization *</Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          placeholder="e.g. Google, MLH, KAUST"
          placeholderTextColor={colors.mutedForeground}
          value={organization}
          onChangeText={setOrganization}
          maxLength={80}
        />

        {/* Deadline */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Deadline{" "}
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12 }}>(leave blank for rolling)</Text>
        </Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          placeholder="e.g. 2026-09-01 or Rolling"
          placeholderTextColor={colors.mutedForeground}
          value={deadline}
          onChangeText={setDeadline}
          maxLength={30}
        />

        {/* External link */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>External Link</Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          placeholder="https://example.com/apply"
          placeholderTextColor={colors.mutedForeground}
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          maxLength={250}
        />

        {/* Description */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Description *</Text>
        <TextInput
          style={[
            styles.input,
            styles.textarea,
            { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border },
          ]}
          placeholder="Briefly describe the opportunity, eligibility, and any perks…"
          placeholderTextColor={colors.mutedForeground}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          maxLength={600}
        />
        <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
          {description.length}/600
        </Text>

        {/* Verified note */}
        <View style={[styles.verifiedNote, { backgroundColor: "#F59E0B18", borderColor: "#F59E0B44" }]}>
          <Icon name="shield-check" size={14} color="#F59E0B" />
          <Text style={[styles.verifiedNoteText, { color: "#F59E0B" }]}>
            Your verified badge will appear next to this post.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  navBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 56,
    alignItems: "center",
  },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },

  body: { padding: 20, gap: 4 },

  label: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  textarea: { minHeight: 110, textAlignVertical: "top", paddingTop: 12 },
  charCount: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "right", marginTop: 4 },

  segmented: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentBtn: { flex: 1, paddingVertical: 9, alignItems: "center" },
  segmentText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  verifiedNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 16,
  },
  verifiedNoteText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
