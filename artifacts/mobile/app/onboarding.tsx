import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { asyncStorage as AsyncStorage } from "@/lib/asyncStorage";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";

const { width: W } = Dimensions.get("window");

const PURPLE = "#7C3AED";
const GOLD   = "#F59E0B";
const DARK   = "#0D0B2B";
const CARD   = "#1A1740";
const BORDER = "#2A2560";
const TEXT   = "#FFFFFF";
const MUTED  = "#9CA3AF";

/* ── Data ─────────────────────────────────────────────────── */
const LEVELS = [
  { label: "School",       sub: "Middle / High school",     emoji: "🏫" },
  { label: "College",      sub: "University / College",     emoji: "🎓" },
  { label: "Self-learner", sub: "Learning on my own",       emoji: "🌱" },
];

const ALL_SUBJECTS = [
  "Math", "Science", "Biology", "Physics", "Chemistry",
  "History", "Computer Science", "English", "Languages",
  "Art & Design", "Business", "Medicine", "Law", "Psychology",
];

const DAILY_GOALS = [
  { label: "15 min", value: "15", emoji: "⚡" },
  { label: "30 min", value: "30", emoji: "🎯" },
  { label: "60 min", value: "60", emoji: "🔥" },
  { label: "2+ hrs",  value: "120", emoji: "🏆" },
];

const TOTAL = 4;

/* ── Progress bar ─────────────────────────────────────────── */
function ProgressBar({ step }: { step: number }) {
  const pct = ((step + 1) / TOTAL) * 100;
  return (
    <View style={styles.progressTrack}>
      <LinearGradient
        colors={[PURPLE, GOLD]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.progressFill, { width: `${pct}%` as any }]}
      />
    </View>
  );
}

/* ── Chip ──────────────────────────────────────────────────── */
function Chip({ label, selected, onPress, emoji }: { label: string; selected: boolean; onPress: () => void; emoji?: string }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      {emoji && <Text style={styles.chipEmoji}>{emoji}</Text>}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ── Step 0: Name ──────────────────────────────────────────── */
function StepName({ nickname, setNickname }: { nickname: string; setNickname: (v: string) => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepEmoji}>👋</Text>
      <Text style={styles.stepTitle}>Hey there!</Text>
      <Text style={styles.stepSub}>What should we call you?</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Your name or nickname"
        placeholderTextColor={MUTED}
        value={nickname}
        onChangeText={setNickname}
        autoFocus
        maxLength={30}
        returnKeyType="done"
        selectionColor={GOLD}
      />
    </View>
  );
}

/* ── Step 1: Level ─────────────────────────────────────────── */
function StepLevel({ level, setLevel }: { level: string; setLevel: (v: string) => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepEmoji}>🎓</Text>
      <Text style={styles.stepTitle}>Your level?</Text>
      <Text style={styles.stepSub}>We'll tailor your experience to match.</Text>
      <View style={styles.levelGrid}>
        {LEVELS.map((l) => (
          <TouchableOpacity
            key={l.label}
            style={[styles.levelCard, level === l.label && styles.levelCardSelected]}
            onPress={() => setLevel(l.label)}
            activeOpacity={0.78}
          >
            <Text style={styles.levelEmoji}>{l.emoji}</Text>
            <Text style={[styles.levelLabel, level === l.label && styles.levelLabelSelected]}>{l.label}</Text>
            <Text style={styles.levelSub}>{l.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ── Step 2: Subjects ──────────────────────────────────────── */
function StepSubjects({ subjects, toggle }: { subjects: string[]; toggle: (s: string) => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepEmoji}>📚</Text>
      <Text style={styles.stepTitle}>Favorite subjects?</Text>
      <Text style={styles.stepSub}>Pick everything you study. We'll personalise your feed.</Text>
      <View style={styles.chipGrid}>
        {ALL_SUBJECTS.map((s) => (
          <Chip key={s} label={s} selected={subjects.includes(s)} onPress={() => toggle(s)} />
        ))}
      </View>
    </View>
  );
}

/* ── Step 3: Daily goal ─────────────────────────────────────── */
function StepGoal({ goal, setGoal }: { goal: string; setGoal: (v: string) => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepEmoji}>⏱️</Text>
      <Text style={styles.stepTitle}>Daily study goal?</Text>
      <Text style={styles.stepSub}>How long do you want to study each day?</Text>
      <View style={styles.goalGrid}>
        {DAILY_GOALS.map((g) => (
          <TouchableOpacity
            key={g.value}
            style={[styles.goalCard, goal === g.value && styles.goalCardSelected]}
            onPress={() => setGoal(g.value)}
            activeOpacity={0.78}
          >
            <Text style={styles.goalEmoji}>{g.emoji}</Text>
            <Text style={[styles.goalLabel, goal === g.value && styles.goalLabelSelected]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function OnboardingScreen() {
  const router = useRouter();
  const { user, profile, loadProfileByClerkId } = useAuth();
  const { userId: clerkUserId } = useClerkAuth();

  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState("");
  const [level, setLevel] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [dailyGoal, setDailyGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fadeAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    AsyncStorage.getItem("pending_onboarding_nickname").then((v) => { if (v) setNickname(v); }).catch(() => {});
  }, []);

  const animateStep = (next: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(next, 150);
  };

  const goNext = () => { if (step < TOTAL - 1) animateStep(() => setStep((s) => s + 1)); };
  const goBack = () => { if (step > 0) animateStep(() => setStep((s) => s - 1)); };

  const toggleSubject = (s: string) => {
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const canContinue = () => {
    if (step === 0) return nickname.trim().length > 0;
    if (step === 1) return level !== "";
    if (step === 2) return subjects.length > 0;
    if (step === 3) return dailyGoal !== "";
    return false;
  };

  const handleFinish = async () => {
    const uid = user?.uid ?? profile?.uid ?? clerkUserId;
    if (!uid) { setSaveError("Account still loading. Wait a moment and try again."); return; }
    setSaving(true);
    setSaveError("");
    try {
      const displayName = nickname.trim() || profile?.displayName || "Learner";
      await setDoc(doc(db, "profiles", uid), {
        displayName,
        level,
        subjects,
        studyGoal: dailyGoal,
        onboardingComplete: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await AsyncStorage.removeItem("pending_onboarding_nickname").catch(() => {});
      await loadProfileByClerkId(uid);
      router.replace("/paywall?fromOnboarding=1");
    } catch (e) {
      console.error("Onboarding save error:", e);
      setSaveError("Couldn't save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isLast = step === TOTAL - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top nav */}
          <View style={styles.topBar}>
            {step > 0 ? (
              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Text style={{ color: MUTED, fontSize: 24 }}>‹</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36 }} />
            )}
            <ProgressBar step={step} />
            <Text style={styles.stepCount}>{step + 1}/{TOTAL}</Text>
          </View>

          {/* Step content */}
          <Animated.View style={{ opacity: fadeAnim }}>
            {step === 0 && <StepName nickname={nickname} setNickname={setNickname} />}
            {step === 1 && <StepLevel level={level} setLevel={setLevel} />}
            {step === 2 && <StepSubjects subjects={subjects} toggle={toggleSubject} />}
            {step === 3 && <StepGoal goal={dailyGoal} setGoal={setDailyGoal} />}
          </Animated.View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.cta, !canContinue() && styles.ctaDisabled]}
            onPress={isLast ? handleFinish : goNext}
            disabled={!canContinue() || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={DARK} />
            ) : (
              <Text style={styles.ctaText}>{isLast ? "Let's go! 🚀" : "Continue"}</Text>
            )}
          </TouchableOpacity>

          {!!saveError && <Text style={styles.saveError}>{saveError}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DARK },
  scroll: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40, gap: 24 },

  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 36, alignItems: "center" },
  progressTrack: { flex: 1, height: 6, backgroundColor: BORDER, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  stepCount: { color: MUTED, fontSize: 12, fontFamily: undefined, minWidth: 30, textAlign: "right" },

  stepWrap: { gap: 12 },
  stepEmoji: { fontSize: 44, textAlign: "center" },
  stepTitle: { color: TEXT, fontSize: 28, fontWeight: "700", textAlign: "center" },
  stepSub: { color: MUTED, fontSize: 15, textAlign: "center", lineHeight: 22 },

  textInput: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: TEXT,
    fontSize: 16,
    marginTop: 8,
  },

  levelGrid: { gap: 12, marginTop: 4 },
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 16,
  },
  levelCardSelected: { borderColor: GOLD, backgroundColor: GOLD + "18" },
  levelEmoji: { fontSize: 26 },
  levelLabel: { color: TEXT, fontSize: 16, fontWeight: "700", flex: 1 },
  levelLabelSelected: { color: GOLD },
  levelSub: { color: MUTED, fontSize: 12 },

  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: CARD,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipSelected: { borderColor: GOLD, backgroundColor: GOLD + "22" },
  chipEmoji: { fontSize: 14 },
  chipText: { color: MUTED, fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: GOLD },

  goalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4, justifyContent: "center" },
  goalCard: {
    width: (W - 44 - 12) / 2,
    alignItems: "center",
    gap: 8,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingVertical: 20,
  },
  goalCardSelected: { borderColor: GOLD, backgroundColor: GOLD + "18" },
  goalEmoji: { fontSize: 30 },
  goalLabel: { color: TEXT, fontSize: 16, fontWeight: "700" },
  goalLabelSelected: { color: GOLD },

  cta: {
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: DARK, fontSize: 17, fontWeight: "700" },
  saveError: { color: "#EF4444", fontSize: 13, textAlign: "center" },
});
