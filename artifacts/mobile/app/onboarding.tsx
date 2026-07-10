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
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const { width: W } = Dimensions.get("window");
const GOLD = "#F59E0B";
const DARK = "#0D0B2B";
const CARD = "#1A1740";
const BORDER = "#2A2560";
const TEXT = "#FFFFFF";
const MUTED = "#9CA3AF";

/* ── Data ──────────────────────────────────────────────────── */
const FIELDS = [
  { label: "Science", icon: "flask" as const },
  { label: "Mathematics", icon: "calculator" as const },
  { label: "Computer Science", icon: "code-slash" as const },
  { label: "Medicine", icon: "medkit" as const },
  { label: "Engineering", icon: "construct" as const },
  { label: "Business", icon: "briefcase" as const },
  { label: "Languages", icon: "language" as const },
  { label: "History", icon: "library" as const },
  { label: "Art & Design", icon: "color-palette" as const },
  { label: "Law", icon: "scale" as const },
  { label: "Psychology", icon: "brain" as const },
  { label: "Other", icon: "ellipsis-horizontal-circle" as const },
];

const LEVELS = [
  { label: "High School", icon: "school" as const },
  { label: "Undergraduate", icon: "book" as const },
  { label: "Postgraduate", icon: "ribbon" as const },
  { label: "Self-Learner", icon: "bulb" as const },
  { label: "Professional", icon: "briefcase" as const },
];

const GOALS = [
  { label: "Pass my exams", icon: "checkmark-circle" as const },
  { label: "Get better grades", icon: "trending-up" as const },
  { label: "Learn a new skill", icon: "rocket" as const },
  { label: "Prepare for a career", icon: "briefcase" as const },
  { label: "Stay curious", icon: "star" as const },
];

/* ── Step indicator ──────────────────────────────────────────── */
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current && styles.dotActive,
            i < current && styles.dotDone,
          ]}
        />
      ))}
    </View>
  );
}

/* ── Option pill ─────────────────────────────────────────────── */
function Pill({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.pill, selected && styles.pillSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icon} size={18} color={selected ? DARK : GOLD} />
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ── Main ────────────────────────────────────────────────────── */
export default function OnboardingScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();

  const [step, setStep] = useState(0);
  const [field, setField] = useState("");
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const TOTAL = 4;

  const animateStep = (next: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setTimeout(next, 180);
  };

  const goNext = () => {
    if (step < TOTAL - 1) animateStep(() => setStep((s) => s + 1));
  };

  const goBack = () => {
    if (step > 0) animateStep(() => setStep((s) => s - 1));
  };

  const canContinue = () => {
    if (step === 0) return nickname.trim().length > 0;
    if (step === 1) return field !== "";
    if (step === 2) return level !== "";
    if (step === 3) return goal !== "";
    return false;
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        displayName: nickname.trim() || undefined,
        subjects: [field],
        level,
        goal,
        onboardingComplete: true,
        updatedAt: serverTimestamp(),
      };
      await Promise.all([
        updateDoc(doc(db, "users", user.uid), payload),
        setDoc(doc(db, "profiles", user.uid), payload, { merge: true }),
      ]);
      await refreshProfile();
      router.replace("/(tabs)/");
    } catch (e) {
      console.error("Onboarding save error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            {step > 0 ? (
              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color={MUTED} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 38 }} />
            )}
            <StepDots total={TOTAL} current={step} />
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/")}
              style={styles.skipBtn}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <Animated.View style={{ opacity: fadeAnim }}>
            {step === 0 && (
              <StepName nickname={nickname} setNickname={setNickname} />
            )}
            {step === 1 && (
              <StepField field={field} setField={setField} />
            )}
            {step === 2 && (
              <StepLevel level={level} setLevel={setLevel} />
            )}
            {step === 3 && (
              <StepGoal goal={goal} setGoal={setGoal} />
            )}
          </Animated.View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.cta, !canContinue() && styles.ctaDisabled]}
            onPress={step === TOTAL - 1 ? handleFinish : goNext}
            disabled={!canContinue() || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={DARK} />
            ) : (
              <Text style={styles.ctaText}>
                {step === TOTAL - 1 ? "Let's go! 🚀" : "Continue"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── Step 0: Name ──────────────────────────────────────────── */
function StepName({
  nickname,
  setNickname,
}: {
  nickname: string;
  setNickname: (v: string) => void;
}) {
  return (
    <View style={styles.stepWrap}>
      <View style={styles.iconCircle}>
        <Ionicons name="hand-right" size={34} color={GOLD} />
      </View>
      <Text style={styles.stepTitle}>Hey there! 👋</Text>
      <Text style={styles.stepSub}>
        What should we call you? You can always change this later.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Your nickname or name"
        placeholderTextColor={MUTED}
        value={nickname}
        onChangeText={setNickname}
        autoFocus
        maxLength={30}
        returnKeyType="done"
      />
    </View>
  );
}

/* ── Step 1: Field ─────────────────────────────────────────── */
function StepField({
  field,
  setField,
}: {
  field: string;
  setField: (v: string) => void;
}) {
  return (
    <View style={styles.stepWrap}>
      <View style={styles.iconCircle}>
        <Ionicons name="school" size={34} color={GOLD} />
      </View>
      <Text style={styles.stepTitle}>What do you study?</Text>
      <Text style={styles.stepSub}>Pick your main field of study.</Text>
      <View style={styles.pillGrid}>
        {FIELDS.map((f) => (
          <Pill
            key={f.label}
            label={f.label}
            icon={f.icon}
            selected={field === f.label}
            onPress={() => setField(f.label)}
          />
        ))}
      </View>
    </View>
  );
}

/* ── Step 2: Level ─────────────────────────────────────────── */
function StepLevel({
  level,
  setLevel,
}: {
  level: string;
  setLevel: (v: string) => void;
}) {
  return (
    <View style={styles.stepWrap}>
      <View style={styles.iconCircle}>
        <Ionicons name="bar-chart" size={34} color={GOLD} />
      </View>
      <Text style={styles.stepTitle}>What's your level?</Text>
      <Text style={styles.stepSub}>We'll personalise your experience accordingly.</Text>
      <View style={styles.levelList}>
        {LEVELS.map((l) => (
          <TouchableOpacity
            key={l.label}
            style={[styles.levelRow, level === l.label && styles.levelRowSelected]}
            onPress={() => setLevel(l.label)}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.levelIcon,
                level === l.label && styles.levelIconSelected,
              ]}
            >
              <Ionicons
                name={l.icon}
                size={20}
                color={level === l.label ? DARK : GOLD}
              />
            </View>
            <Text
              style={[
                styles.levelLabel,
                level === l.label && styles.levelLabelSelected,
              ]}
            >
              {l.label}
            </Text>
            {level === l.label && (
              <Ionicons name="checkmark-circle" size={20} color={GOLD} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ── Step 3: Goal ──────────────────────────────────────────── */
function StepGoal({
  goal,
  setGoal,
}: {
  goal: string;
  setGoal: (v: string) => void;
}) {
  return (
    <View style={styles.stepWrap}>
      <View style={styles.iconCircle}>
        <Ionicons name="trophy" size={34} color={GOLD} />
      </View>
      <Text style={styles.stepTitle}>What's your main goal?</Text>
      <Text style={styles.stepSub}>Tell us what you're aiming for.</Text>
      <View style={styles.levelList}>
        {GOALS.map((g) => (
          <TouchableOpacity
            key={g.label}
            style={[styles.levelRow, goal === g.label && styles.levelRowSelected]}
            onPress={() => setGoal(g.label)}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.levelIcon,
                goal === g.label && styles.levelIconSelected,
              ]}
            >
              <Ionicons
                name={g.icon}
                size={20}
                color={goal === g.label ? DARK : GOLD}
              />
            </View>
            <Text
              style={[
                styles.levelLabel,
                goal === g.label && styles.levelLabelSelected,
              ]}
            >
              {g.label}
            </Text>
            {goal === g.label && (
              <Ionicons name="checkmark-circle" size={20} color={GOLD} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DARK },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    marginBottom: 8,
  },
  backBtn: { padding: 6 },
  skipBtn: { padding: 6 },
  skipText: { color: MUTED, fontFamily: "Inter_400Regular", fontSize: 14 },

  dots: { flexDirection: "row", gap: 6 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: BORDER,
  },
  dotActive: { backgroundColor: GOLD, width: 20 },
  dotDone: { backgroundColor: "#4C3FA0" },

  stepWrap: { paddingTop: 24, paddingBottom: 24 },
  iconCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "#2A1F5E",
    borderWidth: 2, borderColor: GOLD,
    alignItems: "center", justifyContent: "center",
    marginBottom: 20, alignSelf: "center",
  },
  stepTitle: {
    color: TEXT, fontFamily: "Inter_700Bold",
    fontSize: 26, textAlign: "center", marginBottom: 8,
  },
  stepSub: {
    color: MUTED, fontFamily: "Inter_400Regular",
    fontSize: 14, textAlign: "center", lineHeight: 20,
    marginBottom: 24,
  },

  input: {
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    color: TEXT, fontFamily: "Inter_400Regular",
    fontSize: 16, paddingHorizontal: 16, paddingVertical: 14,
  },

  pillGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER,
  },
  pillSelected: { backgroundColor: GOLD, borderColor: GOLD },
  pillText: {
    color: TEXT, fontFamily: "Inter_500Medium", fontSize: 13,
  },
  pillTextSelected: { color: DARK, fontFamily: "Inter_600SemiBold" },

  levelList: { gap: 10 },
  levelRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  levelRowSelected: { borderColor: GOLD, backgroundColor: "#1C1550" },
  levelIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: "#2A1F5E",
    alignItems: "center", justifyContent: "center",
  },
  levelIconSelected: { backgroundColor: GOLD },
  levelLabel: {
    flex: 1, color: TEXT,
    fontFamily: "Inter_500Medium", fontSize: 15,
  },
  levelLabelSelected: { fontFamily: "Inter_600SemiBold" },

  cta: {
    backgroundColor: GOLD, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
    marginTop: 8,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: DARK, fontFamily: "Inter_700Bold", fontSize: 17 },
});
