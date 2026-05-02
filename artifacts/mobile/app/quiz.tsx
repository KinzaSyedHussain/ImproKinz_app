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

interface QuizOption { label: string; text: string; }
interface QuizQuestion { question: string; options: QuizOption[]; answer: string; }

export default function QuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addXP } = useAuth();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"input" | "quiz" | "results">("input");

  const generate = async () => {
    if (!text.trim()) { Alert.alert("Error", "Please enter some text first"); return; }
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
      Alert.alert("Error", "Failed to generate quiz. Make sure the API is configured.");
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (Object.keys(answers).length < questions.length) {
      Alert.alert("Warning", "Please answer all questions first");
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

  const reset = () => { setPhase("input"); setText(""); setQuestions([]); setAnswers({}); setSubmitted(false); setScore(0); };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  const OPTION_COLOR = (qi: number, opt: QuizOption) => {
    if (!submitted) return answers[qi] === opt.label ? colors.primary : colors.card;
    if (opt.label === questions[qi].answer) return "#10B981";
    if (answers[qi] === opt.label && answers[qi] !== questions[qi].answer) return "#EF4444";
    return colors.card;
  };

  const OPTION_TEXT_COLOR = (qi: number, opt: QuizOption) => {
    if (!submitted) return answers[qi] === opt.label ? "#fff" : colors.foreground;
    if (opt.label === questions[qi].answer) return "#fff";
    if (answers[qi] === opt.label && answers[qi] !== questions[qi].answer) return "#fff";
    return colors.foreground;
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Quiz Generator</Text>
          <View style={[styles.xpPill, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.xpPillText, { color: colors.primary }]}>+20 XP</Text>
          </View>
        </View>
        {phase !== "input" && (
          <TouchableOpacity onPress={reset}>
            <Icon name="refresh-cw" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: botPad }]} keyboardShouldPersistTaps="handled">
        {phase === "input" && (
          <>
            <LinearGradient colors={["#059669", "#0891B2"]} style={styles.heroBanner}>
              <Icon name="check-square" size={32} color="#FFFFFF" />
              <Text style={styles.heroTitle}>Quiz Yourself</Text>
              <Text style={styles.heroSub}>Test your knowledge with AI-generated MCQs</Text>
            </LinearGradient>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Paste your study material here to generate quiz questions..."
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity style={[styles.generateBtn, { opacity: loading || !text.trim() ? 0.7 : 1 }]} onPress={generate} disabled={loading || !text.trim()}>
              <LinearGradient colors={["#059669", "#0891B2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.generateGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <><Icon name="check-square" size={18} color="#fff" /><Text style={styles.generateBtnText}>Generate Quiz</Text></>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {phase === "quiz" && questions.map((q, qi) => (
          <View key={qi} style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.questionNum, { color: colors.mutedForeground }]}>Question {qi + 1}</Text>
            <Text style={[styles.questionText, { color: colors.foreground }]}>{q.question}</Text>
            <View style={styles.options}>
              {q.options.map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.optionBtn, { backgroundColor: OPTION_COLOR(qi, opt), borderColor: answers[qi] === opt.label ? colors.primary : colors.border }]}
                  onPress={() => {
                    if (submitted) return;
                    Haptics.selectionAsync();
                    setAnswers((a) => ({ ...a, [qi]: opt.label }));
                  }}
                >
                  <View style={[styles.optionLabel, { backgroundColor: answers[qi] === opt.label ? "rgba(255,255,255,0.2)" : colors.muted }]}>
                    <Text style={[styles.optionLabelText, { color: answers[qi] === opt.label ? "#fff" : colors.foreground }]}>{opt.label}</Text>
                  </View>
                  <Text style={[styles.optionText, { color: OPTION_TEXT_COLOR(qi, opt) }]}>{opt.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {phase === "quiz" && (
          <TouchableOpacity style={[styles.submitBtn, { opacity: Object.keys(answers).length < questions.length ? 0.6 : 1 }]} onPress={submitQuiz} disabled={Object.keys(answers).length < questions.length}>
            <LinearGradient colors={["#059669", "#0891B2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.generateGradient}>
              <Text style={styles.generateBtnText}>Submit Quiz</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {phase === "results" && (
          <View style={styles.resultsWrap}>
            <LinearGradient colors={score === questions.length ? ["#059669", "#0891B2"] : ["#4F46E5", "#7C3AED"]} style={styles.scoreCard}>
              <Text style={styles.scoreEmoji}>{score === questions.length ? "🎉" : score >= questions.length / 2 ? "👍" : "📚"}</Text>
              <Text style={styles.scoreTitle}>{score}/{questions.length} Correct</Text>
              <Text style={styles.scoreSub}>{score === questions.length ? "Perfect score!" : score >= questions.length / 2 ? "Good job!" : "Keep studying!"}</Text>
              <Text style={styles.scoreXP}>+20 XP earned!</Text>
            </LinearGradient>
            {questions.map((q, qi) => (
              <View key={qi} style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.questionNum, { color: colors.mutedForeground }]}>Question {qi + 1}</Text>
                <Text style={[styles.questionText, { color: colors.foreground }]}>{q.question}</Text>
                <View style={styles.options}>
                  {q.options.map((opt) => (
                    <TouchableOpacity key={opt.label} style={[styles.optionBtn, { backgroundColor: OPTION_COLOR(qi, opt), borderColor: colors.border }]} disabled>
                      <View style={[styles.optionLabel, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                        <Text style={[styles.optionLabelText, { color: "#fff" }]}>{opt.label}</Text>
                      </View>
                      <Text style={[styles.optionText, { color: OPTION_TEXT_COLOR(qi, opt) }]}>{opt.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: colors.secondary }]} onPress={reset}>
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Take New Quiz</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 12 },
  headerTitle: { fontFamily: undefined, fontSize: 18 },
  xpPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  xpPillText: { fontFamily: undefined, fontSize: 12 },
  content: { padding: 16, gap: 16 },
  heroBanner: { borderRadius: 18, padding: 24, alignItems: "center", gap: 10 },
  heroTitle: { color: "#FFFFFF", fontFamily: undefined, fontSize: 22 },
  heroSub: { color: "rgba(255,255,255,0.8)", fontFamily: undefined, fontSize: 14, textAlign: "center" },
  textArea: { borderRadius: 16, borderWidth: 1, padding: 16, minHeight: 180, fontFamily: undefined, fontSize: 15, lineHeight: 22 },
  generateBtn: { borderRadius: 14, overflow: "hidden" },
  submitBtn: { borderRadius: 14, overflow: "hidden" },
  generateGradient: { paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  generateBtnText: { color: "#FFFFFF", fontFamily: undefined, fontSize: 16 },
  questionCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  questionNum: { fontFamily: undefined, fontSize: 12, letterSpacing: 0.5 },
  questionText: { fontFamily: undefined, fontSize: 16, lineHeight: 22 },
  options: { gap: 8 },
  optionBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  optionLabel: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  optionLabelText: { fontFamily: undefined, fontSize: 13 },
  optionText: { flex: 1, fontFamily: undefined, fontSize: 14, lineHeight: 18 },
  resultsWrap: { gap: 16 },
  scoreCard: { borderRadius: 18, padding: 32, alignItems: "center", gap: 8 },
  scoreEmoji: { fontSize: 48 },
  scoreTitle: { color: "#FFFFFF", fontFamily: undefined, fontSize: 32 },
  scoreSub: { color: "rgba(255,255,255,0.85)", fontFamily: undefined, fontSize: 16 },
  scoreXP: { color: "rgba(255,255,255,0.8)", fontFamily: undefined, fontSize: 14, marginTop: 4 },
  secondaryBtn: { padding: 14, borderRadius: 14, alignItems: "center" },
  secondaryBtnText: { fontFamily: undefined, fontSize: 15 },
});
