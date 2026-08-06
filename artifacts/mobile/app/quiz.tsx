import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
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
import { useCredits } from "@/context/CreditContext";
import { ToolCreditPill } from "@/components/CreditUI";

interface QuizOption { label: string; text: string; }
interface QuizQuestion { question: string; options: QuizOption[]; answer: string; }

export default function QuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addXP } = useAuth();
  const { consumeTool, refundCredits } = useCredits();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"input" | "quiz" | "results">("input");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + 24;

  const generate = async () => {
    if (!text.trim()) { Alert.alert("No content", "Paste some study text first."); return; }
    if (!(await consumeTool("quiz"))) return;
    setLoading(true);
    try {
      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const res = await fetch(`https://${domain}/api/ai/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { questions: QuizQuestion[] };
      setQuestions(data.questions || []);
      setAnswers({});
      setSubmitted(false);
      setPhase("quiz");
    } catch {
      await refundCredits(20);
      Alert.alert("Generation failed", "Make sure the API is connected and try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (Object.keys(answers).length < questions.length) {
      Alert.alert("Not done yet", "Answer all questions before submitting.");
      return;
    }
    const correct = questions.filter((q, i) => answers[i] === q.answer).length;
    setScore(correct);
    setSubmitted(true);
    setPhase("results");
    Haptics.notificationAsync(correct === questions.length
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Warning);
    await addXP(20);
  };

  const reset = () => {
    setPhase("input"); setQuestions([]); setAnswers({});
    setSubmitted(false); setScore(0); setText("");
  };

  const answeredCount = Object.keys(answers).length;
  const percent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const scoreColor = percent >= 80 ? "#10B981" : percent >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={phase !== "input" ? reset : () => router.back()}
          style={styles.backBtn}
        >
          <Icon name={phase !== "input" ? "x" : "arrow-left"} size={21} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <View style={[styles.toolIconWrap, { backgroundColor: "#A855F720" }]}>
            <Icon name="help-circle" size={17} color="#A855F7" />
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {phase === "quiz" ? `Quiz · ${answeredCount}/${questions.length}` : phase === "results" ? "Results" : "Quiz"}
          </Text>
          {phase === "input" && (
            <View style={[styles.xpPill, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.xpText, { color: colors.primary }]}>+20 XP</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {phase === "input" && <ToolCreditPill tool="quiz" />}
          {phase === "quiz" && (
            <TouchableOpacity
              onPress={submitQuiz}
              disabled={answeredCount < questions.length}
              style={[styles.submitBtn, {
                backgroundColor: answeredCount < questions.length ? colors.muted : "#A855F7",
                opacity: answeredCount < questions.length ? 0.6 : 1,
              }]}
            >
              <Text style={[styles.submitBtnText, { color: answeredCount < questions.length ? colors.mutedForeground : "#fff" }]}>
                Submit
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Input phase ─────────────────────── */}
        {phase === "input" && (
          <>
            <View style={[styles.descRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Icon name="help-circle" size={16} color="#A855F7" />
              <Text style={[styles.descText, { color: colors.mutedForeground }]}>
                Paste your study material and AI will generate multiple-choice questions to test your knowledge.
              </Text>
            </View>

            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Study material</Text>
              <TextInput
                style={[styles.textArea, { color: colors.foreground }]}
                placeholder="Paste notes, a chapter, or any content you want to be tested on…"
                placeholderTextColor={colors.mutedForeground}
                value={text}
                onChangeText={setText}
                multiline
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{text.length} characters</Text>
            </View>

            <TouchableOpacity
              onPress={generate}
              disabled={loading || !text.trim()}
              activeOpacity={0.85}
              style={{ opacity: loading || !text.trim() ? 0.55 : 1 }}
            >
              <LinearGradient
                colors={["#A855F7", "#7C3AED"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.generateBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="help-circle" size={18} color="#fff" />
                    <Text style={styles.generateBtnText}>Generate Quiz</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* ── Quiz phase ──────────────────────── */}
        {phase === "quiz" && questions.map((q, qi) => (
          <View key={qi} style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.questionHeader}>
              <View style={[styles.questionNum, { backgroundColor: "#A855F720" }]}>
                <Text style={[styles.questionNumText, { color: "#A855F7" }]}>{qi + 1}</Text>
              </View>
              <Text style={[styles.questionText, { color: colors.foreground }]}>{q.question}</Text>
            </View>
            <View style={styles.options}>
              {q.options.map((opt) => {
                const selected = answers[qi] === opt.label;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => setAnswers((prev) => ({ ...prev, [qi]: opt.label }))}
                    style={[
                      styles.optionBtn,
                      { borderColor: selected ? "#A855F7" : colors.border, backgroundColor: selected ? "#A855F718" : colors.background },
                    ]}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.optionLetter, { backgroundColor: selected ? "#A855F7" : colors.muted }]}>
                      <Text style={[styles.optionLetterText, { color: selected ? "#fff" : colors.mutedForeground }]}>
                        {opt.label}
                      </Text>
                    </View>
                    <Text style={[styles.optionText, { color: colors.foreground }]}>{opt.text}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* ── Results phase ───────────────────── */}
        {phase === "results" && (
          <>
            <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.scoreBig, { backgroundColor: scoreColor + "18", borderColor: scoreColor + "44" }]}>
                <Text style={[styles.scorePercent, { color: scoreColor }]}>{percent}%</Text>
                <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
                  {score} / {questions.length} correct
                </Text>
              </View>
              <Text style={[styles.scoreMessage, { color: colors.foreground }]}>
                {percent === 100 ? "Perfect score! Outstanding work." :
                 percent >= 80 ? "Excellent! You know this well." :
                 percent >= 60 ? "Good effort — review the missed questions." :
                 "Keep studying — you're making progress."}
              </Text>
            </View>

            {questions.map((q, qi) => {
              const userAnswer = answers[qi];
              const correct = userAnswer === q.answer;
              return (
                <View key={qi} style={[styles.resultCard, { backgroundColor: colors.card, borderColor: correct ? "#10B98150" : "#EF444450" }]}>
                  <View style={styles.resultHeader}>
                    <Icon name={correct ? "check-circle" : "x-circle"} size={17} color={correct ? "#10B981" : "#EF4444"} />
                    <Text style={[styles.resultQuestion, { color: colors.foreground }]}>{q.question}</Text>
                  </View>
                  {!correct && (
                    <View style={styles.resultAnswer}>
                      <Text style={[styles.resultYours, { color: "#EF4444" }]}>Your answer: {userAnswer}</Text>
                      <Text style={[styles.resultCorrect, { color: "#10B981" }]}>Correct: {q.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}

            <TouchableOpacity onPress={reset} style={[styles.secondaryBtn, { backgroundColor: colors.secondary }]}>
              <Icon name="refresh-cw" size={15} color={colors.primary} />
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Try a new quiz</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, gap: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerMid: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  toolIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  xpPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  xpText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  submitBtnText: { fontFamily: "Inter_700Bold", fontSize: 13 },

  scroll: { padding: 14, gap: 12 },

  descRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 13, borderRadius: 12, borderWidth: 1,
  },
  descText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, flex: 1 },

  inputCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  inputLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  textArea: {
    fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22,
    minHeight: 160, textAlignVertical: "top",
  },
  charCount: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right" },

  generateBtn: { borderRadius: 13, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  generateBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },

  questionCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  questionHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  questionNum: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center", marginTop: 1 },
  questionNumText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  questionText: { fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1, lineHeight: 21 },
  options: { gap: 8 },
  optionBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 10, padding: 11 },
  optionLetter: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  optionLetterText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  optionText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 19 },

  scoreCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 14 },
  scoreBig: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  scorePercent: { fontFamily: "Inter_700Bold", fontSize: 30 },
  scoreLabel: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  scoreMessage: { fontFamily: "Inter_500Medium", fontSize: 14, textAlign: "center", lineHeight: 21 },

  resultCard: { borderRadius: 12, borderWidth: 1, padding: 13, gap: 8 },
  resultHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  resultQuestion: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1, lineHeight: 19 },
  resultAnswer: { paddingLeft: 25, gap: 3 },
  resultYours: { fontFamily: "Inter_400Regular", fontSize: 12 },
  resultCorrect: { fontFamily: "Inter_600SemiBold", fontSize: 12 },

  secondaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 13, borderRadius: 12, marginTop: 4,
  },
  secondaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
