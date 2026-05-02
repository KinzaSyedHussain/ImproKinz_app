import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function SummarizerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addXP } = useAuth();
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!text.trim()) {
      Alert.alert("Error", "Please enter some text first");
      return;
    }
    setLoading(true);
    try {
      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const res = await fetch(`https://${domain}/api/ai/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) throw new Error("AI generation failed");
      const data = await res.json() as { summary: string };
      setSummary(data.summary || "");
      await addXP(10);
    } catch {
      Alert.alert("Error", "Failed to generate summary. Make sure the API is configured.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSummary("");
    setText("");
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.header,
          { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            AI Summarizer
          </Text>
          <View style={[styles.xpPill, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.xpPillText, { color: colors.primary }]}>+10 XP</Text>
          </View>
        </View>
        {summary && (
          <TouchableOpacity onPress={reset}>
            <Icon name="refresh-cw" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: botPad }]}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={["#7C3AED", "#DB2777"]}
          style={styles.heroBanner}
        >
          <Icon name="align-left" size={32} color="#FFFFFF" />
          <Text style={styles.heroTitle}>Smart Summary</Text>
          <Text style={styles.heroSub}>
            Turn lengthy study material into concise key points
          </Text>
        </LinearGradient>

        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
          ]}
          placeholder="Paste your study material, lecture notes, or article here..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.generateBtn, { opacity: loading || !text.trim() ? 0.7 : 1 }]}
          onPress={generate}
          disabled={loading || !text.trim()}
        >
          <LinearGradient
            colors={["#7C3AED", "#DB2777"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.generateGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="align-left" size={18} color="#fff" />
                <Text style={styles.generateBtnText}>Generate Summary</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {summary ? (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryHeader}>
              <Icon name="check-circle" size={18} color="#10B981" />
              <Text style={[styles.summaryHeaderText, { color: "#10B981" }]}>
                Summary · +10 XP earned!
              </Text>
            </View>
            <Text style={[styles.summaryText, { color: colors.foreground }]}>
              {summary}
            </Text>
            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: colors.muted }]}
              onPress={reset}
            >
              <Text style={[styles.resetBtnText, { color: colors.primary }]}>
                Summarize New Text
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 12 },
  headerTitle: { fontFamily: undefined, fontSize: 18 },
  xpPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  xpPillText: { fontFamily: undefined, fontSize: 12 },
  content: { padding: 16, gap: 16 },
  heroBanner: { borderRadius: 18, padding: 24, alignItems: "center", gap: 10 },
  heroTitle: { color: "#FFFFFF", fontFamily: undefined, fontSize: 22 },
  heroSub: { color: "rgba(255,255,255,0.8)", fontFamily: undefined, fontSize: 14, textAlign: "center" },
  textArea: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 180,
    fontFamily: undefined,
    fontSize: 15,
    lineHeight: 22,
  },
  generateBtn: { borderRadius: 14, overflow: "hidden" },
  generateGradient: {
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  generateBtnText: { color: "#FFFFFF", fontFamily: undefined, fontSize: 16 },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryHeaderText: { fontFamily: undefined, fontSize: 14 },
  summaryText: { fontFamily: undefined, fontSize: 15, lineHeight: 24 },
  resetBtn: { padding: 12, borderRadius: 10, alignItems: "center" },
  resetBtnText: { fontFamily: undefined, fontSize: 14 },
});
