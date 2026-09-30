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
import { FlashcardViewer, Flashcard } from "@/components/FlashcardViewer";
import { useCredits } from "@/context/CreditContext";
import { ToolCreditPill } from "@/components/CreditUI";

export default function FlashcardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addXP } = useAuth();
  const { consumeTool, refundCredits } = useCredits();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [generated, setGenerated] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + 24;

  const getApiBaseUrl = () => {
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const apiUrl = process.env["EXPO_PUBLIC_API_URL"];

    if (domain) {
      return `https://${domain}`;
    }

    if (apiUrl) {
      return apiUrl.replace(/\/+$/, "");
    }

    if (Platform.OS === "web") {
      return "http://localhost:3001";
    }

    return "";
  };

  const generate = async () => {
    if (!text.trim()) {
      Alert.alert("No content", "Paste some study text first.");
      return;
    }

    if (!(await consumeTool("flashcards"))) return;

    setLoading(true);

    try {
      const apiBaseUrl = getApiBaseUrl();

      if (!apiBaseUrl) {
        throw new Error(
          "API URL is not configured. Set EXPO_PUBLIC_API_URL or EXPO_PUBLIC_DOMAIN."
        );
      }

      const res = await fetch(`${apiBaseUrl}/api/ai/flashcards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
        }),
      });

      const responseText = await res.text();

      let data: {
        flashcards?: Flashcard[];
        error?: string;
      } = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(
          data.error || `Server error (${res.status})`
        );
      }

      const generatedCards = Array.isArray(data.flashcards)
        ? data.flashcards
        : [];

      if (generatedCards.length === 0) {
        throw new Error("The AI returned no flashcards.");
      }

      setCards(generatedCards);
      setGenerated(true);
      await addXP(15);
    } catch (error) {
      await refundCredits(15);

      const message =
        error instanceof Error
          ? error.message
          : "Make sure the API is connected and try again.";

      console.error("Flashcard generation error:", error);

      Alert.alert("Generation failed", message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCards([]);
    setGenerated(false);
    setText("");
  };

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 10,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Icon
            name="arrow-left"
            size={21}
            color={colors.foreground}
          />
        </TouchableOpacity>

        <View style={styles.headerMid}>
          <View
            style={[
              styles.toolIconWrap,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Icon
              name="layers"
              size={17}
              color={colors.primary}
            />
          </View>

          <Text
            style={[
              styles.headerTitle,
              { color: colors.foreground },
            ]}
          >
            Flashcards
          </Text>

          <View
            style={[
              styles.xpPill,
              { backgroundColor: colors.secondary },
            ]}
          >
            <Text
              style={[
                styles.xpText,
                { color: colors.primary },
              ]}
            >
              +15 XP
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <ToolCreditPill tool="flashcards" />

          {generated && (
            <TouchableOpacity
              onPress={reset}
              style={styles.resetBtn}
            >
              <Icon
                name="refresh-cw"
                size={17}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: botPad },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!generated ? (
          <>
            <View
              style={[
                styles.descRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Icon
                name="layers"
                size={16}
                color={colors.primary}
              />

              <Text
                style={[
                  styles.descText,
                  { color: colors.mutedForeground },
                ]}
              >
                Paste any study material — AI turns it into Q&A
                flashcards you can flip through.
              </Text>
            </View>

            <View
              style={[
                styles.inputCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.inputLabel,
                  { color: colors.foreground },
                ]}
              >
                Your study material
              </Text>

              <TextInput
                style={[
                  styles.textArea,
                  { color: colors.foreground },
                ]}
                placeholder="Paste notes, a textbook chapter, or any study content here…"
                placeholderTextColor={colors.mutedForeground}
                value={text}
                onChangeText={setText}
                multiline
                textAlignVertical="top"
              />

              <Text
                style={[
                  styles.charCount,
                  { color: colors.mutedForeground },
                ]}
              >
                {text.length} characters
              </Text>
            </View>

            <View
              style={[
                styles.tipsCard,
                {
                  backgroundColor: colors.secondary + "60",
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tipsTitle,
                  { color: colors.foreground },
                ]}
              >
                Tips for best results
              </Text>

              {[
                "Use at least a paragraph of content",
                "Works best with factual study material",
                "Each card covers one key concept",
              ].map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Icon
                    name="check-circle"
                    size={13}
                    color={colors.primary}
                  />

                  <Text
                    style={[
                      styles.tipText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {tip}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={generate}
              disabled={loading || !text.trim()}
              activeOpacity={0.85}
              style={{
                opacity: loading || !text.trim() ? 0.55 : 1,
              }}
            >
              <LinearGradient
                colors={[
                  colors.gradientStart,
                  colors.gradientEnd,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.generateBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon
                      name="layers"
                      size={18}
                      color="#fff"
                    />

                    <Text style={styles.generateBtnText}>
                      Generate Flashcards
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View
              style={[
                styles.successRow,
                {
                  backgroundColor: "#10B98118",
                  borderColor: "#10B98140",
                },
              ]}
            >
              <Icon
                name="check-circle"
                size={17}
                color="#10B981"
              />

              <Text
                style={[
                  styles.successText,
                  { color: "#10B981" },
                ]}
              >
                {cards.length} flashcards created · +15 XP earned
              </Text>
            </View>

            <FlashcardViewer cards={cards} />

            <TouchableOpacity
              onPress={reset}
              style={[
                styles.secondaryBtn,
                { backgroundColor: colors.secondary },
              ]}
            >
              <Icon
                name="refresh-cw"
                size={15}
                color={colors.primary}
              />

              <Text
                style={[
                  styles.secondaryBtnText,
                  { color: colors.primary },
                ]}
              >
                Start over with new text
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
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },

  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  headerMid: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  toolIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },

  xpPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },

  xpText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  resetBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: {
    padding: 14,
    gap: 12,
  },

  descRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
  },

  descText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },

  inputCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },

  inputLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },

  textArea: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    minHeight: 160,
    textAlignVertical: "top",
  },

  charCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "right",
  },

  tipsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },

  tipsTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 2,
  },

  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  tipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    flex: 1,
  },

  generateBtn: {
    borderRadius: 13,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  generateBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },

  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
  },

  successText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },

  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 13,
    borderRadius: 12,
    marginTop: 4,
  },

  secondaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});