import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useCredits } from "@/context/CreditContext";
import { ToolCreditPill } from "@/components/CreditUI";

const WORK_MIN = 25;
const BREAK_MIN = 5;

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function PomodoroScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addXP } = useAuth();
  const { consumeTool } = useCredits();

  const [mode, setMode] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(WORK_MIN * 60);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [chargedForCurrentSession, setChargedForCurrentSession] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = 60 + insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const totalSeconds = mode === "work" ? WORK_MIN * 60 : BREAK_MIN * 60;
  const progress = 1 - secondsLeft / totalSeconds;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            // Timer finished
            if (mode === "work") {
              setCompletedSessions((c) => c + 1);
              addXP(10).catch(() => {});
              Alert.alert("Focus session complete!", "Time for a short break.", [
                { text: "Start Break", onPress: () => switchMode("break") },
              ]);
            } else {
              Alert.alert("Break over!", "Ready to focus again?", [
                { text: "Start Work", onPress: () => switchMode("work") },
              ]);
            }
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode]);

  const switchMode = (newMode: "work" | "break") => {
    setRunning(false);
    setMode(newMode);
    setSecondsLeft(newMode === "work" ? WORK_MIN * 60 : BREAK_MIN * 60);
    setChargedForCurrentSession(false);
  };

  const toggle = async () => {
    if (!running && mode === "work" && !chargedForCurrentSession) {
      if (!(await consumeTool("pomodoro"))) return;
      setChargedForCurrentSession(true);
    }
    setRunning((r) => !r);
  };

  const reset = () => {
    setRunning(false);
    setSecondsLeft(mode === "work" ? WORK_MIN * 60 : BREAK_MIN * 60);
    setChargedForCurrentSession(false);
  };

  const ringColor = mode === "work" ? "#059669" : "#D97706";
  const ringColors: [string, string] = mode === "work" ? ["#059669", "#84CC16"] : ["#D97706", "#F59E0B"];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: botPad, alignItems: "center" }}
    >
      <LinearGradient colors={["#059669", "#84CC16"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Pomodoro</Text>
            <Text style={[styles.headerSub, { color: colors.foreground }]}>{completedSessions} sessions completed</Text>
          </View>
          <ToolCreditPill tool="pomodoro" />
        </View>
      </LinearGradient>

      {/* Mode switcher */}
      <View style={[styles.modeBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "work" && { backgroundColor: "#059669" }]}
          onPress={() => switchMode("work")}
        >
          <Text style={[styles.modeText, { color: mode === "work" ? "#fff" : colors.mutedForeground }]}>Focus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "break" && { backgroundColor: "#D97706" }]}
          onPress={() => switchMode("break")}
        >
          <Text style={[styles.modeText, { color: mode === "break" ? "#fff" : colors.mutedForeground }]}>Break</Text>
        </TouchableOpacity>
      </View>

      {/* Timer ring */}
      <View style={styles.ringWrap}>
        <LinearGradient colors={ringColors} style={styles.ringOuter}>
          <View style={[styles.ringInner, { backgroundColor: colors.background }]}>
            <Text style={[styles.timerText, { color: colors.foreground }]}>{formatTime(secondsLeft)}</Text>
            <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>
              {mode === "work" ? "Focus Time" : "Break Time"}
            </Text>
          </View>
        </LinearGradient>
        {/* Progress arc placeholder — just a percentage */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: ringColor }]} />
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={reset}>
          <Icon name="rotate-ccw" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mainBtn, { backgroundColor: ringColor }]} onPress={toggle}>
          <Icon name={running ? "pause" : "play"} size={28} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            Alert.alert("Skip timer?", undefined, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Skip", onPress: () => {
                  setRunning(false);
                  if (mode === "work") {
                    setCompletedSessions((c) => c + 1);
                    addXP(10).catch(() => {});
                    switchMode("break");
                  } else {
                    switchMode("work");
                  }
                },
              },
            ]);
          }}
        >
          <Icon name="skip-forward" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.foreground }]}>{completedSessions}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Sessions</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.foreground }]}>{completedSessions * WORK_MIN}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Focus Min</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { width: "100%", paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },
  modeBar: {
    flexDirection: "row",
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  modeBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  modeText: { fontSize: 14, fontWeight: "600" },
  ringWrap: { alignItems: "center", marginTop: 32, width: "100%" },
  ringOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: { fontSize: 42, fontWeight: "700" },
  timerLabel: { fontSize: 13, marginTop: 4 },
  progressBar: {
    width: 220,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginTop: 20,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  controls: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 32 },
  controlBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  mainBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28,
    marginHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    gap: 0,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 32 },
});
