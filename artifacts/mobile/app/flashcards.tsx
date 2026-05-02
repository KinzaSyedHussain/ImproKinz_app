import { Feather } from "@expo/vector-icons";
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
import { FlashcardViewer, Flashcard } from "@/components/FlashcardViewer";

export default function FlashcardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addXP } = useAuth();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    if (!text.trim()) {
      Alert.alert("Error", "Please enter some text first");
      return;
    }
    setLoading(true);
    try {
      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const res = await fetch(`https://${domain}/api/ai/flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) throw new Error("AI generation failed");
      const data = await res.json() as { flashcards: Flashcard[] };
      setCards(data.flashcards || []);
      setGenerated(true);
      await addXP(15);
    } catch (e: any) {
      Alert.alert("Error", "Failed to generate flashcards. Make sure the API is configured.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCards([]);
    setGenerated(false);
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
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Flashcard Generator
          </Text>
          <View style={[styles.xpPill, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.xpPillText, { color: colors.primary }]}>+15 XP</Text>
          </View>
        </View>
        {generated && (
          <TouchableOpacity onPress={reset}>
            <Feather name="refresh-cw" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: botPad }]}
        keyboardShouldPersistTaps="handled"
      >
        {!generated ? (
          <>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={styles.heroBanner}
            >
              <Feather name="layers" size={32} color="#FFFFFF" />
              <Text style={styles.heroTitle}>Create Flashcards</Text>
              <Text style={styles.heroSub}>
                Paste your study text and let AI generate Q&A flashcards
              </Text>
            </LinearGradient>

            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
              ]}
              placeholder="Paste your study notes, textbook content, or any text here..."
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
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.generateGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="layers" size={18} color="#fff" />
                    <Text style={styles.generateBtnText}>Generate Flashcards</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.successBadge}>
              <Feather name="check-circle" size={18} color="#10B981" />
              <Text style={[styles.successText, { color: "#10B981" }]}>
                {cards.length} flashcards generated · +15 XP earned!
              </Text>
            </View>
            <FlashcardViewer cards={cards} />
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.secondary }]}
              onPress={reset}
            >
              <Feather name="refresh-cw" size={16} color={colors.primary} />
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
                Generate New Flashcards
              </Text>
            </TouchableOpacity>
          </>
        )}
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
  heroBanner: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
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
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 8,
  },
  successText: { fontFamily: undefined, fontSize: 14 },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  secondaryBtnText: { fontFamily: undefined, fontSize: 15 },
});
